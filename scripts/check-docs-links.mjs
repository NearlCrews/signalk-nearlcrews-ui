/**
 * Checks every repository-local Markdown link and anchor.
 *
 * The rules themselves live in ./lib/docs-links.mjs; this file is the runner
 * `npm run docs:links` invokes.
 */
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { localDestinations, markdownAnchors } from "./lib/docs-links.mjs";
import { collectFiles, repositoryPath } from "./lib/paths.mjs";

const repositoryRoot = repositoryPath();
const ignoredDirectories = new Set([
  ".claude",
  ".git",
  ".remember",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

/** Whether the target exists, and whether it is a file rather than a directory. */
async function describeTarget(targetFile) {
  try {
    return (await stat(targetFile)).isFile() ? "file" : "directory";
  } catch {
    return "missing";
  }
}

/**
 * Answers `compute(key)` once per key. Many links point at the same handful of
 * documents, and an uncached check paid one stat round trip, and one parse of
 * the target's headings, per link rather than per target.
 */
async function cached(cache, key, compute) {
  if (!cache.has(key)) cache.set(key, await compute(key));
  return cache.get(key);
}

const targetCache = new Map();
const anchorCache = new Map();

const failures = [];
const files = await collectFiles(repositoryRoot, {
  matches: (name) => extname(name).toLowerCase() === ".md",
  skipDirectories: ignoredDirectories,
});

// A walk that found nothing would otherwise report a pass it never earned.
if (files.length === 0) {
  throw new Error(`No Markdown files found under ${repositoryRoot}.`);
}

// Read together rather than one at a time: the checking loop below is ordered
// so its failures read in file order, but the reads themselves are not.
const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
const sourceByFile = new Map(
  files.map((file, index) => [file, sources[index]]),
);

/** A link target's headings, from the walk's own read unless it lies outside the walk. */
async function readAnchors(markdownFile) {
  return markdownAnchors(
    sourceByFile.get(markdownFile) ?? (await readFile(markdownFile, "utf8")),
  );
}

for (const [sourceFile, markdown] of sourceByFile) {
  const sourceName = relative(repositoryRoot, sourceFile);

  for (const { destination, line } of localDestinations(markdown)) {
    const [pathWithQuery, rawFragment] = destination.split("#", 2);
    const [pathPart] = pathWithQuery.split("?", 1);
    const targetFile =
      pathPart.length === 0
        ? sourceFile
        : resolve(dirname(sourceFile), decodeURIComponent(pathPart));

    const target = await cached(targetCache, targetFile, describeTarget);
    if (target === "missing") {
      failures.push(
        `${sourceName}:${line}: missing local target ${destination}`,
      );
      continue;
    }
    if (target === "directory") {
      failures.push(
        `${sourceName}:${line}: local target is a directory ${destination}`,
      );
      continue;
    }

    if (rawFragment === undefined || rawFragment.length === 0) continue;
    if (extname(targetFile).toLowerCase() !== ".md") {
      failures.push(
        `${sourceName}:${line}: anchor target is not Markdown: ${destination}`,
      );
      continue;
    }

    const anchors = await cached(anchorCache, targetFile, readAnchors);
    const fragment = decodeURIComponent(rawFragment).toLowerCase();
    if (!anchors.has(fragment)) {
      failures.push(
        `${sourceName}:${line}: missing local anchor ${destination}`,
      );
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Documentation link check failed:\n${failures.join("\n")}`);
}

process.stdout.write(
  `Documentation link check passed for ${String(files.length)} Markdown files.\n`,
);
