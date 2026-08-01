/**
 * Compiles a consumer against the PACKED artifact rather than against source.
 *
 * The repository tsconfig maps the package name back to `src`, so every fixture
 * and test type checks source. That leaves the emitted declarations, which are
 * the published contract, unverified. This script packs the package, installs
 * the tarball into a temporary tree, and compiles `fixtures/consumer` against
 * it with no path mapping.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runNpmPack } from "./lib/npm-pack.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDirectory = join(repositoryRoot, "fixtures", "consumer");

if (!existsSync(join(repositoryRoot, "dist", "index.d.ts"))) {
  throw new Error("Run the build before checking consumer types.");
}

const workspace = mkdtempSync(join(tmpdir(), "snui-consumer-"));

try {
  // `--ignore-scripts` is required: `prepack` runs `validate`, which calls this
  // script, so packing with lifecycle scripts enabled would recurse.
  const tarball = runNpmPack([
    "--silent",
    "--ignore-scripts",
    "--pack-destination",
    workspace,
  ])
    .trim()
    .split("\n")
    .at(-1);

  if (tarball === undefined || tarball === "") {
    throw new Error("npm pack did not report a tarball name.");
  }

  const modules = join(workspace, "node_modules");
  mkdirSync(modules, { recursive: true });

  // Extract the packed artifact as the dependency under test.
  const packageDirectory = join(modules, "signalk-nearlcrews-ui");
  mkdirSync(packageDirectory, { recursive: true });
  execFileSync(
    "tar",
    ["--extract", "--strip-components=1", "--file", join(workspace, tarball)],
    { cwd: packageDirectory },
  );

  // Reuse the already-installed React types rather than reaching the network.
  for (const dependency of ["react", "@types"]) {
    symlinkSync(
      join(repositoryRoot, "node_modules", dependency),
      join(modules, dependency),
      "junction",
    );
  }

  // The fixture is compiled from inside the workspace so bare specifiers
  // resolve to the packed artifact rather than walking up to the repository.
  cpSync(fixtureDirectory, workspace, { recursive: true });

  const typeCheck = spawnSync(
    join(repositoryRoot, "node_modules", ".bin", "tsc"),
    ["--noEmit", "--project", join(workspace, "tsconfig.json")],
    { cwd: workspace, encoding: "utf8" },
  );

  if (typeCheck.status !== 0) {
    process.stderr.write(typeCheck.stdout ?? "");
    process.stderr.write(typeCheck.stderr ?? "");
    throw new Error(
      "Consumer types failed to compile against the packed declarations.",
    );
  }

  process.stdout.write(
    "Packed-artifact consumer types compiled against dist.\n",
  );
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
