/**
 * Walks the emitted declaration files from the package entry points.
 *
 * The published contract is what a consumer can reach through the exports
 * map: the entry `.d.ts` files and every declaration they import or
 * re-export, transitively. Declaration files that nothing reachable refers to
 * are private modules that happen to be emitted, and a change to one of them
 * is not a public API change.
 */
import { dirname, posix } from "node:path";

import { conditionTarget } from "./bundle-contract.mjs";

const SPECIFIER_PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\/\/\/\s*<reference\s+path=["']([^"']+)["']/g,
];

/** Relative module specifiers a declaration file refers to, in source order. */
export function collectRelativeSpecifiers(source) {
  const specifiers = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const [, specifier] of source.matchAll(pattern)) {
      if (specifier.startsWith(".")) specifiers.push(specifier);
    }
  }
  return specifiers;
}

/** An emitted declaration file of any module kind. */
export const DECLARATION_FILE = /\.d\.[cm]?ts$/;

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

export function renderDeclarationSnapshot(files, readSource) {
  return files
    .map((file) => `=== ${file} ===\n${readSource(file).trimEnd()}\n`)
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
 * The reachable files that differ between the baseline and now, sorted, each
 * with its `change`: "added", "removed", or "changed".
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
