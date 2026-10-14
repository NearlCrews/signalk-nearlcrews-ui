/**
 * Repository locations shared by the validation scripts.
 *
 * Every script resolves from its own module URL rather than the working
 * directory, so `npm run` from a subdirectory and a direct `node scripts/...`
 * invocation read the same files.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectFiles } from "../../bin/lib/file-walk.mjs";
import { readJson } from "../../bin/lib/json-file.mjs";

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

export { collectFiles, readJson };

/**
 * Directories no Markdown gate reads: tool state, build output, reports, and
 * installed packages.
 */
const MARKDOWN_SKIPPED_DIRECTORIES = new Set([
  ".claude",
  ".git",
  ".remember",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

/**
 * Every Markdown file under `directory`: the one corpus the lint and the link
 * check both read, so the two gates cannot drift onto different trees. A walk
 * that finds nothing throws, because a gate over no files would report a pass
 * it never earned.
 */
export async function collectMarkdownFiles(directory) {
  const files = await collectFiles(directory, {
    matches: (name) => extname(name).toLowerCase() === ".md",
    skipDirectories: MARKDOWN_SKIPPED_DIRECTORIES,
  });
  if (files.length === 0) {
    throw new Error(`No Markdown files found under ${directory}.`);
  }
  return files;
}

/**
 * Runs `work` with a fresh temporary directory named from `prefix` and removes
 * it afterward, whether `work` returns or throws.
 */
export async function withTemporaryDirectory(prefix, work) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await work(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export function readPackageJson() {
  return readJson(repositoryPath("package.json"));
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
