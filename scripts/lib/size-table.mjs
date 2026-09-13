/**
 * Renders and reads the per-entry gzip sizes as the Markdown table
 * docs/api-reference.md carries, so the documented numbers are generated
 * rather than retyped, and a measurement that has moved away from the
 * documented one fails the size check instead of quietly outdating the table.
 */

/** The committed table is the recorded measurement every budget derives from. */
export const SIZE_TABLE_DOCUMENT = "docs/api-reference.md";

/**
 * One rule for every budget: the recorded gzip size plus this headroom,
 * rounded up to the next kibibyte. Deriving them means a budget failure says
 * the same thing for every entry rather than "this row was written tight".
 */
const BUDGET_HEADROOM = 0.06;

const KIBIBYTE = 1024;

/**
 * How far a fresh measurement may sit from the recorded one before the table
 * has to be refreshed. Compressor and toolchain versions move the compressed
 * output by a few bytes across the matrix; a real size change moves it by more.
 */
const MEASUREMENT_TOLERANCE = 0.01;

const TABLE_ROW = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|$/;

export function importPathFor(packageName, entry) {
  return entry === "index" ? packageName : `${packageName}/${entry}`;
}

/** The budget a recorded measurement implies. */
export function budgetFor(recordedGzipBytes) {
  return (
    Math.ceil((recordedGzipBytes * (1 + BUDGET_HEADROOM)) / KIBIBYTE) * KIBIBYTE
  );
}

export function formatSizeTable(packageName, rows) {
  const lines = [
    "| Import path | Gzip bytes | Budget (bytes) |",
    "| --- | ---: | ---: |",
  ];
  for (const { entry, gzipBytes, budgetBytes } of rows) {
    lines.push(
      `| \`${importPathFor(packageName, entry)}\` | ${String(gzipBytes)} | ${String(budgetBytes)} |`,
    );
  }
  return lines.join("\n");
}

function entryFor(packageName, importPath) {
  if (importPath === packageName) return "index";
  return importPath.startsWith(`${packageName}/`)
    ? importPath.slice(packageName.length + 1)
    : undefined;
}

/**
 * Reads the committed table into a map of entry name to recorded sizes, and
 * rejects a budget column that is not the one the recorded size implies.
 */
export function parseSizeTable(packageName, markdown) {
  const recorded = new Map();
  for (const line of markdown.split("\n")) {
    const match = TABLE_ROW.exec(line.trim());
    if (match === null) continue;
    const [, importPath = "", gzip = "", budget = ""] = match;
    const entry = entryFor(packageName, importPath);
    if (entry === undefined) continue;

    const gzipBytes = Number(gzip);
    const budgetBytes = Number(budget);
    const expectedBudget = budgetFor(gzipBytes);
    if (budgetBytes !== expectedBudget) {
      throw new Error(
        `${SIZE_TABLE_DOCUMENT} budgets ${importPath} at ${String(budgetBytes)} bytes; ${String(gzipBytes)} recorded gzip bytes imply ${String(expectedBudget)}.`,
      );
    }
    recorded.set(entry, { budgetBytes, gzipBytes });
  }

  if (recorded.size === 0) {
    throw new Error(
      `${SIZE_TABLE_DOCUMENT} carries no entry point size table for ${packageName}.`,
    );
  }
  return recorded;
}

/** Fails when a fresh measurement has left the recorded one behind. */
export function assertRecordedSize(entry, recordedGzipBytes, gzipBytes) {
  const drift = Math.abs(gzipBytes - recordedGzipBytes);
  if (drift <= recordedGzipBytes * MEASUREMENT_TOLERANCE) return;

  throw new Error(
    `${entry} measures ${String(gzipBytes)} gzip bytes, but ${SIZE_TABLE_DOCUMENT} records ${String(recordedGzipBytes)}. Refresh the table with \`node scripts/check-bundle-size.mjs --table\`.`,
  );
}
