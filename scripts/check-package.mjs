import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseNpmPackResult, runNpmPack } from "./lib/npm-pack.mjs";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const versionSource = await readFile("src/version.ts", "utf8");
const changelog = await readFile("CHANGELOG.md", "utf8");
const migrationGuide = await readFile("docs/migration.md", "utf8");
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
  [
    "docs/migration.md tarball example",
    migrationGuide,
    `signalk-nearlcrews-ui-${packageJson.version}.tgz`,
  ],
  ["CHANGELOG.md release heading", changelog, `## [${packageJson.version}]`],
]) {
  if (!document.includes(expectedText)) {
    throw new Error(`${documentName} must contain ${expectedText}.`);
  }
}

const output = runNpmPack(["--dry-run", "--json", "--ignore-scripts"]);
const packResult = parseNpmPackResult(output, packageJson.name);
const files = new Set(packResult.files.map((file) => file.path));

for (const requiredFile of [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "docs/design-contract.md",
  "docs/migration.md",
  "docs/repository-setup.md",
  "docs/release-policy.md",
  "dist/index.js",
  "dist/index.d.ts",
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
  const executable =
    process.platform === "win32"
      ? "node_modules/.bin/attw.cmd"
      : "node_modules/.bin/attw";

  execFileSync(
    executable,
    [tarballPath, "--profile", "esm-only", "--no-emoji"],
    { stdio: "inherit" },
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
