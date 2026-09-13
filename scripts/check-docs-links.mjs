/**
 * Checks every repository-local Markdown link and anchor.
 *
 * The rules themselves live in ./lib/docs-links.mjs; this file is the runner
 * `npm run docs:links` invokes.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { localDestinations, markdownAnchors } from "./lib/docs-links.mjs";
import { repositoryPath } from "./lib/paths.mjs";

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

async function markdownFiles(directory = repositoryRoot) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await markdownFiles(resolve(directory, entry.name))));
      }
      continue;
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
      files.push(resolve(directory, entry.name));
    }
  }

  return files;
}

/** Whether the target exists, and whether it is a file rather than a directory. */
async function describeTarget(targetFile) {
  try {
    return (await stat(targetFile)).isFile() ? "file" : "directory";
  } catch {
    return "missing";
  }
}

const anchorCache = new Map();
const failures = [];
const files = await markdownFiles();

// A walk that found nothing would otherwise report a pass it never earned.
if (files.length === 0) {
  throw new Error(`No Markdown files found under ${repositoryRoot}.`);
}

for (const sourceFile of files) {
  const markdown = await readFile(sourceFile, "utf8");

  for (const { destination, line } of localDestinations(markdown)) {
    const [pathWithQuery, rawFragment] = destination.split("#", 2);
    const pathPart = pathWithQuery?.split("?", 1)[0] ?? "";
    const targetFile =
      pathPart.length === 0
        ? sourceFile
        : resolve(dirname(sourceFile), decodeURIComponent(pathPart));
    const sourceName = relative(repositoryRoot, sourceFile);

    const target = await describeTarget(targetFile);
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
