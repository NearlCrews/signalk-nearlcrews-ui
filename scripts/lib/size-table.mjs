/**
 * Renders the per-entry gzip sizes as the Markdown table docs/api-reference.md
 * carries, so the documented numbers are generated rather than retyped.
 */
export function importPathFor(packageName, entry) {
  return entry === "index" ? packageName : `${packageName}/${entry}`;
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
