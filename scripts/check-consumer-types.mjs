/**
 * Compiles a consumer against the PACKED artifact rather than against source.
 *
 * The repository tsconfig maps the package name back to `src`, so every fixture
 * and test type checks source. That leaves the emitted declarations, which are
 * the published contract, unverified. This script packs the package, installs
 * the tarball into a temporary tree, and compiles `fixtures/consumer` against
 * it with no path mapping. It then proves the exports map resolves under
 * CommonJS `require` from the same tree, and that the federation entry loads
 * with the share map the build rendered.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { createFederationShared } from "./lib/federation-share.mjs";
import { parseNpmPackResult, runNpmPack } from "./lib/npm-pack.mjs";
import { repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const fixtureDirectory = repositoryPath("fixtures", "consumer");

if (!existsSync(repositoryPath("dist", "index.d.ts"))) {
  throw new Error("Run the build before checking consumer types.");
}

const workspace = mkdtempSync(join(tmpdir(), "snui-consumer-"));

try {
  // `--ignore-scripts` keeps `prepack` from rebuilding dist in the middle of a
  // validation run that already built it. `--json` keeps the tarball name out
  // of stdout scraping.
  const output = runNpmPack([
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    workspace,
  ]);
  const packageJson = JSON.parse(
    readFileSync(repositoryPath("package.json"), "utf8"),
  );
  const packageName = packageJson.name;
  const tarball = parseNpmPackResult(output, packageName).filename;

  const modules = join(workspace, "node_modules");
  mkdirSync(modules, { recursive: true });

  // Extract the packed artifact as the dependency under test.
  const packageDirectory = join(modules, packageName);
  mkdirSync(packageDirectory, { recursive: true });
  execFileSync(
    "tar",
    ["--extract", "--strip-components=1", "--file", join(workspace, tarball)],
    { cwd: packageDirectory },
  );

  // Reuse the already-installed React types rather than reaching the network.
  for (const dependency of ["react", "@types"]) {
    symlinkSync(
      repositoryPath("node_modules", dependency),
      join(modules, dependency),
      "junction",
    );
  }

  // The fixture is compiled from inside the workspace so bare specifiers
  // resolve to the packed artifact rather than walking up to the repository.
  cpSync(fixtureDirectory, workspace, { recursive: true });

  // The .bin entry is a shell script on POSIX and a .cmd shim on Windows,
  // neither of which spawns portably without a shell. Running the compiler's
  // own Node entry point through process.execPath works on every runner.
  const compilerPackageJsonPath = require.resolve(
    "@typescript/native/package.json",
  );
  const compilerBin = JSON.parse(readFileSync(compilerPackageJsonPath, "utf8"))
    .bin?.tsc;

  if (typeof compilerBin !== "string" || compilerBin.length === 0) {
    throw new Error(
      "@typescript/native package.json does not declare bin.tsc.",
    );
  }

  const typeCheck = spawnSync(
    process.execPath,
    [
      resolve(dirname(compilerPackageJsonPath), compilerBin),
      "--noEmit",
      "--project",
      join(workspace, "tsconfig.json"),
    ],
    { cwd: workspace, encoding: "utf8" },
  );

  if (typeCheck.status !== 0) {
    process.stderr.write(typeCheck.stdout ?? "");
    process.stderr.write(typeCheck.stderr ?? "");
    throw new Error(
      "Consumer types failed to compile against the packed declarations.",
    );
  }

  // A CommonJS consumer (a Node test runner, a build script) must be able to
  // resolve every JavaScript entry through `require`; the `default` condition
  // beside each `import` is what makes that work.
  const consumerRequire = createRequire(join(workspace, "consumer.tsx"));
  for (const [subpath, declaration] of Object.entries(packageJson.exports)) {
    const target =
      typeof declaration === "string"
        ? declaration
        : (declaration.require ?? declaration.default);
    if (typeof target !== "string" || !/\.[cm]?js$/.test(target)) continue;
    const specifier =
      subpath === "." ? packageName : `${packageName}/${subpath.slice(2)}`;
    const resolved = consumerRequire.resolve(specifier);
    const expected = join(packageDirectory, ...target.split("/"));
    if (resolved !== expected) {
      throw new Error(
        `require.resolve("${specifier}") gave ${resolved}; expected ${expected}.`,
      );
    }
  }

  // The federation entry is a CommonJS module a Webpack config requires; it
  // must load and carry the share map rendered from this package.json.
  const federation = consumerRequire(`${packageName}/federation`);
  const expectedShared = createFederationShared(packageJson.peerDependencies);
  if (
    JSON.stringify(federation.shared) !== JSON.stringify(expectedShared) ||
    typeof federation.hostNotes !== "string" ||
    federation.hostNotes.length === 0
  ) {
    throw new Error(
      "The packed federation entry does not carry the share map rendered from package.json.",
    );
  }

  process.stdout.write(
    "Packed-artifact consumer types compiled against dist, and every entry resolves under require.\n",
  );
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
