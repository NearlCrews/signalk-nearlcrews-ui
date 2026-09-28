/**
 * A temporary consumer tree that holds the PACKED package, the artifact npm
 * publishes, rather than the repository source.
 *
 * The repository tsconfig maps the package name back to `src`, so anything
 * compiled inside the repository checks source. A check that means to hold
 * the published declarations to account compiles from inside this tree
 * instead, where a bare specifier resolves to the extracted tarball.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseNpmPackResult, runNpmPack } from "./npm-pack.mjs";
import { readPackageJson, repositoryPath } from "./paths.mjs";

/**
 * Packs the package into a fresh temporary directory and extracts it as that
 * directory's own dependency. Returns the workspace, the extracted package
 * directory, and the manifest; call `dispose` when done. Nothing is left
 * behind if packing or extracting fails.
 */
export async function createPackedWorkspace(prefix) {
  const workspace = mkdtempSync(join(tmpdir(), prefix));
  const dispose = () => {
    rmSync(workspace, { force: true, recursive: true });
  };

  try {
    // `--ignore-scripts` keeps `prepack` from rebuilding dist in the middle
    // of a validation run that already built it. `--json` keeps the tarball
    // name out of stdout scraping.
    const output = runNpmPack([
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      workspace,
    ]);
    const packageJson = await readPackageJson();
    const packageName = packageJson.name;
    const tarball = parseNpmPackResult(output, packageName).filename;

    const modules = join(workspace, "node_modules");
    const packageDirectory = join(modules, packageName);
    mkdirSync(packageDirectory, { recursive: true });
    execFileSync(
      "tar",
      ["--extract", "--strip-components=1", "--file", join(workspace, tarball)],
      { cwd: packageDirectory },
    );

    // Reuse the repository's installed dependencies rather than reaching the
    // network: a real consumer install resolves the package's own
    // dependencies (React Aria Components and its type packages) beside it,
    // and the packed declarations reach into them.
    for (const dependency of readdirSync(repositoryPath("node_modules"))) {
      if (dependency.startsWith(".") || dependency === packageName) continue;
      symlinkSync(
        repositoryPath("node_modules", dependency),
        join(modules, dependency),
        "junction",
      );
    }

    return { dispose, packageDirectory, packageJson, workspace };
  } catch (error) {
    dispose();
    throw error;
  }
}
