/**
 * Renders and reads the table of English defaults that docs/api-reference.md
 * carries for translators: one row per panel label bundle key, with the
 * package's default beside it, verbatim.
 *
 * The rows are generated from the constants the components render, so the
 * table cannot drift from the words that ship, which it did twice in two
 * releases while it was retyped by hand. A few package strings sit outside
 * the bundle; they are listed after it under the name of the constant that
 * holds them, so a translator can still find each one.
 */

/** The committed table's header row, which is also how the table is found. */
const HEADER = "| Key | English default |";

const TABLE_ROW = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/;

/**
 * Flattens label groups into rows. A group's entry is a string, or one level
 * of named strings (the theme choice labels), which become dotted keys.
 */
export function labelRows(groups, prefix = "") {
  const rows = [];
  for (const [name, value] of Object.entries(groups)) {
    const key = prefix === "" ? name : `${prefix}.${name}`;
    if (typeof value === "string") {
      rows.push({ key, value });
    } else if (value !== null && typeof value === "object") {
      rows.push(...labelRows(value, key));
    } else {
      throw new Error(`${key} is not a label or a group of labels.`);
    }
  }
  return rows;
}

/** A default as a table cell: verbatim inside a code span, pipes escaped. */
function cellFor(value) {
  const fence = value.includes("`") ? "``" : "`";
  const padded =
    value.startsWith("`") || value.endsWith("`") ? ` ${value} ` : value;
  return `${fence}${padded.replaceAll("|", "\\|")}${fence}`;
}

function cellValue(cell) {
  const match = /^(`+)\s?(.*?)\s?\1$/.exec(cell);
  return (match === null ? cell : match[2]).replaceAll("\\|", "|");
}

export function formatLabelTable(rows) {
  return [
    HEADER,
    "| --- | --- |",
    ...rows.map(({ key, value }) => `| \`${key}\` | ${cellFor(value)} |`),
  ].join("\n");
}

/**
 * The rows of the committed table, or undefined when the document carries no
 * table with this header. Padding from a Markdown formatter is ignored.
 */
export function parseLabelTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.replace(/\s+/g, " ").trim() === HEADER,
  );
  if (start === -1) return undefined;
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    const match = TABLE_ROW.exec(line.trim());
    if (match === null) break;
    rows.push({ key: match[1], value: cellValue(match[2]) });
  }
  return rows;
}

/** One message per row that is missing, extra, or worded differently. */
export function labelTableDifferences(committed, generated) {
  const committedByKey = new Map(committed.map((row) => [row.key, row.value]));
  const generatedKeys = new Set(generated.map((row) => row.key));
  const differences = [];
  for (const { key, value } of generated) {
    if (!committedByKey.has(key)) {
      differences.push(`${key} is missing; its default is "${value}".`);
    } else if (committedByKey.get(key) !== value) {
      differences.push(
        `${key} reads "${committedByKey.get(key)}", but the package renders "${value}".`,
      );
    }
  }
  for (const { key } of committed) {
    if (!generatedKeys.has(key)) {
      differences.push(
        `${key} is listed, but the package has no such default.`,
      );
    }
  }
  const order = (rows) => rows.map((row) => row.key).join();
  if (differences.length === 0 && order(committed) !== order(generated)) {
    differences.push("The rows are out of order; regenerate the table.");
  }
  return differences;
}
