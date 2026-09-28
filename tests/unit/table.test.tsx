import { screen } from "@testing-library/react";
import { transform } from "lightningcss";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Table,
  TableCell,
  TableHeaderCell,
  TableScrollRegion,
} from "../../src/composites.js";
import {
  FOCUS_RING_WIDTH,
  INSET_FOCUS_RING_OFFSET,
} from "../../src/styles/fragments.js";
import { SIMPLE_TABLE_STYLES } from "../../src/styles/simple-table.js";
import { TABLE_STYLES } from "../../src/styles/table.js";
import { TABS_STYLES } from "../../src/styles/tabs.js";
import { ROOT_SELECTOR } from "../../src/version.js";
import { ruleBody } from "../css-helpers.js";
import { renderInPanel } from "../helpers.js";

describe("Table", () => {
  it("names the table by its caption and styles header and numeric cells", () => {
    const ref = createRef<HTMLTableElement>();
    renderInPanel(
      <Table ref={ref} caption="Cached charts" zebra density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Chart</TableHeaderCell>
            <TableHeaderCell numeric>Size</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TableHeaderCell scope="row">Coastal</TableHeaderCell>
            <TableCell numeric>12 MiB</TableCell>
          </tr>
        </tbody>
      </Table>,
    );

    const table = screen.getByRole("table", { name: "Cached charts" });
    expect(ref.current).toBe(table);
    expect(table).toHaveClass(
      "snui-table",
      "snui-table--compact",
      "snui-table--zebra",
    );
    expect(table.querySelector("caption")).toHaveClass("snui-table__caption");
    const [chart, size] = screen.getAllByRole("columnheader");
    expect(chart).toHaveAttribute("scope", "col");
    expect(size).toHaveClass("snui-table__cell--numeric");
    expect(screen.getByRole("rowheader", { name: "Coastal" })).toHaveAttribute(
      "scope",
      "row",
    );
    expect(screen.getByRole("cell", { name: "12 MiB" })).toHaveClass(
      "snui-table__cell--numeric",
    );
  });

  it("keeps a hidden caption for assistive technology only", () => {
    renderInPanel(
      <Table caption="Sources" captionVisibility="hidden">
        <tbody>
          <tr>
            <TableCell>GPS</TableCell>
          </tr>
        </tbody>
      </Table>,
    );

    expect(screen.getByRole("table", { name: "Sources" })).toBeVisible();
    expect(screen.getByText("Sources")).toHaveClass(
      "snui-table__caption--hidden",
    );
  });

  it("accepts an aria-label instead of a caption and rejects an unnamed table", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderInPanel(
      <Table aria-label="Mappings">
        <tbody>
          <tr>
            <TableCell>Row</TableCell>
          </tr>
        </tbody>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "Mappings" })).toBeVisible();
    expect(screen.getByRole("table").querySelector("caption")).toBeNull();

    expect(() =>
      renderInPanel(
        <Table caption="  ">
          <tbody />
        </Table>,
      ),
    ).toThrow("signalk-nearlcrews-ui: Table requires an accessible name");
  });
});

describe("TableScrollRegion", () => {
  it("is a focusable, named region around its table", () => {
    const ref = createRef<HTMLElement>();
    renderInPanel(
      <TableScrollRegion ref={ref} aria-label="Cached charts, scrollable">
        <Table caption="Cached charts">
          <tbody>
            <tr>
              <TableCell>Coastal</TableCell>
            </tr>
          </tbody>
        </Table>
      </TableScrollRegion>,
    );

    const region = screen.getByRole("region", {
      name: "Cached charts, scrollable",
    });
    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("snui-table-scroll");
    expect(ref.current).toBe(region);
    expect(screen.getByRole("table", { name: "Cached charts" })).toBeVisible();
  });

  it("lets a consumer that manages focus itself drop the tab stop", () => {
    renderInPanel(
      <TableScrollRegion aria-label="Cached charts, scrollable" tabIndex={-1}>
        <div />
      </TableScrollRegion>,
    );

    expect(
      screen.getByRole("region", { name: "Cached charts, scrollable" }),
    ).toHaveAttribute("tabindex", "-1");
  });

  it("rejects a region without a name", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(
        <TableScrollRegion>
          <div />
        </TableScrollRegion>,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: TableScrollRegion requires an accessible name",
    );
  });
});

describe("table and tabs style modules", () => {
  it.each([
    ["data grid", TABLE_STYLES.styles],
    ["simple table", SIMPLE_TABLE_STYLES.styles],
    ["tabs", TABS_STYLES.styles],
  ])("scopes the %s module and parses it without warnings", (_name, css) => {
    expect(
      css.startsWith(`@scope (${ROOT_SELECTOR}) to ([data-snui-version])`),
    ).toBe(true);
    const result = transform({
      filename: "module.css",
      code: Buffer.from(css, "utf8"),
      minify: false,
    });
    expect(result.warnings).toEqual([]);
  });

  it("paints zebra rows with the stripe token and numeric cells with tabular digits", () => {
    // Each declaration is tied to its own rule and matched on its own, so
    // reordering a block that renders identically does not fail the test.
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table--zebra[^{}]*\{[^}]*background: var\(--snui-color-surface-stripe\);/,
    );
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table__cell--numeric \{[^}]*font-variant-numeric: tabular-nums;/,
    );
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table__cell--numeric \{[^}]*text-align: end;/,
    );
  });

  it("floors cell width inside the scroll region so a wide table scrolls", () => {
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table-scroll \.snui-table th,\n\.snui-table-scroll \.snui-table td \{[^}]*min-width: var\(--snui-table-cell-min, 6rem\);/,
    );
    // A table outside the region keeps squeezing, because nothing there
    // scrolls and the panel must not.
    expect(SIMPLE_TABLE_STYLES.styles).not.toMatch(
      /^\.snui-table th,\n\.snui-table td \{[^}]*min-width:/m,
    );
  });

  it("stripes rows with the same pseudo-class the data grid uses", () => {
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table--zebra tbody > tr:nth-of-type\(even\) > td,/,
    );
    expect(SIMPLE_TABLE_STYLES.styles).not.toMatch(/nth-child\(even\)/);
  });

  it("separates rows and tabs with the subtle border", () => {
    // Row separators and the tablist rule are dividers, not the edge of
    // anything a reader operates, so they take the decorative token.
    expect(
      ruleBody(SIMPLE_TABLE_STYLES.styles, ".snui-table th,\n.snui-table td"),
    ).toContain("border-block-end: 1px solid var(--snui-color-border-subtle);");
    expect(ruleBody(TABS_STYLES.styles, ".snui-tablist")).toContain(
      "border-block-end: 1px solid var(--snui-color-border-subtle);",
    );
    expect(
      ruleBody(TABS_STYLES.styles, ".snui-tabs--vertical .snui-tablist"),
    ).toContain(
      "border-inline-end: 1px solid var(--snui-color-border-subtle);",
    );
    // The narrow panel lays a vertical tablist out as a row, and its rule
    // moves to the block end with the same token.
    const narrow = TABS_STYLES.styles.slice(
      TABS_STYLES.styles.indexOf("@container"),
    );
    expect(ruleBody(narrow, "  .snui-tabs--vertical .snui-tablist")).toContain(
      "border-block-end: 1px solid var(--snui-color-border-subtle);",
    );
    for (const styles of [SIMPLE_TABLE_STYLES.styles, TABS_STYLES.styles]) {
      expect(styles).not.toContain("var(--snui-color-border)");
    }
  });

  it("rings a focused tab at the shared ring width under forced colors", () => {
    // The system ring forced colors rebuilds a tab's focus with is a focus
    // ring, so it takes the width a contrast request raises, inset like the
    // package's other inset rings.
    const forced = TABS_STYLES.styles.slice(
      TABS_STYLES.styles.indexOf("@media (forced-colors: active)"),
    );
    const ring = ruleBody(forced, "  .snui-tab:focus-visible");
    expect(ring).toContain(`outline: ${FOCUS_RING_WIDTH} solid CanvasText;`);
    expect(ring).toContain(`outline-offset: ${INSET_FOCUS_RING_OFFSET};`);
  });

  it("declares cell text alignment once, on the table", () => {
    expect(SIMPLE_TABLE_STYLES.styles).toMatch(
      /\.snui-table \{[^}]*text-align: start;/,
    );
    expect(SIMPLE_TABLE_STYLES.styles).not.toMatch(
      /\.snui-table th,\n\.snui-table td \{[^}]*text-align: start;/,
    );
  });
});
