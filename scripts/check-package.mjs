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
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);

const readRepositoryFile = (...segments) =>
  readFile(repositoryPath(...segments), "utf8");

const [
  packageJson,
  packageLock,
  versionSource,
  changelog,
  readme,
  apiReference,
  designContract,
] = await Promise.all([
  readPackageJson(),
  readRepositoryFile("package-lock.json").then(JSON.parse),
  readRepositoryFile("src", "version.ts"),
  readRepositoryFile("CHANGELOG.md"),
  readRepositoryFile("README.md"),
  readRepositoryFile("docs", "api-reference.md"),
  readRepositoryFile("docs", "design-contract.md"),
]);

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
validatePackedFiles(files, packageJson.exports, packageJson.bin);

for (const file of files) {
  if (!file.endsWith(".map")) continue;

  const sourceMap = JSON.parse(await readRepositoryFile(file));
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

  // A stylesheet or manifest entry point is not a module, so type resolution
  // has nothing to report on it and the analyzer would otherwise fail the
  // whole package. The exclusions come from the exports map, so a second such
  // entry needs no edit here.
  const nonModuleEntryPoints = Object.entries(packageJson.exports)
    .filter(
      ([, target]) => typeof target === "string" && !target.endsWith(".js"),
    )
    .map(([subpath]) => subpath.replace(/^\.\/?/, ""));

  // The node16 profile checks `require` resolution as well as `import`, which
  // is what the `default` conditions and the CommonJS federation entry exist
  // for: without a `default` condition the CommonJS resolution fails outright
  // and attw reports it. The one rule ignored is "cjs-resolves-to-esm", which
  // predates require(esm). `engines.node` is ">=22", the floor Signal K server
  // itself declares, and `require` of an ES module is unflagged from 22.12,
  // which is the floor the docs give for the CommonJS path. So a CommonJS
  // consumer reaching the ESM entries is the supported path there, not the
  // hazard that rule describes.
  execFileSync(
    process.execPath,
    [
      attwEntryPoint,
      tarballPath,
      "--profile",
      "node16",
      "--ignore-rules",
      "cjs-resolves-to-esm",
      "--no-emoji",
      ...(nonModuleEntryPoints.length > 0
        ? ["--exclude-entrypoints", ...nonModuleEntryPoints]
        : []),
    ],
    { stdio: "inherit" },
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
