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

const anchorCache = new Map();
// Many links point at the same handful of documents, and an uncached check
// paid one stat round trip per link rather than per target.
const targetCache = new Map();

async function cachedTarget(targetFile) {
  let target = targetCache.get(targetFile);
  if (target === undefined) {
    target = await describeTarget(targetFile);
    targetCache.set(targetFile, target);
  }
  return target;
}

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

for (const [index, sourceFile] of files.entries()) {
  const markdown = sources[index] ?? "";
  const sourceName = relative(repositoryRoot, sourceFile);

  for (const { destination, line } of localDestinations(markdown)) {
    const [pathWithQuery, rawFragment] = destination.split("#", 2);
    const pathPart = pathWithQuery?.split("?", 1)[0] ?? "";
    const targetFile =
      pathPart.length === 0
        ? sourceFile
        : resolve(dirname(sourceFile), decodeURIComponent(pathPart));

    const target = await cachedTarget(targetFile);
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

    let anchors = anchorCache.get(targetFile);
    if (anchors === undefined) {
      anchors = markdownAnchors(await readFile(targetFile, "utf8"));
      anchorCache.set(targetFile, anchors);
    }

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
