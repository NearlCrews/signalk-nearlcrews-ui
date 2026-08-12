/**
 * Repository locations shared by the validation scripts.
 *
 * Every script resolves from its own module URL rather than the working
 * directory, so `npm run` from a subdirectory and a direct `node scripts/...`
 * invocation read the same files.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
