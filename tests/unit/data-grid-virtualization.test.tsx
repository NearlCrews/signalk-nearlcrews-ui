import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Cell,
  Column,
  DataGrid,
  Row,
  type RowProps,
} from "../../src/data-grid.js";
import { callsMentioning, panel, renderInPanel } from "../helpers.js";
import {
  BOATS,
  type Boat,
  boatFleet,
  boatGrid,
  bodyRows,
  CELL_SELECTOR,
  cellAt,
  keyedBoatGrid,
  NAME_DEPTH_COLUMNS,
  renderBoatRow,
  renderGrid,
  renderKeyedBoatRow,
  rowAt,
  rowNames,
} from "./lib/data-grid-fixture.js";

describe("DataGrid", () => {
  describe("virtualization", () => {
    const fleet = boatFleet(20);

    it("renders every row below the threshold", () => {
      const { container } = renderGrid({
        items: fleet.slice(0, 10),
        virtualizeThreshold: 10,
      });

      expect(bodyRows(container)).toHaveLength(10);
      expect(screen.getByRole("grid")).not.toHaveAttribute("aria-rowcount");
      expect(
        container.querySelector(".snui-data-grid--virtualized"),
      ).toBeNull();
    });

    it("uses React Aria virtualization above the threshold and keeps the header mounted", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
      });

      expect(
        container.querySelector(".snui-data-grid--virtualized"),
      ).not.toBeNull();
      expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "21");
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toBeInTheDocument();
    });

    it("pins the body implementation when virtualize is not auto", () => {
      const { container } = renderGrid({
        items: fleet.slice(0, 4),
        virtualize: "always",
        virtualizeThreshold: 10,
      });

      expect(
        container.querySelector(".snui-data-grid--virtualized"),
      ).not.toBeNull();

      const { container: never } = renderGrid({
        items: fleet,
        virtualize: "never",
        virtualizeThreshold: 10,
      });

      expect(never.querySelector(".snui-data-grid--virtualized")).toBeNull();
    });

    it("keeps selection and the table itself across a row-count change when the mode is pinned", async () => {
      const user = userEvent.setup();
      const view = renderGrid({
        items: fleet.slice(0, 4),
        selectionMode: "multiple",
        virtualize: "never",
        virtualizeThreshold: 2,
      });
      const grid = screen.getByRole("grid");

      await user.click(rowAt(view.container, 1));
      expect(rowAt(view.container, 1)).toHaveAttribute("aria-selected", "true");

      view.rerender(
        panel(
          boatGrid({
            items: fleet,
            selectionMode: "multiple",
            virtualize: "never",
            virtualizeThreshold: 2,
          }),
        ),
      );

      expect(screen.getByRole("grid")).toBe(grid);
      expect(rowAt(view.container, 1)).toHaveAttribute("aria-selected", "true");
    });

    it("keeps the row wrappers a virtualized body renders from", () => {
      // React Aria caches a rendered row against the wrapper it came from, so
      // a render that leaves the rows and the row renderer alone must not
      // rebuild the collection.
      let rendered = 0;
      const renderRow = (boat: Boat): ReactElement<RowProps<Boat>> => {
        rendered += 1;
        return renderBoatRow(boat);
      };
      const tree = (className: string): ReactElement =>
        panel(
          boatGrid({
            className,
            items: fleet,
            renderRow,
            virtualizeThreshold: 10,
          }),
        );
      const view = render(tree("first"));
      const afterMount = rendered;

      view.rerender(tree("second"));

      expect(afterMount).toBeGreaterThan(0);
      expect(rendered).toBe(afterMount);
    });

    it("keeps the public ref on the outer container across threshold modes", () => {
      const ref = createRef<HTMLDivElement>();
      const view = renderGrid({
        items: fleet.slice(0, 10),
        ref,
        virtualizeThreshold: 10,
      });

      expect(ref.current).toHaveClass("snui-data-grid");
      expect(ref.current?.querySelector("[role='grid']")).toBeInTheDocument();

      view.rerender(
        panel(boatGrid({ items: fleet, ref, virtualizeThreshold: 10 })),
      );

      expect(ref.current).toHaveClass(
        "snui-data-grid",
        "snui-data-grid--virtualized",
      );
      expect(ref.current?.querySelector("[role='grid']")).toBeInTheDocument();
    });

    it("lets React Aria own complete row counts and rendered row indices", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
      });

      expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "21");
      expect(rowAt(container, 0)).toHaveAttribute("aria-rowindex", "2");
      const indices = [...bodyRows(container)].map((row) =>
        Number(row.getAttribute("aria-rowindex")),
      );
      expect(indices).toEqual(indices.map((_, position) => 2 + position));
    });

    it("keeps explicit grid roles without relying on native table layout", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
      });

      expect(
        container.querySelector(".snui-data-grid__header"),
      ).toHaveAttribute("role", "rowgroup");
      expect(container.querySelector(".snui-data-grid__body")).toHaveAttribute(
        "role",
        "rowgroup",
      );
      const cells = [...container.querySelectorAll(CELL_SELECTOR)];
      expect(cells.length).toBeGreaterThan(0);
      const rowheaders = cells.filter(
        (cell) => cell.getAttribute("role") === "rowheader",
      );
      const gridcells = cells.filter(
        (cell) => cell.getAttribute("role") === "gridcell",
      );
      // RAC stamps rowheader on the row-header column; every other cell is a
      // gridcell.
      expect(rowheaders.length).toBeGreaterThan(0);
      expect(gridcells.length).toBeGreaterThan(0);
    });

    it("preserves consumer row styles in virtualized mode", () => {
      const { container } = renderGrid({
        density: "compact",
        items: fleet,
        renderRow: (boat) => (
          <Row {...(boat.id === "boat-0" ? { style: { height: 72 } } : {})}>
            <Cell>{boat.name}</Cell>
            <Cell>{boat.depth}</Cell>
          </Row>
        ),
        virtualizeThreshold: 10,
      });

      expect(rowAt(container, 0)).toHaveStyle({ height: "72px" });
    });

    it("adds virtualized zebra parity when row style is a function", () => {
      const { container } = renderGrid({
        items: fleet,
        renderRow: (boat) => (
          <Row style={() => ({ color: "red" })}>
            <Cell>{boat.name}</Cell>
            <Cell>{boat.depth}</Cell>
          </Row>
        ),
        virtualizeThreshold: 10,
        zebra: true,
      });

      expect(rowAt(container, 0)).not.toHaveAttribute("data-snui-zebra-odd");
      expect(rowAt(container, 1)).toHaveAttribute(
        "data-snui-zebra-odd",
        "true",
      );
    });

    it("falls back to index keys for items without id", () => {
      const anonymous = Array.from({ length: 20 }, (_, index) => ({
        name: `Anon ${String(index)}`,
      }));
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Anonymous"
          items={anonymous}
          renderRow={(item) => (
            <Row>
              <Cell>{item.name}</Cell>
            </Row>
          )}
          virtualizeThreshold={10}
        >
          <Column id="name">Name</Column>
        </DataGrid>,
      );

      expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "21");
      expect(rowAt(container, 0)).toHaveAttribute("data-key", "0");
    });

    it("renders virtualized rows in document order matching the data", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
      });

      const names = rowNames(container);
      expect(names[0]).toBe("Boat 0");
      const sequence = names.map((name) => Number(name.replace("Boat ", "")));
      expect(sequence).toEqual([...sequence].sort((a, b) => a - b));
    });

    it("gives text-only virtualized cells a title and lets wrap columns wrap", () => {
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          items={fleet}
          renderRow={(boat) => (
            <Row>
              <Cell>{boat.name}</Cell>
              <Cell>{boat.depth} m</Cell>
              <Cell>
                <em>{boat.name}</em>
              </Cell>
            </Row>
          )}
          virtualizeThreshold={10}
        >
          <Column id="name" wrap>
            Name
          </Column>
          <Column id="depth" numeric>
            Depth
          </Column>
          <Column id="rich">Rich</Column>
        </DataGrid>,
      );

      const firstRow = rowAt(container, 0);
      // A wrap column keeps its text unwrapped and untitled.
      const nameCell = cellAt(firstRow, 0);
      expect(nameCell).toHaveAttribute("data-snui-wrap", "");
      expect(nameCell.querySelector(".snui-data-grid__cell-text")).toBeNull();
      // Text-only content, including mixed string and number children, is
      // wrapped with its full value as the title.
      const depthText = cellAt(firstRow, 1).querySelector(
        ".snui-data-grid__cell-text",
      );
      expect(depthText).toHaveAttribute("title", "0 m");
      expect(depthText).toHaveTextContent("0 m");
      expect(cellAt(firstRow, 1)).toHaveAttribute("data-snui-numeric", "");
      // Element content is left to the consumer.
      expect(
        cellAt(firstRow, 2).querySelector(".snui-data-grid__cell-text"),
      ).toBeNull();
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toHaveAttribute("data-snui-wrap", "");
    });

    it("marks virtual zebra parity from the collection index", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
        zebra: true,
      });

      expect(rowAt(container, 0)).not.toHaveAttribute("data-snui-zebra-odd");
      expect(rowAt(container, 1)).toHaveAttribute("data-snui-zebra-odd");
      expect(rowAt(container, 2)).not.toHaveAttribute("data-snui-zebra-odd");
    });

    it("leaves parity off every row when zebra is off", () => {
      const { container } = renderGrid({
        items: fleet,
        virtualizeThreshold: 10,
      });

      for (const row of bodyRows(container)) {
        expect(row).not.toHaveAttribute("data-snui-zebra-odd");
      }
    });
  });

  describe("row cache", () => {
    /** Renders the depth in the unit a panel's preference names. */
    function depthRow(unit: string) {
      return (boat: Boat): ReactElement<RowProps<Boat>> => (
        <Row>
          <Cell>{boat.name}</Cell>
          <Cell>{`${String(boat.depth)} ${unit}`}</Cell>
        </Row>
      );
    }

    // The virtualizer decides which rows jsdom's empty viewport shows, so
    // every rendered row is read rather than one by position.
    function depths(container: HTMLElement): string[] {
      return [...bodyRows(container)].map((row) => cellAt(row, 1).textContent);
    }

    /** Fails unless at least one row shows, and every one in `unit`. */
    function expectEveryDepthIn(container: HTMLElement, unit: string): void {
      const shown = depths(container);
      expect(shown.length).toBeGreaterThan(0);
      for (const depth of shown) {
        expect(depth).toMatch(new RegExp(`^\\d+ ${unit}$`));
      }
    }

    it.each(["never", "always"] as const)(
      "rebuilds rows from a new renderRow over the same items (virtualize %s)",
      (virtualize) => {
        const view = renderGrid({ renderRow: depthRow("m"), virtualize });
        expect(depths(view.container)).toContain("12 m");

        view.rerender(
          panel(boatGrid({ renderRow: depthRow("ft"), virtualize })),
        );

        expectEveryDepthIn(view.container, "ft");
      },
    );

    it.each([
      ["never", false],
      ["never", true],
      ["always", false],
    ] as const)(
      "rebuilds cells a row renders from a function when renderRow changes (virtualize %s, numeric %s)",
      (virtualize, numeric) => {
        const functionDepthRow =
          (unit: string) =>
          (boat: Boat): ReactElement<RowProps<Boat>> => (
            <Row columns={NAME_DEPTH_COLUMNS}>
              {(column) => (
                <Cell>
                  {column.key === "name"
                    ? boat.name
                    : `${String(boat.depth)} ${unit}`}
                </Cell>
              )}
            </Row>
          );
        const tree = (unit: string): ReactElement =>
          panel(
            keyedBoatGrid((key) => ({ numeric: numeric && key === "depth" }), {
              renderRow: functionDepthRow(unit),
              virtualize,
            }),
          );
        const view = render(tree("m"));
        expect(depths(view.container)).toContain("12 m");

        view.rerender(tree("ft"));

        expectEveryDepthIn(view.container, "ft");
      },
    );

    it("keeps a row's own dependency list one length as decoration comes and goes", () => {
      // React compares a changed-size dependency list by its common prefix and
      // reports the change, so the grid's entries must not come and go.
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const renderRow = (boat: Boat): ReactElement<RowProps<Boat>> =>
        renderKeyedBoatRow(boat, { dependencies: [boat.depth] });
      const tree = (numeric: boolean): ReactElement =>
        panel(
          keyedBoatGrid((key) => ({ numeric: numeric && key === "depth" }), {
            renderRow,
          }),
        );
      const view = render(tree(false));
      view.rerender(tree(true));
      view.rerender(tree(false));

      expect(callsMentioning(error, "changed size between")).toEqual([]);
      expect(cellAt(rowAt(view.container, 0), 1)).not.toHaveAttribute(
        "data-snui-numeric",
      );
    });

    it("carries a column option change to cells over the same items", () => {
      // The numeric column keeps the grid decorating on both renders, so the
      // only change is the options themselves.
      const tree = (nameWrap: boolean, depthWidth: number): ReactElement =>
        panel(
          <DataGrid aria-label="Boats" items={BOATS} renderRow={renderBoatRow}>
            <Column id="name" wrap={nameWrap}>
              Name
            </Column>
            <Column id="depth" numeric width={depthWidth}>
              Depth
            </Column>
          </DataGrid>,
        );
      const view = render(tree(false, 48));
      expect(cellAt(rowAt(view.container, 0), 0)).not.toHaveAttribute(
        "data-snui-wrap",
      );

      view.rerender(tree(true, 64));

      const firstRow = rowAt(view.container, 0);
      expect(cellAt(firstRow, 0)).toHaveAttribute("data-snui-wrap", "");
      expect(
        cellAt(firstRow, 1).style.getPropertyValue(
          "--snui-data-grid-column-min",
        ),
      ).toBe("64px");
    });

    it("carries a column option change to cells a row renders from a function", () => {
      const tree = (nameWrap: boolean): ReactElement =>
        panel(
          keyedBoatGrid((key) => ({
            numeric: key === "depth",
            wrap: key === "name" && nameWrap,
          })),
        );
      const view = render(tree(false));
      expect(cellAt(rowAt(view.container, 0), 0)).not.toHaveAttribute(
        "data-snui-wrap",
      );

      view.rerender(tree(true));

      expect(cellAt(rowAt(view.container, 0), 0)).toHaveAttribute(
        "data-snui-wrap",
        "",
      );
      expect(cellAt(rowAt(view.container, 0), 1)).toHaveAttribute(
        "data-snui-numeric",
        "",
      );
    });

    it.each(["never", "always"] as const)(
      "keeps cached rows for a stable renderRow and equal columns written afresh (virtualize %s)",
      (virtualize) => {
        const renderRow = vi.fn(renderBoatRow);
        // A static header is new JSX on every parent render, so the grid must
        // compare the options it carries rather than the elements.
        const tree = (): ReactElement =>
          panel(
            <DataGrid
              aria-label="Boats"
              items={BOATS}
              renderRow={renderRow}
              virtualize={virtualize}
            >
              <Column id="name" wrap>
                Name
              </Column>
              <Column id="depth" numeric width={64}>
                Depth
              </Column>
            </DataGrid>,
          );
        const view = render(tree());
        const afterMount = renderRow.mock.calls.length;
        expect(afterMount).toBeGreaterThan(0);

        view.rerender(tree());

        expect(renderRow).toHaveBeenCalledTimes(afterMount);
      },
    );
  });

  describe("the cell that holds focus", () => {
    const fleet = boatFleet(12);

    /**
     * A body row by its position in the data. The virtualizer may place a
     * rebuilt row's element anywhere among the rendered ones, so the row is
     * found by its row index (the header row is 1) rather than DOM order.
     */
    function dataRow(container: HTMLElement, index: number): HTMLElement {
      const row = container.querySelector<HTMLElement>(
        `.snui-data-grid__body [role="row"][aria-rowindex="${String(index + 2)}"]`,
      );
      if (row === null) throw new Error(`no row at ${String(index)}`);
      return row;
    }

    /** The boats renderRow was asked to render since the spy was cleared. */
    function renderedBoats(renderRow: ReturnType<typeof vi.fn>): string[] {
      return renderRow.mock.calls.map(([boat]) => (boat as Boat).name);
    }

    it("rebuilds the rows focus enters and leaves, so the virtualizer measures them again", async () => {
      // A virtualized cell unwraps its whole value while it holds keyboard
      // focus. The virtualizer measures a row only when the row is built
      // anew, so the rows focus moves between are rebuilt and no other.
      const user = userEvent.setup();
      const renderRow = vi.fn(renderBoatRow);
      const { container } = renderGrid({
        items: fleet,
        renderRow,
        virtualize: "always",
      });
      const first = dataRow(container, 0);
      first.focus();
      renderRow.mockClear();

      await user.keyboard("{ArrowRight}");
      expect(cellAt(dataRow(container, 0), 0)).toHaveFocus();
      expect(renderedBoats(renderRow)).toEqual(["Boat 0"]);

      renderRow.mockClear();
      await user.keyboard("{ArrowRight}");
      expect(cellAt(dataRow(container, 0), 1)).toHaveFocus();
      // Another cell of the same row reveals another value.
      expect(renderedBoats(renderRow)).toEqual(["Boat 0"]);

      renderRow.mockClear();
      await user.keyboard("{ArrowDown}");
      expect(cellAt(dataRow(container, 1), 1)).toHaveFocus();
      // Here the virtualizer hands the focused element to the next row
      // without a focus event, which the look after the key catches.
      expect(renderedBoats(renderRow).sort()).toEqual(["Boat 0", "Boat 1"]);

      renderRow.mockClear();
      await user.tab();
      expect(container.querySelector(".snui-data-grid")).not.toContainElement(
        document.activeElement as HTMLElement,
      );
      expect(renderedBoats(renderRow)).toEqual(["Boat 1"]);
    });

    it("still rebuilds the row focus leaves after the items change under it", async () => {
      // A parent that builds items inline hands the grid a new array, which
      // rebuilds every row, the focused one while its cell is unwrapped. The
      // focused cell has to outlive that, or the row it later leaves keeps
      // the tall height it was measured at.
      const user = userEvent.setup();
      const renderRow = vi.fn(renderBoatRow);
      const grid = (items: readonly Boat[]) =>
        panel(boatGrid({ items, renderRow, virtualize: "always" }));
      const { container, rerender } = render(grid(fleet));
      dataRow(container, 0).focus();
      await user.keyboard("{ArrowRight}");
      expect(cellAt(dataRow(container, 0), 0)).toHaveFocus();

      rerender(grid([...fleet]));
      expect(cellAt(dataRow(container, 0), 0)).toHaveFocus();
      renderRow.mockClear();
      await user.keyboard("{ArrowDown}");

      expect(cellAt(dataRow(container, 1), 0)).toHaveFocus();
      expect(renderedBoats(renderRow).sort()).toEqual(["Boat 0", "Boat 1"]);
    });

    it("rebuilds nothing when the grid does not virtualize", async () => {
      const user = userEvent.setup();
      const renderRow = vi.fn(renderBoatRow);
      const { container } = renderGrid({
        items: fleet,
        renderRow,
        virtualize: "never",
      });
      rowAt(container, 0).focus();
      renderRow.mockClear();

      await user.keyboard("{ArrowRight}");
      await user.keyboard("{ArrowDown}");

      expect(renderRow).not.toHaveBeenCalled();
    });
  });
});
