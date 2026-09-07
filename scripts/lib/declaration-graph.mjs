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
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier?.startsWith(".")) specifiers.push(specifier);
    }
  }
  return specifiers;
}

/** Maps an emitted JavaScript specifier onto the declaration file beside it. */
export function declarationPathFor(fromFile, specifier) {
  const target = posix.join(dirname(fromFile), specifier);
  if (/\.d\.[cm]?ts$/.test(target)) return target;
  if (target.endsWith(".mjs")) return target.replace(/\.mjs$/, ".d.mts");
  if (target.endsWith(".cjs")) return target.replace(/\.cjs$/, ".d.cts");
  if (target.endsWith(".js")) return target.replace(/\.js$/, ".d.ts");
  return `${target}.d.ts`;
}

/** Declaration entry files named by the exports map, relative to dist. */
export function entryDeclarationFiles(exportsMap) {
  const entries = new Set();
  for (const declaration of Object.values(exportsMap)) {
    const types =
      declaration !== null &&
      typeof declaration === "object" &&
      typeof declaration.types === "string"
        ? declaration.types
        : undefined;
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
  const missing = [];
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.shift();
    if (reachable.has(file)) continue;
    const source = readSource(file);
    if (source === undefined) {
      missing.push(file);
      continue;
    }
    reachable.add(file);
    for (const specifier of collectRelativeSpecifiers(source)) {
      const target = declarationPathFor(file, specifier);
      if (!reachable.has(target)) queue.push(target);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Declaration graph refers to files that were not emitted: ${missing.join(", ")}.`,
    );
  }
  return [...reachable].sort();
}

export function renderDeclarationSnapshot(files, readSource) {
  return files
    .map((file) => `=== ${file} ===\n${readSource(file).trimEnd()}\n`)
    .join("\n");
}

function parseSnapshotSections(snapshot) {
  // Split on the header lines rather than matching each body with one regular
  // expression: a multiline pattern ends a lazy body at the first line break,
  // which silently truncated every section to its first line and hid changes
  // below it.
  const sections = new Map();
  const header = /^=== (.+) ===$/;
  let file = null;
  let body = [];
  for (const line of snapshot.split("\n")) {
    const match = header.exec(line);
    if (match?.[1] !== undefined) {
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

/** Names the reachable files that differ between the baseline and now. */
export function describeSnapshotDifference(baseline, snapshot) {
  const before = parseSnapshotSections(baseline);
  const after = parseSnapshotSections(snapshot);
  const differences = [];
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (!before.has(file)) differences.push(`${file} (added)`);
    else if (!after.has(file)) differences.push(`${file} (removed)`);
    else if (before.get(file) !== after.get(file)) {
      differences.push(`${file} (changed)`);
    }
  }
  return differences;
}
