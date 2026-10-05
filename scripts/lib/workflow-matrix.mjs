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
import { escapeRegExp } from "../../bin/lib/regexp.mjs";

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

/** A `steps:` key, whose list items are the job's steps. */
const STEPS_KEY = /^( *)steps:\s*$/;

/** The first line of a list item: its indentation and what follows the dash. */
const LIST_ITEM = /^( *)- (.*)$/;

/** The number of leading spaces on a line. */
function indentationOf(line) {
  return line.length - line.trimStart().length;
}

/**
 * Reads every step of every job, in file order. Each step carries its display
 * `name` (undefined when it has none) and its `lines`: the step's own text,
 * with the step's indentation removed so its keys sit at column zero, and
 * the list dash dropped. Blank lines inside a step are kept; trailing ones
 * are not, because they separate the step from whatever follows.
 */
export function readSteps(source) {
  const steps = [];
  let itemIndent;
  let current;

  const finish = () => {
    if (current === undefined) return;
    while (current.lines.at(-1) === "") current.lines.pop();
    steps.push(current);
    current = undefined;
  };

  for (const line of source.split(/\r?\n/)) {
    const stepsKey = STEPS_KEY.exec(line);
    if (stepsKey !== null) {
      finish();
      itemIndent = stepsKey[1].length + 2;
      continue;
    }
    if (itemIndent === undefined) continue;

    const blank = line.trim().length === 0;
    const indent = indentationOf(line);
    const item = LIST_ITEM.exec(line);
    if (item !== null && item[1].length === itemIndent) {
      finish();
      current = { lines: [item[2]], name: undefined };
    } else if (blank) {
      current?.lines.push("");
      continue;
    } else if (indent <= itemIndent && line.trimStart().startsWith("#")) {
      // A comment between two steps belongs to neither.
      continue;
    } else if (indent <= itemIndent) {
      // Anything at or left of the dash column ends the list: a sibling key
      // of `steps:`, the next job, or a top-level key.
      finish();
      itemIndent = undefined;
      continue;
    } else if (current !== undefined) {
      current.lines.push(line.slice(itemIndent + 2));
    }

    const name =
      current === undefined
        ? undefined
        : /^name:\s*(.+?)\s*$/.exec(current.lines.at(-1) ?? "")?.[1];
    if (name !== undefined && current.name === undefined) {
      current.name = unquote(name);
    }
  }
  finish();
  return steps;
}

/**
 * What a step does, for comparing copies of one step across jobs: its lines
 * without the top-level `name` and `if` keys, which say where a copy runs
 * rather than what it runs.
 */
export function stepBody(step) {
  return step.lines.filter((line) => !/^(?:name|if):/.test(line)).join("\n");
}
