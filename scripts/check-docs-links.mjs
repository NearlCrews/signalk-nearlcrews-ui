import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  ".remember",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function markdownAnchors(markdown) {
  const anchors = new Set();
  const counts = new Map();
  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (heading === undefined) continue;

    const base = githubSlug(heading);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

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

function localDestinations(markdown) {
  const destinations = [];
  let fenced = false;

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const withoutInlineCode = line.replace(/`[^`]*`/g, "");
    const expressions = [
      /!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g,
      /^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/g,
    ];

    for (const expression of expressions) {
      for (const match of withoutInlineCode.matchAll(expression)) {
        const destination = match[1];
        if (
          destination === undefined ||
          destination.startsWith("//") ||
          /^[a-z][a-z\d+.-]*:/i.test(destination)
        ) {
          continue;
        }
        destinations.push({ destination, line: index + 1 });
      }
    }
  }

  return destinations;
}

const anchorCache = new Map();
const failures = [];
const files = await markdownFiles();

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

    if (!existsSync(targetFile) || !(await stat(targetFile)).isFile()) {
      failures.push(
        `${sourceName}:${line}: missing local target ${destination}`,
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

console.log(
  `Documentation link check passed for ${files.length} Markdown files.`,
);
