import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "../../bin/lib/consumer-checks.mjs";
import {
  assertRecordedSize,
  assertWithinBudget,
  budgetFor,
  CONSUMER_PANEL_ENTRY,
  CONSUMER_PANEL_FIXTURE,
  formatSizeTable,
  importPathFor,
  parseSizeTable,
  tableBudget,
} from "../../scripts/lib/size-table.mjs";

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

  it("carries a budget that is not the one the recorded size implies", () => {
    // A budget is a reviewed decision, so a raised or tightened one is read as
    // written rather than recomputed from the measurement it guards.
    const markdown = tableFor([
      { budgetBytes: 30720, entry: "index", gzipBytes: 24470 },
    ]);
    expect([...parseSizeTable(PACKAGE_NAME, markdown)]).toEqual([
      ["index", { budgetBytes: 30720, gzipBytes: 24470 }],
    ]);
  });

  it("rejects a budget below the size recorded beside it", () => {
    const markdown = tableFor([
      { budgetBytes: 24000, entry: "index", gzipBytes: 24470 },
    ]);
    expect(() => parseSizeTable(PACKAGE_NAME, markdown)).toThrow(
      /budgets signalk-nearlcrews-ui at 24000 bytes, below the 24470 gzip bytes it records/,
    );
  });

  it("reads the consumer-shaped panel row by its fixture path", () => {
    expect(importPathFor(PACKAGE_NAME, CONSUMER_PANEL_ENTRY)).toBe(
      CONSUMER_PANEL_FIXTURE,
    );
    const markdown = tableFor([
      { budgetBytes: 31744, entry: CONSUMER_PANEL_ENTRY, gzipBytes: 29168 },
    ]);
    expect(markdown).toContain(`| \`${CONSUMER_PANEL_FIXTURE}\` | 29168 |`);
    expect([...parseSizeTable(PACKAGE_NAME, markdown)]).toEqual([
      [CONSUMER_PANEL_ENTRY, { budgetBytes: 31744, gzipBytes: 29168 }],
    ]);
  });

  it("carries the committed budget into a refreshed table", () => {
    const recorded = { budgetBytes: 44032, gzipBytes: 40675 };
    expect(tableBudget(recorded, 32000, { tighten: false })).toBe(44032);
    expect(tableBudget(recorded, 44000, { tighten: false })).toBe(44032);
  });

  it("derives a first budget for a row the table does not have yet", () => {
    expect(tableBudget(undefined, 29168, { tighten: false })).toBe(
      budgetFor(29168),
    );
    expect(tableBudget(undefined, 29168, { tighten: true })).toBe(
      budgetFor(29168),
    );
  });

  it("only ever lowers a budget when tightening", () => {
    const recorded = { budgetBytes: 44032, gzipBytes: 40675 };
    expect(tableBudget(recorded, 32000, { tighten: true })).toBe(
      budgetFor(32000),
    );
    // Headroom over a grown measurement would raise the ceiling, which only a
    // hand edit may do.
    expect(tableBudget(recorded, 43000, { tighten: true })).toBe(44032);
  });

  it("fails a measurement over its budget and says how a budget is raised", () => {
    expect(() => {
      assertWithinBudget("index", 44032, 44032);
    }).not.toThrow();
    expect(() => {
      assertWithinBudget("index", 44032, 44100);
    }).toThrow(
      /index is 44100 gzip bytes, above the 44032 byte budget\. Raise a budget by hand in docs\/api-reference\.md and record the reason in the CHANGELOG\.md entry for the release/,
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
