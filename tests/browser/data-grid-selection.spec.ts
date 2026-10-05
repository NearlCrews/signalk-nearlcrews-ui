import { TONE_BAR_WIDTH } from "../../src/styles/fragments.js";
import {
  cssLength,
  emulateForcedColors,
  expect,
  gridRow,
  type Locator,
  movePointerOffPanel,
  type Page,
  skipOutsideChromium,
  styleOf,
  systemColors,
  test,
  tokenColor,
} from "./fixtures.js";

/*
 * A selected DataGrid row carries a leading bar beside its tint. The bar is a
 * positioned pseudo-element over the first column's inset, which is widened by
 * the bar on every row and in the header, so selecting a row moves no text,
 * and no cell draws a leading border that would mitre into the row separator.
 * Each check runs on three grids: the table below the virtualize threshold,
 * the virtualized grid, which wraps every cell in an element of its own so a
 * positional rule would reach every cell there, and a compact virtualized
 * grid, whose first column takes its own inset, which the compact padding
 * must not override.
 */

/** How the browser paints one cell's leading edge. */
interface LeadingEdge {
  /** The bar pseudo-element's color, or null when the cell draws none. */
  readonly bar: string | null;
  /** The bar's block extent and offsets inside the cell, in CSS pixels. */
  readonly barBlockEnd: number;
  readonly barBlockStart: number;
  readonly barHeight: number;
  readonly barInlineStart: number;
  readonly barPosition: string;
  readonly barWidth: number;
  /** The cell's own leading border, which would mitre into the separator. */
  readonly borderWidth: number;
  /** The cell's padding-box height, the extent a full bar spans. */
  readonly cellHeight: number;
  readonly inset: number;
  /** The width of the row separator the cell draws, its block-end border. */
  readonly separatorWidth: number;
  /** Where the cell's text starts, measured from the cell's own edge. */
  readonly textOffset: number;
}

/** The leading edge of every cell in a row, in column order. */
function leadingEdges(row: Locator): Promise<readonly LeadingEdge[]> {
  return row.evaluate((element) =>
    [
      ...element.querySelectorAll(
        '[role="columnheader"], [role="rowheader"], [role="gridcell"]',
      ),
    ].map((cell) => {
      const style = getComputedStyle(cell);
      const bar = getComputedStyle(cell, "::before");
      // A pseudo-element with content still paints nothing when it is taken
      // out of the box tree, and its insets resolve from the rules either way.
      const drawn = bar.content !== "none" && bar.display !== "none";
      const text = document.createRange();
      text.selectNodeContents(cell);
      return {
        bar: drawn ? bar.borderInlineStartColor : null,
        barBlockEnd: Number.parseFloat(bar.insetBlockEnd),
        barBlockStart: Number.parseFloat(bar.insetBlockStart),
        barHeight: drawn ? Number.parseFloat(bar.height) : 0,
        barInlineStart: Number.parseFloat(bar.insetInlineStart),
        barPosition: bar.position,
        barWidth: drawn ? Number.parseFloat(bar.borderInlineStartWidth) : 0,
        borderWidth: Number.parseFloat(style.borderInlineStartWidth),
        cellHeight: cell.clientHeight,
        inset: Number.parseFloat(style.paddingInlineStart),
        separatorWidth: Number.parseFloat(style.borderBlockEndWidth),
        textOffset:
          text.getBoundingClientRect().left - cell.getBoundingClientRect().left,
      };
    }),
  );
}

/** The first cell and the rest of a row's cells, which must exist. */
function split(
  edges: readonly LeadingEdge[],
): [LeadingEdge, readonly LeadingEdge[]] {
  const [first, ...others] = edges;
  if (first === undefined || others.length === 0) {
    throw new Error("Expected several cells in the row.");
  }
  return [first, others];
}

interface FleetRows {
  readonly grid: Locator;
  readonly header: Locator;
  readonly selected: Locator;
  readonly unselected: Locator;
}

/** Opens the fixture and returns the grid with the given accessible name. */
async function openFleet(page: Page, label: string): Promise<Locator> {
  await page.goto("/data-grid.html");
  return page.getByRole("grid", { exact: true, name: label });
}

/**
 * Opens the fixture and selects the second vessel with a click, then parks
 * the pointer so no row is hovered.
 */
async function selectByPointer(page: Page, label: string): Promise<FleetRows> {
  const grid = await openFleet(page, label);
  const header = grid.locator(".snui-data-grid__header [role='row']").first();
  const unselected = gridRow(grid, "Vessel 001");
  const selected = gridRow(grid, "Vessel 002");
  await selected.click();
  await expect(selected).toHaveAttribute("aria-selected", "true");
  await movePointerOffPanel(page);
  return { grid, header, selected, unselected };
}

/**
 * How wide the fixture's Banner paints its tone bar, the width the selection
 * bar matches. It fails unless that is more than a hairline, so a bar and a
 * Banner that both lost their width cannot pass as equal.
 */
async function toneBarWidth(page: Page): Promise<number> {
  const width = Number.parseFloat(
    await styleOf(
      page.locator(".snui-banner").first(),
      "border-inline-start-width",
    ),
  );
  expect(width).toBeGreaterThan(1);
  return width;
}

/** The token the selection bar is drawn in, resolved inside its row. */
const ACCENT_FILL = "--snui-color-accent-fill";

const LAYOUTS = [
  ["table", "Table fleet"],
  ["virtualized", "Virtualized fleet"],
  ["compact virtualized", "Compact virtualized fleet"],
] as const;

/**
 * Focuses the first vessel's row, moves to the second with ArrowDown, and
 * selects it with Space: the keyboard flow, which leaves the selected row
 * holding focus and its ring.
 */
async function selectByKeyboard(page: Page, label: string): Promise<Locator> {
  const grid = await openFleet(page, label);
  const row = gridRow(grid, "Vessel 002");
  await gridRow(grid, "Vessel 001").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(row).toHaveAttribute("aria-selected", "true");
  await expect(row).toHaveAttribute("data-focus-visible", "true");
  await movePointerOffPanel(page);
  return row;
}

/** A focused row's inset focus ring. */
function focusRing(
  row: Locator,
): Promise<{ offset: number; style: string; width: number }> {
  return row.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      offset: Number.parseFloat(style.outlineOffset),
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
}

/**
 * Fails unless the bar starts past the ring on every side it touches. The
 * ring fills the band just inside the row's edge, so it stays whole.
 */
function expectBarInsideRing(first: LeadingEdge, ringWidth: number): void {
  expect(first.barInlineStart).toBe(ringWidth);
  expect(first.barBlockStart).toBe(ringWidth);
  expect(first.barBlockEnd).toBe(ringWidth);
  expect(first.barHeight).toBeCloseTo(first.cellHeight - 2 * ringWidth, 0);
}

for (const [layout, label] of LAYOUTS) {
  test.describe(`the ${layout} layout`, () => {
    test("paints the selection bar before the first cell of a selected row only", async ({
      page,
    }, testInfo) => {
      skipOutsideChromium(testInfo);
      const { header, selected, unselected } = await selectByPointer(
        page,
        label,
      );
      const [headerEdges, selectedEdges, unselectedEdges] = await Promise.all([
        leadingEdges(header),
        leadingEdges(selected),
        leadingEdges(unselected),
      ]);
      const [firstHeader, otherHeaders] = split(headerEdges);
      const [firstSelected, otherSelected] = split(selectedEdges);
      const [firstUnselected, otherUnselected] = split(unselectedEdges);

      // No cell draws a leading border, which is what lets each row
      // separator, the header's included, run from the grid's start edge
      // rather than mitring into a leading corner.
      for (const edge of [
        ...headerEdges,
        ...selectedEdges,
        ...unselectedEdges,
      ]) {
        expect(edge.borderWidth).toBe(0);
        expect(edge.separatorWidth).toBeGreaterThan(0);
      }

      // The first column's inset carries the bar's width in the header and
      // every row alike, and the text of the first cell starts at the same
      // place whether its row is selected or not.
      expect(firstSelected.inset).toBe(firstHeader.inset);
      expect(firstUnselected.inset).toBe(firstHeader.inset);
      for (const edge of [
        ...otherHeaders,
        ...otherSelected,
        ...otherUnselected,
      ]) {
        expect(edge.inset).toBeLessThan(firstHeader.inset);
      }
      expect(firstSelected.textOffset).toBeCloseTo(
        firstUnselected.textOffset,
        1,
      );
      // The widening is the bar's own width over the density's inset, so a
      // density padding rule that won the cascade over it would show here.
      const widening = firstHeader.inset - (otherHeaders[0]?.inset ?? 0);
      expect(widening).toBeCloseTo(
        await cssLength(page.locator(".snui-root__content"), TONE_BAR_WIDTH),
        1,
      );

      // Only the selected row paints the bar: out of flow, spanning its
      // first cell from edge to edge, as wide as a Banner's tone bar, and
      // inside the width the inset set aside for it.
      const bannerBar = await toneBarWidth(page);
      expect(firstSelected.bar).toBe(await tokenColor(selected, ACCENT_FILL));
      expect(firstSelected.barPosition).toBe("absolute");
      expect(firstSelected.barInlineStart).toBe(0);
      expect(firstSelected.barBlockStart).toBe(0);
      expect(firstSelected.barBlockEnd).toBe(0);
      expect(firstSelected.barHeight).toBeCloseTo(firstSelected.cellHeight, 0);
      expect(firstSelected.barWidth).toBe(bannerBar);
      expect(firstSelected.barWidth).toBeLessThanOrEqual(widening + 0.5);
      for (const edge of [
        firstHeader,
        firstUnselected,
        ...otherHeaders,
        ...otherSelected,
        ...otherUnselected,
      ]) {
        expect(edge.bar).toBeNull();
      }
    });

    test("keeps the selection bar inside a focused row's focus ring", async ({
      page,
    }, testInfo) => {
      skipOutsideChromium(testInfo);
      // Space selects the row that holds focus, so a selected row usually
      // carries the ring too.
      const row = await selectByKeyboard(page, label);

      const ring = await focusRing(row);
      const [first] = split(await leadingEdges(row));
      expect(ring.style).toBe("solid");
      expect(ring.offset).toBe(-ring.width);
      expect(first.bar).not.toBeNull();
      expectBarInsideRing(first, ring.width);
    });

    test("widens the ring under a contrast request and keeps the bar inside it", async ({
      page,
    }, testInfo) => {
      skipOutsideChromium(testInfo);
      // A request for more contrast widens every focus ring to 3px, the
      // grid row's included, and the bar steps inside the wider band.
      await page.emulateMedia({ contrast: "more" });
      const row = await selectByKeyboard(page, label);

      const ring = await focusRing(row);
      const [first] = split(await leadingEdges(row));
      expect(ring.width).toBe(3);
      expect(ring.offset).toBe(-ring.width);
      // The bar still paints, in the accent fill and as wide as a Banner's
      // tone bar, and spans the cell between the wider band's edges.
      expect(first.bar).toBe(await tokenColor(row, ACCENT_FILL));
      expect(first.barWidth).toBe(await toneBarWidth(page));
      expectBarInsideRing(first, ring.width);
    });

    test("shows a focused selected row's ring under forced colors", async ({
      page,
    }, testInfo) => {
      skipOutsideChromium(testInfo);
      await emulateForcedColors(page);
      const row = await selectByKeyboard(page, label);

      // Forced colors fills a selected row with Highlight, so a ring in
      // Highlight too would vanish into it: the ring takes HighlightText, as
      // the bar does.
      const colors = await systemColors(page, ["Highlight", "HighlightText"]);
      const painted = await row.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          outline: style.outlineColor,
          outlineStyle: style.outlineStyle,
        };
      });
      expect(painted.outlineStyle).toBe("solid");
      expect(painted.background).toBe(colors.Highlight);
      expect(painted.outline).toBe(colors.HighlightText);
      expect(painted.outline).not.toBe(painted.background);
    });

    test("keeps the one selection bar under forced colors", async ({
      page,
    }, testInfo) => {
      skipOutsideChromium(testInfo);
      await emulateForcedColors(page);
      const { selected } = await selectByPointer(page, label);

      const [first, others] = split(await leadingEdges(selected));
      const colors = await systemColors(page, ["HighlightText"]);

      expect(first.bar).toBe(colors.HighlightText);
      expect(first.barWidth).toBe(await toneBarWidth(page));
      for (const edge of others) {
        expect(edge.bar).toBeNull();
        expect(edge.borderWidth).toBe(0);
      }
    });
  });
}
