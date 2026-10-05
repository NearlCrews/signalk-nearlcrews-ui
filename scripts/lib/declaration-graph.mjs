/**
 * Walks the emitted declaration files from the package entry points, and
 * renders and compares the declaration baseline.
 *
 * The files an entry `.d.ts` imports or re-exports, transitively, are the
 * ones a consumer's compiler reads. What in them is public API is decided by
 * scripts/lib/public-surface.mjs; this walk decides which files it reads, and
 * which exported names the companion check holds to account.
 */
import { dirname, join, posix, relative, sep } from "node:path";

import { conditionTarget } from "./bundle-contract.mjs";

const SPECIFIER_PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\/\/\/\s*<reference\s+path=["']([^"']+)["']/g,
];

/** Every module specifier a file refers to, one import form after another. */
export function collectSpecifiers(source) {
  const specifiers = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const [, specifier] of source.matchAll(pattern)) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

/** The relative module specifiers among them, the files a walk can follow. */
export function collectRelativeSpecifiers(source) {
  return collectSpecifiers(source).filter((specifier) =>
    specifier.startsWith("."),
  );
}

/** An emitted declaration file of any module kind. */
export const DECLARATION_FILE = /\.d\.[cm]?ts$/;

/** A dist-relative path with forward slashes, the snapshot's file key. */
export function fileKey(distDirectory, fileName) {
  return relative(distDirectory, fileName).split(sep).join("/");
}

/** The absolute path of a dist-relative declaration file. */
export function distPath(distDirectory, file) {
  return join(distDirectory, ...file.split("/"));
}

/** A JavaScript extension, with the module-kind letter its declaration keeps. */
const JAVASCRIPT_EXTENSION = /\.([cm]?)js$/;

/** Maps an emitted JavaScript specifier onto the declaration file beside it. */
export function declarationPathFor(fromFile, specifier) {
  const target = posix.join(dirname(fromFile), specifier);
  if (DECLARATION_FILE.test(target)) return target;
  return JAVASCRIPT_EXTENSION.test(target)
    ? target.replace(JAVASCRIPT_EXTENSION, ".d.$1ts")
    : `${target}.d.ts`;
}

/** Declaration entry files named by the exports map, relative to dist. */
export function entryDeclarationFiles(exportsMap) {
  const entries = new Set();
  for (const declaration of Object.values(exportsMap)) {
    const types = conditionTarget(declaration, "types");
    if (types === undefined) continue;
    const match = /^\.\/dist\/(.+)$/.exec(types);
    if (match === null) {
      throw new Error(`Export types target ${types} is not under ./dist/.`);
    }
    entries.add(match[1]);
  }
  return [...entries].sort();
}

/**
 * Every declaration file reachable from the entries, sorted. `readSource`
 * receives a dist-relative path and returns the file's text, or undefined when
 * the file does not exist (a missing file is reported rather than followed).
 */
export function reachableDeclarations(entryFiles, readSource) {
  const reachable = new Set();
  // A Set in first-seen order, because several emitted files can refer to the
  // same missing one and the report names each file once.
  const missing = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.shift();
    if (reachable.has(file) || missing.has(file)) continue;
    const source = readSource(file);
    if (source === undefined) {
      missing.add(file);
      continue;
    }
    reachable.add(file);
    for (const specifier of collectRelativeSpecifiers(source)) {
      const target = declarationPathFor(file, specifier);
      if (!reachable.has(target)) queue.push(target);
    }
  }
  if (missing.size > 0) {
    throw new Error(
      `Declaration graph refers to files that were not emitted: ${[...missing].join(", ")}.`,
    );
  }
  return [...reachable].sort();
}

/**
 * The baseline text for a set of snapshot sections: a Map of section title to
 * body, rendered in title order so the file diffs cleanly across releases.
 */
export function renderSnapshot(sections) {
  return [...sections.keys()]
    .sort()
    .map((title) => `=== ${title} ===\n${sections.get(title).trimEnd()}\n`)
    .join("\n");
}

const SECTION_HEADER = /^=== (.+) ===$/;

function parseSnapshotSections(snapshot) {
  // Split on the header lines rather than matching each body with one regular
  // expression: a multiline pattern ends a lazy body at the first line break,
  // which silently truncated every section to its first line and hid changes
  // below it.
  const sections = new Map();
  let file = null;
  let body = [];
  for (const line of snapshot.split("\n")) {
    const match = SECTION_HEADER.exec(line);
    if (match !== null) {
      if (file !== null) sections.set(file, body.join("\n"));
      file = match[1];
      body = [];
    } else if (file !== null) {
      body.push(line);
    }
  }
  if (file !== null) sections.set(file, body.join("\n"));
  return sections;
}

/**
 * The snapshot sections that differ between the baseline and now, sorted,
 * each with its `change`: "added", "removed", or "changed". A section is one
 * entry point's export list or one file's public declarations.
 */
export function snapshotDifferences(baseline, snapshot) {
  const before = parseSnapshotSections(baseline);
  const after = parseSnapshotSections(snapshot);
  const differences = [];
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (!before.has(file)) differences.push({ change: "added", file });
    else if (!after.has(file)) differences.push({ change: "removed", file });
    else if (before.get(file) !== after.get(file)) {
      differences.push({ change: "changed", file });
    }
  }
  return differences;
}
