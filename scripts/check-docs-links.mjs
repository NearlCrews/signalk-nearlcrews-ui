/**
 * Checks every repository-local Markdown link and anchor.
 *
 * The rules themselves live in ./lib/docs-links.mjs; this file is the runner
 * `npm run docs:links` invokes.
 */
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import {
  localDestinations,
  markdownAnchors,
  splitDestination,
} from "./lib/docs-links.mjs";
import { collectMarkdownFiles, repositoryPath } from "./lib/paths.mjs";

const repositoryRoot = repositoryPath();

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
const files = await collectMarkdownFiles(repositoryRoot);

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
    const target = splitDestination(destination);
    if (target === undefined) {
      failures.push(
        `${sourceName}:${line}: malformed percent-escape in local link ${destination}`,
      );
      continue;
    }
    const targetFile =
      target.path.length === 0
        ? sourceFile
        : resolve(dirname(sourceFile), target.path);

    const kind = await cached(targetCache, targetFile, describeTarget);
    if (kind === "missing") {
      failures.push(
        `${sourceName}:${line}: missing local target ${destination}`,
      );
      continue;
    }
    if (kind === "directory") {
      failures.push(
        `${sourceName}:${line}: local target is a directory ${destination}`,
      );
      continue;
    }

    if (target.fragment.length === 0) continue;
    if (extname(targetFile).toLowerCase() !== ".md") {
      failures.push(
        `${sourceName}:${line}: anchor target is not Markdown: ${destination}`,
      );
      continue;
    }

    const anchors = await cached(anchorCache, targetFile, readAnchors);
    if (!anchors.has(target.fragment.toLowerCase())) {
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
