import { describe, expect, it } from "vitest";

import {
  assertRecordedSize,
  budgetFor,
  formatSizeTable,
  importPathFor,
  parseSizeTable,
} from "../../scripts/lib/size-table.mjs";

const PACKAGE_NAME = "signalk-nearlcrews-ui";

function tableFor(rows) {
  return ["# Sizes", "", formatSizeTable(PACKAGE_NAME, rows), ""].join("\n");
}

describe("bundle size table", () => {
  it("names the root entry by the package name and subpaths by import path", () => {
    expect(importPathFor(PACKAGE_NAME, "index")).toBe(PACKAGE_NAME);
    expect(importPathFor(PACKAGE_NAME, "data-grid")).toBe(
      `${PACKAGE_NAME}/data-grid`,
    );
  });

  it("renders the Markdown table the API reference carries", () => {
    expect(
      formatSizeTable(PACKAGE_NAME, [
        { budgetBytes: 26624, entry: "index", gzipBytes: 24470 },
        { budgetBytes: 2048, entry: "tokens.css", gzipBytes: 1341 },
      ]),
    ).toBe(
      [
        "| Import path | Gzip bytes | Budget (bytes) |",
        "| --- | ---: | ---: |",
        `| \`${PACKAGE_NAME}\` | 24470 | 26624 |`,
        `| \`${PACKAGE_NAME}/tokens.css\` | 1341 | 2048 |`,
      ].join("\n"),
    );
  });

  it("gives every entry the same headroom over its recorded size", () => {
    expect(budgetFor(24470)).toBe(26624);
    expect(budgetFor(1341)).toBe(2048);
    // The rule, not a hand-written number: 6 percent, rounded up to a kibibyte.
    expect(budgetFor(17256)).toBe(18432);
  });

  it("reads recorded sizes out of a committed table, padded or not", () => {
    const markdown = [
      "| Import path                        | Gzip bytes | Budget (bytes) |",
      "| ---------------------------------- | ---------: | -------------: |",
      `| \`${PACKAGE_NAME}\`            |      24470 |          26624 |`,
      `| \`${PACKAGE_NAME}/tokens.css\` |       1341 |           2048 |`,
      "",
      "| Component | Rows | Columns |",
      "| --- | ---: | ---: |",
      "| `DataGrid` | 3 | 4 |",
    ].join("\n");

    expect([...parseSizeTable(PACKAGE_NAME, markdown)]).toEqual([
      ["index", { budgetBytes: 26624, gzipBytes: 24470 }],
      ["tokens.css", { budgetBytes: 2048, gzipBytes: 1341 }],
    ]);
  });

  it("rejects a table with no rows for this package", () => {
    expect(() => parseSizeTable(PACKAGE_NAME, "# Sizes\n")).toThrow(
      /carries no entry point size table/,
    );
  });

  it("rejects a budget column that the recorded size does not imply", () => {
    const markdown = tableFor([
      { budgetBytes: 24576, entry: "index", gzipBytes: 24470 },
    ]);
    expect(() => parseSizeTable(PACKAGE_NAME, markdown)).toThrow(
      /budgets signalk-nearlcrews-ui at 24576 bytes; 24470 recorded gzip bytes imply 26624/,
    );
  });

  it("accepts a measurement within compressor tolerance of the recorded one", () => {
    expect(() => {
      assertRecordedSize("index", 24470, 24500);
    }).not.toThrow();
  });

  it("names the refresh command when a measurement leaves the record behind", () => {
    expect(() => {
      assertRecordedSize("index", 24470, 26000);
    }).toThrow(/node scripts\/check-bundle-size\.mjs --table/);
  });

  it("reads back the table it renders for a release", () => {
    const rows = [
      { budgetBytes: budgetFor(30698), entry: "index", gzipBytes: 30698 },
      { budgetBytes: budgetFor(1566), entry: "tokens.css", gzipBytes: 1566 },
    ];
    expect([...parseSizeTable(PACKAGE_NAME, tableFor(rows))]).toEqual([
      ["index", { budgetBytes: budgetFor(30698), gzipBytes: 30698 }],
      ["tokens.css", { budgetBytes: budgetFor(1566), gzipBytes: 1566 }],
    ]);
  });
});
