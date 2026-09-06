import { describe, expect, it } from "vitest";

import {
  formatSizeTable,
  importPathFor,
} from "../../scripts/lib/size-table.mjs";

describe("bundle size table", () => {
  it("names the root entry by the package name and subpaths by import path", () => {
    expect(importPathFor("signalk-nearlcrews-ui", "index")).toBe(
      "signalk-nearlcrews-ui",
    );
    expect(importPathFor("signalk-nearlcrews-ui", "data-grid")).toBe(
      "signalk-nearlcrews-ui/data-grid",
    );
  });

  it("renders the Markdown table the API reference carries", () => {
    expect(
      formatSizeTable("signalk-nearlcrews-ui", [
        { budgetBytes: 26624, entry: "index", gzipBytes: 24470 },
        { budgetBytes: 2048, entry: "tokens.css", gzipBytes: 1341 },
      ]),
    ).toBe(
      [
        "| Import path | Gzip bytes | Budget (bytes) |",
        "| --- | ---: | ---: |",
        "| `signalk-nearlcrews-ui` | 24470 | 26624 |",
        "| `signalk-nearlcrews-ui/tokens.css` | 1341 | 2048 |",
      ].join("\n"),
    );
  });
});
