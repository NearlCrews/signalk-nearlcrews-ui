import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { parseNpmPackResult, runNpmPack } from "./lib/npm-pack.mjs";
import {
  PACKAGE_NAME,
  validatePackageMetadata,
  validatePackedFiles,
} from "./lib/package-contract.mjs";

const require = createRequire(import.meta.url);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const versionSource = await readFile("src/version.ts", "utf8");
const changelog = await readFile("CHANGELOG.md", "utf8");
const readme = await readFile("README.md", "utf8");
const apiReference = await readFile("docs/api-reference.md", "utf8");
const designContract = await readFile("docs/design-contract.md", "utf8");

validatePackageMetadata({
  apiReference,
  changelog,
  designContract,
  packageJson,
  packageLock,
  readme,
  releaseApproved: process.env.SNUI_RELEASE_APPROVED === "true",
  versionSource,
});

const output = runNpmPack(["--dry-run", "--json", "--ignore-scripts"]);
const packResult = parseNpmPackResult(output, packageJson.name);
const files = new Set(packResult.files.map((file) => file.path));
validatePackedFiles(files, packageJson.exports);

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
  const packedArtifact = parseNpmPackResult(packedOutput, PACKAGE_NAME);
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
