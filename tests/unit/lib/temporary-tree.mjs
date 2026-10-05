import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Temporary file trees for the specs that drive a command or a reader against
 * files on disk. Vitest isolates modules per spec file, so the registry below
 * holds only the trees of the file that imported it.
 */
const roots = [];

/**
 * Writes `files`, keyed by their path from `root` with forward slashes, and
 * creates the directories they sit in.
 */
export function writeTree(root, files) {
  for (const [path, source] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
}

/**
 * Makes a directory under the system's temporary one, named from `prefix`,
 * writes `files` into it, and returns its root. The tree stays until
 * {@link removeTemporaryTrees} runs.
 */
export function temporaryTree(prefix, files = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  writeTree(root, files);
  return root;
}

/** Removes every tree made so far. Call from an afterAll hook. */
export function removeTemporaryTrees() {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
}
