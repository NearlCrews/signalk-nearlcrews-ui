/**
 * Repository locations shared by the validation scripts.
 *
 * Every script resolves from its own module URL rather than the working
 * directory, so `npm run` from a subdirectory and a direct `node scripts/...`
 * invocation read the same files.
 */
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
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

/**
 * Every file under `directory` whose name `matches`, depth first.
 *
 * `skipDirectories` names the directory entries the walk never descends into,
 * by bare name at any depth. Written once here because more than one check
 * walks the tree for one kind of file, and a second copy is a second place to
 * teach about a directory that must be skipped. Sibling directories are read
 * together, so the walk costs the depth of the tree rather than its size.
 */
export async function collectFiles(directory, options) {
  const { matches, skipDirectories } = options;
  const entries = await readdir(directory, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (skipDirectories?.has(entry.name)) return [];
        return collectFiles(entryPath, options);
      }
      return entry.isFile() && matches(entry.name) ? [entryPath] : [];
    }),
  );
  return found.flat();
}

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

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
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
