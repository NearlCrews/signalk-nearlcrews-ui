import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { PACKAGE_NAME } from "../bin/lib/consumer-checks.mjs";
import {
  validatePackageMetadata,
  validatePackedFiles,
} from "./lib/package-contract.mjs";
import { packInto } from "./lib/packed-workspace.mjs";
import {
  packageBinaryEntry,
  readJson,
  readPackageJson,
  repositoryPath,
} from "./lib/paths.mjs";

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
  readJson(repositoryPath("package-lock.json")),
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

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "signalk-nearlcrews-ui-attw-"),
);

try {
  // One pack, not two: `npm pack --json` reports the same file list and size
  // for a real pack as for a dry run, and packing is the slowest step here.
  const packResult = packInto(temporaryDirectory, PACKAGE_NAME);
  const tarballPath = join(temporaryDirectory, packResult.filename);
  const files = new Set(packResult.files.map((file) => file.path));
  validatePackedFiles(files, packageJson.exports, packageJson.bin);

  // The emitted files on disk, which npm copies into the tarball unchanged.
  // They are read together; the checks below still report in file order.
  const sourceMapFiles = [...files].filter((file) => file.endsWith(".map"));
  const sourceMaps = await Promise.all(
    sourceMapFiles.map((file) => readJson(repositoryPath(file))),
  );
  for (const [index, file] of sourceMapFiles.entries()) {
    const sourceMap = sourceMaps[index];
    if (
      !Array.isArray(sourceMap.sources) ||
      !Array.isArray(sourceMap.sourcesContent) ||
      sourceMap.sources.length !== sourceMap.sourcesContent.length ||
      sourceMap.sourcesContent.some((source) => typeof source !== "string")
    ) {
      throw new Error(
        `Emitted source map does not embed its sources: ${file}.`,
      );
    }
  }

  process.stdout.write(
    `Packed artifact contains ${String(files.size)} files and ${String(packResult.size)} bytes.\n`,
  );

  const attwEntryPoint = packageBinaryEntry(
    require.resolve("@arethetypeswrong/cli/package.json"),
    "attw",
  );

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
