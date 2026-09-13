/**
 * Repository locations shared by the validation scripts.
 *
 * Every script resolves from its own module URL rather than the working
 * directory, so `npm run` from a subdirectory and a direct `node scripts/...`
 * invocation read the same files.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

/** This module sits two levels below the repository root. */
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export const distDirectory = join(repositoryRoot, "dist");

export function repositoryPath(...segments) {
  return join(repositoryRoot, ...segments);
}

export async function readPackageJson() {
  return JSON.parse(await readFile(repositoryPath("package.json"), "utf8"));
}

/**
 * Absolute path to an installed package's own Node entry for one of its
 * binaries, from the path of that package's manifest.
 *
 * The caller resolves the manifest, with a literal specifier, so the
 * dependency stays visible to the unused-dependency check. The matching
 * `node_modules/.bin` entry is a shell script on POSIX and a `.cmd` shim on
 * Windows, neither of which spawns portably without a shell, so callers run
 * the returned path through `process.execPath` instead.
 */
export function packageBinaryEntry(manifestPath, binName) {
  const manifest = require(manifestPath);
  // npm allows either a bare string or a named map for `bin`.
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[binName];
  if (typeof bin !== "string" || bin.length === 0) {
    throw new Error(`${manifestPath} does not declare bin.${binName}.`);
  }
  return join(dirname(manifestPath), bin);
}
