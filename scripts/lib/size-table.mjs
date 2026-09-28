/**
 * Renders and reads the per-entry gzip sizes as the Markdown table
 * docs/api-reference.md carries, so the documented numbers are generated
 * rather than retyped, and a measurement that has moved away from the
 * documented one fails the size check instead of quietly outdating the table.
 *
 * The two columns change in different ways. The measured column is refreshed
 * by `--table` for every release. The budget column is carried forward from
 * the committed table: raising a budget is a hand edit, reviewed in the
 * release diff and explained in that release's changelog entry, so growth is
 * a decision rather than a side effect of refreshing the numbers.
 */

/** The committed table holds the recorded measurements and their budgets. */
export const SIZE_TABLE_DOCUMENT = "docs/api-reference.md";

/**
 * The fixture that imports what a typical consumer panel imports, measured
 * with tree shaking so its row is what a remote actually pays rather than the
 * sum of whole entries. Its table row is labelled with this path.
 */
export const CONSUMER_PANEL_FIXTURE = "fixtures/size/consumer-panel.ts";

/** The table key of the consumer-shaped panel row. */
export const CONSUMER_PANEL_ENTRY = "consumer-panel";

/**
 * Headroom over a measurement for a budget the tool derives: the first budget
 * of a new row, and a tightened one. Rounded up to the next kibibyte, so a
 * derived budget says the same thing for every entry.
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
  if (entry === CONSUMER_PANEL_ENTRY) return CONSUMER_PANEL_FIXTURE;
  return entry === "index" ? packageName : `${packageName}/${entry}`;
}

/** The budget the tool derives for a measurement. */
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
  if (importPath === CONSUMER_PANEL_FIXTURE) return CONSUMER_PANEL_ENTRY;
  if (importPath === packageName) return "index";
  return importPath.startsWith(`${packageName}/`)
    ? importPath.slice(packageName.length + 1)
    : undefined;
}

/**
 * Reads the committed table into a map of entry name to recorded sizes, and
 * rejects a budget that its own row already exceeds.
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
    if (budgetBytes < gzipBytes) {
      throw new Error(
        `${SIZE_TABLE_DOCUMENT} budgets ${importPath} at ${String(budgetBytes)} bytes, below the ${String(gzipBytes)} gzip bytes it records.`,
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

/**
 * The budget a refreshed table prints for one row: the committed budget
 * carried forward, or a derived one for a row the table does not have yet.
 * `tighten` lowers a carried budget to the derived one when the measurement
 * has shrunk below it, and never raises one.
 */
export function tableBudget(recorded, gzipBytes, { tighten }) {
  const derived = budgetFor(gzipBytes);
  if (recorded === undefined) return derived;
  return tighten
    ? Math.min(recorded.budgetBytes, derived)
    : recorded.budgetBytes;
}

/** Fails a measurement over its budget, naming the only way to raise one. */
export function assertWithinBudget(entry, budgetBytes, gzipBytes) {
  if (gzipBytes <= budgetBytes) return;
  throw new Error(
    `${entry} is ${String(gzipBytes)} gzip bytes, above the ${String(budgetBytes)} byte budget. Raise a budget by hand in ${SIZE_TABLE_DOCUMENT} and record the reason in the CHANGELOG.md entry for the release, or bring the size back under it.`,
  );
}

/** Fails when a fresh measurement has left the recorded one behind. */
export function assertRecordedSize(entry, recordedGzipBytes, gzipBytes) {
  const drift = Math.abs(gzipBytes - recordedGzipBytes);
  if (drift <= recordedGzipBytes * MEASUREMENT_TOLERANCE) return;

  throw new Error(
    `${entry} measures ${String(gzipBytes)} gzip bytes, but ${SIZE_TABLE_DOCUMENT} records ${String(recordedGzipBytes)}. Refresh the measured column with \`node scripts/check-bundle-size.mjs --table\`; it carries every budget forward unchanged.`,
  );
}
