import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { parseNpmPackResult, runNpmPack } from "./lib/npm-pack.mjs";

const require = createRequire(import.meta.url);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const versionSource = await readFile("src/version.ts", "utf8");
const changelog = await readFile("CHANGELOG.md", "utf8");
const readme = await readFile("README.md", "utf8");

if (packageJson.name !== "signalk-nearlcrews-ui") {
  throw new Error(`Unexpected package name: ${packageJson.name}`);
}

if (packageJson.private === true) {
  throw new Error(
    "The package must remain publishable as a public npm dependency.",
  );
}

const signalKDiscoveryKeywords = new Set([
  "signalk-embeddable-webapp",
  "signalk-node-server-addon",
  "signalk-node-server-plugin",
  "signalk-wasm-plugin",
  "signalk-webapp",
]);
const forbiddenKeyword = packageJson.keywords?.find(
  (keyword) =>
    signalKDiscoveryKeywords.has(keyword) ||
    keyword.startsWith("signalk-category-"),
);
if (forbiddenKeyword !== undefined) {
  throw new Error(
    `The npm-only UI library must not use Signal K discovery keyword ${forbiddenKeyword}.`,
  );
}

for (const field of [
  "signalk",
  "signalk-plugin-enabled-by-default",
  "wasmCapabilities",
  "wasmManifest",
]) {
  if (Object.hasOwn(packageJson, field)) {
    throw new Error(
      `The npm-only UI library must not define Signal K package field ${field}.`,
    );
  }
}

const versionMatches = [
  ...versionSource.matchAll(/^export const PACKAGE_VERSION = "([^"]+)";$/gm),
];
if (
  versionMatches.length !== 1 ||
  versionMatches[0]?.[1] !== packageJson.version
) {
  throw new Error(
    `src/version.ts does not match package version ${packageJson.version}.`,
  );
}

const [major, minor] = packageJson.version.split(".");
for (const [documentName, document, expectedText] of [
  [
    "README.md installation",
    readme,
    `signalk-nearlcrews-ui@${packageJson.version}`,
  ],
  [
    "README.md tarball example",
    readme,
    `signalk-nearlcrews-ui-${packageJson.version}.tgz`,
  ],
  ["README.md compatibility table", readme, `\`${major}.${minor}.x\``],
  ["CHANGELOG.md release heading", changelog, `## [${packageJson.version}]`],
]) {
  if (!document.includes(expectedText)) {
    throw new Error(`${documentName} must contain ${expectedText}.`);
  }
}

if (process.env.SNUI_RELEASE_APPROVED === "true") {
  const escapedVersion = packageJson.version.replaceAll(".", String.raw`\.`);
  const datedHeading = new RegExp(
    String.raw`^## \[${escapedVersion}\] - \d{4}-\d{2}-\d{2}$`,
    "m",
  );
  if (!datedHeading.test(changelog)) {
    throw new Error(
      `CHANGELOG.md must date approved release ${packageJson.version}.`,
    );
  }

  const releaseLink = changelog.match(
    new RegExp(String.raw`^\[${escapedVersion}\]: (\S+)$`, "m"),
  )?.[1];
  if (
    releaseLink === undefined ||
    !releaseLink.endsWith(`...v${packageJson.version}`)
  ) {
    throw new Error(
      `CHANGELOG.md must compare release ${packageJson.version} to v${packageJson.version}, not HEAD.`,
    );
  }
}

const output = runNpmPack(["--dry-run", "--json", "--ignore-scripts"]);
const packResult = parseNpmPackResult(output, packageJson.name);
const files = new Set(packResult.files.map((file) => file.path));

// Every target the exports map names must be inside the tarball, so a new entry
// point is covered here the moment it is declared.
const exportedFiles = Object.values(packageJson.exports).flatMap((target) =>
  typeof target === "string" ? [target] : Object.values(target),
);

for (const requiredFile of [
  ...exportedFiles.map((target) => target.replace(/^\.\//, "")),
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "docs/design-contract.md",
  "docs/migration.md",
  "docs/repository-setup.md",
  "docs/release-policy.md",
  "package.json",
]) {
  if (!files.has(requiredFile)) {
    throw new Error(`Packed artifact is missing ${requiredFile}.`);
  }
}

for (const file of files) {
  if (!file.endsWith(".map")) continue;

  const sourceMap = JSON.parse(await readFile(file, "utf8"));
  if (
    !Array.isArray(sourceMap.sources) ||
    !Array.isArray(sourceMap.sourcesContent) ||
    sourceMap.sources.length !== sourceMap.sourcesContent.length ||
    sourceMap.sourcesContent.some((source) => typeof source !== "string")
  ) {
    throw new Error(`Packed source map does not embed its sources: ${file}.`);
  }
}

const forbiddenPrefixes = [
  "coverage/",
  "fixtures/",
  "scripts/",
  "src/",
  "tests/",
];
for (const file of files) {
  if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
    throw new Error(`Packed artifact unexpectedly includes ${file}.`);
  }
}

console.log(
  `Packed artifact contains ${files.size} files and ${packResult.size} bytes.`,
);

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "signalk-nearlcrews-ui-attw-"),
);

try {
  const packedOutput = runNpmPack([
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    temporaryDirectory,
  ]);
  const packedArtifact = parseNpmPackResult(packedOutput, packageJson.name);
  const tarballPath = join(temporaryDirectory, packedArtifact.filename);
  const attwPackageJsonPath = require.resolve(
    "@arethetypeswrong/cli/package.json",
  );
  const attwPackageJson = JSON.parse(
    await readFile(attwPackageJsonPath, "utf8"),
  );
  const attwBin = attwPackageJson.bin?.attw;

  if (typeof attwBin !== "string" || attwBin.length === 0) {
    throw new Error(
      "@arethetypeswrong/cli package.json does not declare bin.attw.",
    );
  }

  const attwEntryPoint = resolve(dirname(attwPackageJsonPath), attwBin);

  // publint packs by spawning a bare `npm`, which resolves to whatever npm the
  // PATH offers. A runner whose bundled npm predates this package's
  // devEngines range refuses to run that subprocess, so publint cannot pack at
  // all. It lints the tarball packed above instead, which the repository
  // helper produced through process.execPath and npm_execpath.
  const publintEntryPoint = resolve(
    dirname(require.resolve("publint")),
    "cli.js",
  );

  if (!existsSync(publintEntryPoint)) {
    throw new Error("publint does not ship a CLI beside its entry point.");
  }

  execFileSync(process.execPath, [publintEntryPoint, "run", tarballPath], {
    stdio: "inherit",
  });

  // A stylesheet entry point is not a module, so type resolution has nothing to
  // report on it and the analyzer would otherwise fail the whole package. The
  // exclusions come from the exports map, so a second stylesheet needs no edit.
  const stylesheetEntryPoints = Object.entries(packageJson.exports)
    .filter(
      ([, target]) => typeof target === "string" && !target.endsWith(".js"),
    )
    .map(([subpath]) => subpath.replace(/^\.\/?/, ""));

  execFileSync(
    process.execPath,
    [
      attwEntryPoint,
      tarballPath,
      "--profile",
      "esm-only",
      "--no-emoji",
      ...(stylesheetEntryPoints.length > 0
        ? ["--exclude-entrypoints", ...stylesheetEntryPoints]
        : []),
    ],
    { stdio: "inherit" },
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
