/**
 * Small readers for the GitHub Actions workflow files this repository owns.
 *
 * The workflows are simple enough that a YAML parser would be a dependency
 * for three lookups: an inline matrix list (`node: [22.22.2, 24.15.0, 26]`),
 * the values of one key across `include` entries (`snapshot_variant: ...`),
 * and job display names. These readers understand exactly those shapes and
 * throw when a workflow stops matching them, so a rewrite into a shape they
 * cannot read fails the alignment tests instead of passing vacuously.
 */
import { escapeRegExp } from "./regexp.mjs";

function unquote(value) {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted === null ? trimmed : quoted[2];
}

/** Reads `key: [a, b, c]` and returns its items as strings. */
export function readInlineList(source, key) {
  const matches = [
    ...source.matchAll(
      new RegExp(String.raw`^\s*${escapeRegExp(key)}:\s*\[([^\]]*)\]`, "gm"),
    ),
  ];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one inline list for ${key}, found ${matches.length}.`,
    );
  }
  return matches[0][1]
    .split(",")
    .map(unquote)
    .filter((item) => item.length > 0);
}

/** Reads every `key: value` line and returns the values in file order. */
export function readScalarValues(source, key) {
  return [
    ...source.matchAll(
      new RegExp(String.raw`^\s*-?\s*${escapeRegExp(key)}:\s*(.+?)\s*$`, "gm"),
    ),
  ].map((match) => unquote(match[1]));
}

/**
 * Reads the display name of every job. A job name sits two spaces deeper
 * than `jobs:` and before the first `steps:` of that job; step names are
 * indented under `steps:` and are skipped.
 */
export function readJobNames(source) {
  const names = [];
  let inJobs = false;
  let inSteps = false;
  for (const line of source.split(/\r?\n/)) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^\S/.test(line)) break;
    if (/^ {2}\S/.test(line)) inSteps = false;
    if (/^ {4}steps:\s*$/.test(line)) inSteps = true;
    const name = /^ {4}name:\s*(.+?)\s*$/.exec(line)?.[1];
    if (name !== undefined && !inSteps) names.push(unquote(name));
  }
  return names;
}

/**
 * Expands a GitHub `${{ matrix.<key> }}` job name over its matrix values, the
 * way GitHub renames matrix jobs.
 */
export function expandMatrixName(template, key, values) {
  const placeholder = new RegExp(
    String.raw`\$\{\{\s*matrix\.${escapeRegExp(key)}\s*\}\}`,
    "g",
  );
  // A replacer function, because a matrix value containing $& or $1 would
  // otherwise be read as a replacement pattern rather than as literal text.
  return values.map((value) => template.replace(placeholder, () => value));
}
