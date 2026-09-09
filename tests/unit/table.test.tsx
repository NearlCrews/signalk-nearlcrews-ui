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
import { SIMPLE_TABLE_STYLES } from "../../src/styles/simple-table.js";
import { TABS_STYLES } from "../../src/styles/tabs.js";
import { ROOT_SELECTOR } from "../../src/version.js";
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
    ).toThrow("Table requires an accessible name");
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

  it("rejects a region without a name", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderInPanel(
        <TableScrollRegion>
          <div />
        </TableScrollRegion>,
      ),
    ).toThrow("TableScrollRegion requires an accessible name");
  });
});

describe("table and tabs style modules", () => {
  it.each([
    ["simple table", SIMPLE_TABLE_STYLES],
    ["tabs", TABS_STYLES],
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
    expect(SIMPLE_TABLE_STYLES).toMatch(
      /\.snui-table--zebra[^{}]*\{[^}]*background: var\(--snui-color-surface-stripe\);/,
    );
    expect(SIMPLE_TABLE_STYLES).toMatch(
      /\.snui-table__cell--numeric \{[^}]*font-variant-numeric: tabular-nums;/,
    );
    expect(SIMPLE_TABLE_STYLES).toMatch(
      /\.snui-table__cell--numeric \{[^}]*text-align: end;/,
    );
  });
});
