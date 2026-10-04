import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement, StrictMode, useState } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";
import {
  Cell,
  Column,
  DataGrid,
  type DataGridColumnProps,
  Row,
  type Selection,
  type SortDescriptor,
} from "../../src/data-grid.js";
import { PanelRoot } from "../../src/index.js";
import {
  CONTROL_SURFACE_DECLARATIONS,
  FOCUS_RING_WIDTH,
  focusRingDeclarations,
} from "../../src/styles/fragments.js";
import { TABLE_STYLES } from "../../src/styles/table.js";
import { ruleBody } from "../css-helpers.js";
import { panel, renderInPanel } from "../helpers.js";
import {
  BOATS,
  type Boat,
  boatColumns,
  boatGrid,
  bodyRows,
  cellAt,
  type GridOverrides,
  NAME_DEPTH_COLUMNS,
  renderBoatRow,
  renderGrid,
  rowAt,
  rowNames,
} from "./lib/data-grid-fixture.js";

/** A header column drawn through a consumer component rather than the package Column. */
function WrappedColumn(props: DataGridColumnProps): ReactElement {
  return <Column {...props} />;
}

function lastSelection(
  onSelectionChange: Mock<(keys: Selection) => void>,
): Selection {
  const lastCall = onSelectionChange.mock.calls.at(-1);
  if (lastCall === undefined) {
    throw new Error("Expected onSelectionChange to have been called.");
  }
  return lastCall[0];
}

describe("DataGrid", () => {
  describe("accessible name", () => {
    it("throws when neither aria-label nor aria-labelledby resolves", () => {
      expect(() =>
        renderInPanel(
          <DataGrid items={BOATS} renderRow={renderBoatRow}>
            {boatColumns()}
          </DataGrid>,
        ),
      ).toThrow(
        "signalk-nearlcrews-ui: DataGrid requires an accessible name: pass a non-empty caption, aria-label, or aria-labelledby.",
      );

      expect(() => renderGrid({ "aria-label": "  " })).toThrow(
        "signalk-nearlcrews-ui: DataGrid requires an accessible name: pass a non-empty caption, aria-label, or aria-labelledby.",
      );
    });

    it("names the grid by its caption, visible or hidden", () => {
      const { container } = renderInPanel(
        <DataGrid caption="Fleet" items={BOATS} renderRow={renderBoatRow}>
          {boatColumns()}
        </DataGrid>,
      );

      expect(screen.getByRole("grid", { name: "Fleet" })).toBeInTheDocument();
      const caption = container.querySelector(".snui-data-grid__caption");
      expect(caption).toHaveTextContent("Fleet");
      expect(caption).not.toHaveClass("snui-data-grid__caption--hidden");

      renderInPanel(
        <DataGrid
          caption="Sources"
          captionVisibility="hidden"
          items={BOATS}
          renderRow={renderBoatRow}
        >
          {boatColumns()}
        </DataGrid>,
      );

      expect(screen.getByRole("grid", { name: "Sources" })).toBeInTheDocument();
      expect(screen.getByText("Sources")).toHaveClass(
        "snui-data-grid__caption--hidden",
      );
    });

    it("reads the caption after a consumer's own aria-labelledby", () => {
      renderInPanel(
        <>
          <h2 id="grid-heading">Fleet</h2>
          <DataGrid
            aria-labelledby="grid-heading"
            caption="at anchor"
            items={BOATS}
            renderRow={renderBoatRow}
          >
            {boatColumns()}
          </DataGrid>
        </>,
      );

      expect(
        screen.getByRole("grid", { name: "Fleet at anchor" }),
      ).toBeInTheDocument();
    });

    it("accepts aria-labelledby as the accessible name", () => {
      renderInPanel(
        <>
          <h2 id="grid-heading">Fleet</h2>
          <DataGrid
            aria-labelledby="grid-heading"
            items={BOATS}
            renderRow={renderBoatRow}
          >
            {boatColumns()}
          </DataGrid>
        </>,
      );

      expect(screen.getByRole("grid", { name: "Fleet" })).toBeInTheDocument();
    });
  });

  describe("rendering", () => {
    it("renders columns and rows from items", () => {
      const { container } = renderGrid();

      const grid = screen.getByRole("grid", { name: "Boats" });
      expect(grid.tagName).toBe("TABLE");
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Depth" }),
      ).toBeInTheDocument();
      expect(bodyRows(container)).toHaveLength(BOATS.length);
      expect(rowNames(container)).toEqual(["Aster", "Brine", "Coral", "Drift"]);
    });

    it("supports a dynamic header through columns and function children", () => {
      renderInPanel(
        <DataGrid
          aria-label="Boats"
          columns={[{ key: "name" }, { key: "depth" }]}
          items={BOATS}
          renderRow={renderBoatRow}
        >
          {(column) => <Column id={column.key}>{column.key}</Column>}
        </DataGrid>,
      );

      expect(
        screen.getByRole("columnheader", { name: "name" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "depth" }),
      ).toBeInTheDocument();
    });

    it("replays a readonly column array across StrictMode renders", () => {
      const columns = Object.freeze([{ key: "name" }, { key: "depth" }]);
      render(
        <StrictMode>
          <PanelRoot>
            <DataGrid
              aria-label="Boats"
              columns={columns}
              items={BOATS}
              renderRow={renderBoatRow}
            >
              {(column) => <Column id={column.key}>{column.key}</Column>}
            </DataGrid>
          </PanelRoot>
        </StrictMode>,
      );

      expect(
        screen.getByRole("columnheader", { name: "name" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "depth" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("rowheader", { name: "Aster" }),
      ).toBeInTheDocument();
    });

    it("rejects non-array iterables before acquiring them", () => {
      let acquisitions = 0;
      const invalidColumns: Iterable<{ readonly key: string }> = {
        [Symbol.iterator]() {
          acquisitions += 1;
          return [{ key: "name" }, { key: "depth" }][Symbol.iterator]();
        },
      };

      expect(() =>
        render(
          <PanelRoot>
            <DataGrid
              aria-label="Boats"
              columns={
                invalidColumns as unknown as readonly { readonly key: string }[]
              }
              items={BOATS}
              renderRow={renderBoatRow}
            >
              {(column) => <Column id={column.key}>{column.key}</Column>}
            </DataGrid>
          </PanelRoot>,
        ),
      ).toThrow(
        "signalk-nearlcrews-ui: DataGrid columns must be an array; received a plain object. Pass a readonly array and replace it when the columns change.",
      );
      expect(acquisitions).toBe(0);
    });

    it("names the kind of value it received in place of the columns", () => {
      const columns = new Set([{ key: "name" }]);
      expect(() =>
        render(
          <PanelRoot>
            <DataGrid
              aria-label="Boats"
              columns={
                columns as unknown as readonly { readonly key: string }[]
              }
              items={BOATS}
              renderRow={renderBoatRow}
            >
              {(column) => <Column id={column.key}>{column.key}</Column>}
            </DataGrid>
          </PanelRoot>,
        ),
      ).toThrow(
        "signalk-nearlcrews-ui: DataGrid columns must be an array; received a Set. Pass a readonly array and replace it when the columns change.",
      );
    });

    it("renders a replacement column array after commit", () => {
      const tree = (
        columns: readonly { readonly key: string }[],
      ): ReactElement => (
        <PanelRoot>
          <DataGrid
            aria-label="Boats"
            columns={columns}
            items={[] as readonly Boat[]}
            renderRow={renderBoatRow}
          >
            {(column) => <Column id={column.key}>{column.key}</Column>}
          </DataGrid>
        </PanelRoot>
      );
      const view = render(tree([{ key: "name" }]));

      view.rerender(tree([{ key: "name" }, { key: "depth" }]));

      expect(
        screen.getByRole("columnheader", { name: "depth" }),
      ).toBeInTheDocument();
    });

    it("applies density, zebra, className, style, and id", () => {
      const { container } = renderGrid({
        className: "fleet-grid",
        density: "compact",
        id: "fleet",
        style: { maxHeight: "20rem" },
        zebra: true,
      });

      const region = container.querySelector(".snui-data-grid");
      expect(region).toHaveClass(
        "snui-data-grid--compact",
        "snui-data-grid--zebra",
        "fleet-grid",
      );
      expect(region).toHaveAttribute("id", "fleet");
      expect((region as HTMLElement).style.maxHeight).toBe("20rem");
    });

    it("pins Column width through style and suppresses the RAC width warning", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      renderInPanel(
        <DataGrid aria-label="Boats" items={BOATS} renderRow={renderBoatRow}>
          <Column id="name" width={120}>
            Name
          </Column>
          <Column id="depth" width="20%">
            Depth
          </Column>
        </DataGrid>,
      );

      expect(
        screen.getByRole("columnheader", { name: "Name" }).style.width,
      ).toBe("120px");
      expect(
        screen.getByRole("columnheader", { name: "Depth" }).style.width,
      ).toBe("20%");
      const widthWarnings = warn.mock.calls.filter((args) =>
        args.some(
          (arg) =>
            typeof arg === "string" && arg.includes("ResizableTableContainer"),
        ),
      );
      expect(widthWarnings).toEqual([]);
    });

    it("passes the props it does not own to the container", () => {
      const { container } = renderGrid({
        "aria-describedby": "grid-note",
        "data-testid": "fleet-grid",
      } as GridOverrides);

      const region = container.querySelector(".snui-data-grid");
      expect(region).toHaveAttribute("aria-describedby", "grid-note");
      expect(region).toHaveAttribute("data-testid", "fleet-grid");
    });

    it("forwards ref to the stable outer container", () => {
      const ref = createRef<HTMLDivElement>();
      renderGrid({ ref });

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("DIV");
      expect(ref.current).toHaveClass("snui-data-grid");
      expect(ref.current?.querySelector("[role='grid']")).toBeInTheDocument();
    });
  });

  describe("column options", () => {
    it("marks a numeric column's header and cells for end alignment", () => {
      const { container } = renderInPanel(
        <DataGrid aria-label="Boats" items={BOATS} renderRow={renderBoatRow}>
          <Column id="name">Name</Column>
          <Column id="depth" numeric>
            Depth
          </Column>
        </DataGrid>,
      );

      expect(
        screen.getByRole("columnheader", { name: "Depth" }),
      ).toHaveAttribute("data-snui-numeric", "");
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).not.toHaveAttribute("data-snui-numeric");
      for (const row of bodyRows(container)) {
        expect(cellAt(row, 0)).not.toHaveAttribute("data-snui-numeric");
        expect(cellAt(row, 1)).toHaveAttribute("data-snui-numeric", "");
      }
    });

    it("leaves rows untouched when no column asks for anything", () => {
      const { container } = renderGrid();

      expect(bodyRows(container)).toHaveLength(BOATS.length);
      for (const row of bodyRows(container)) {
        for (const index of [0, 1]) {
          const cell = cellAt(row, index);
          expect(cell).not.toHaveAttribute("data-snui-numeric");
          expect(cell).not.toHaveAttribute("data-snui-wrap");
          expect(
            cell.style.getPropertyValue("--snui-data-grid-column-min"),
          ).toBe("");
        }
      }
    });

    it("applies column options through a dynamic header", () => {
      const columns = [
        { key: "name", numeric: false },
        { key: "depth", numeric: true },
      ] as const;
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          columns={columns}
          items={BOATS}
          renderRow={renderBoatRow}
        >
          {(column) => (
            <Column id={column.key} numeric={column.numeric}>
              {column.key}
            </Column>
          )}
        </DataGrid>,
      );

      expect(
        screen.getByRole("columnheader", { name: "depth" }),
      ).toHaveAttribute("data-snui-numeric", "");
      expect(cellAt(rowAt(container, 0), 1)).toHaveAttribute(
        "data-snui-numeric",
        "",
      );
      expect(cellAt(rowAt(container, 0), 0)).not.toHaveAttribute(
        "data-snui-numeric",
      );
    });

    it("decorates cells wrapped in a fragment and keeps the count", () => {
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          items={BOATS}
          renderRow={(boat) => (
            <Row>
              <Cell>{boat.name}</Cell>
              <>
                <Cell>{boat.depth}</Cell>
                <Cell>{boat.name} berth</Cell>
              </>
            </Row>
          )}
        >
          <Column id="name">Name</Column>
          <Column id="depth" numeric>
            Depth
          </Column>
          <Column id="berth" wrap>
            Berth
          </Column>
        </DataGrid>,
      );

      const firstRow = rowAt(container, 0);
      expect(cellAt(firstRow, 1)).toHaveAttribute("data-snui-numeric", "");
      expect(cellAt(firstRow, 2)).toHaveAttribute("data-snui-wrap", "");
      expect(cellAt(firstRow, 2)).not.toHaveAttribute("data-snui-numeric");
    });

    it("keeps later columns aligned when a header child is not the package Column", () => {
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          items={BOATS}
          renderRow={(boat) => (
            <Row>
              <Cell>{boat.name}</Cell>
              <Cell>{boat.depth}</Cell>
              <Cell>{boat.name} berth</Cell>
            </Row>
          )}
        >
          <Column id="name">Name</Column>
          <WrappedColumn id="depth" numeric>
            Depth
          </WrappedColumn>
          <Column id="berth" wrap>
            Berth
          </Column>
        </DataGrid>,
      );

      const firstRow = rowAt(container, 0);
      expect(cellAt(firstRow, 1)).toHaveAttribute("data-snui-numeric", "");
      expect(cellAt(firstRow, 2)).toHaveAttribute("data-snui-wrap", "");
      expect(cellAt(firstRow, 2)).not.toHaveAttribute("data-snui-numeric");
    });

    it("lowers the cell width floor for a column pinned narrower", () => {
      const { container } = renderInPanel(
        <DataGrid aria-label="Boats" items={BOATS} renderRow={renderBoatRow}>
          <Column id="name">Name</Column>
          <Column id="depth" width={48}>
            Depth
          </Column>
        </DataGrid>,
      );

      const depthCell = cellAt(rowAt(container, 0), 1);
      expect(
        depthCell.style.getPropertyValue("--snui-data-grid-column-min"),
      ).toBe("48px");
      expect(
        cellAt(rowAt(container, 0), 0).style.getPropertyValue(
          "--snui-data-grid-column-min",
        ),
      ).toBe("");
    });

    it("applies column options to dynamic cells keyed by column", () => {
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          columns={NAME_DEPTH_COLUMNS}
          items={BOATS}
          renderRow={(boat) => (
            <Row columns={NAME_DEPTH_COLUMNS}>
              {(column) => (
                <Cell>{column.key === "name" ? boat.name : boat.depth}</Cell>
              )}
            </Row>
          )}
        >
          {(column) => (
            <Column id={column.key} numeric={column.key === "depth"}>
              {column.key}
            </Column>
          )}
        </DataGrid>,
      );

      expect(cellAt(rowAt(container, 0), 1)).toHaveAttribute(
        "data-snui-numeric",
        "",
      );
      expect(cellAt(rowAt(container, 0), 0)).not.toHaveAttribute(
        "data-snui-numeric",
      );
    });

    it("keys dynamic column options to the entry each column was rendered from", () => {
      // A column the render function draws through its own component still
      // holds its slot, so the columns after it read their keys from the
      // entries they were rendered from.
      const columns = [{ key: "name" }, { key: "note" }, { key: "depth" }];
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          columns={columns}
          items={BOATS}
          renderRow={(boat) => (
            <Row columns={columns}>
              {(column) => (
                <Cell>
                  {column.key === "name"
                    ? boat.name
                    : column.key === "note"
                      ? "at anchor"
                      : boat.depth}
                </Cell>
              )}
            </Row>
          )}
        >
          {(column) =>
            column.key === "note" ? (
              <WrappedColumn>{column.key}</WrappedColumn>
            ) : (
              <Column numeric={column.key === "depth"}>{column.key}</Column>
            )
          }
        </DataGrid>,
      );

      expect(cellAt(rowAt(container, 0), 2)).toHaveAttribute(
        "data-snui-numeric",
        "",
      );
      expect(cellAt(rowAt(container, 0), 1)).not.toHaveAttribute(
        "data-snui-numeric",
      );
      expect(cellAt(rowAt(container, 0), 0)).not.toHaveAttribute(
        "data-snui-numeric",
      );
    });
  });

  describe("sorting", () => {
    // RAC Table has no defaultSortDescriptor: sorting is controlled only, so
    // the harness owns the descriptor and the sorted items.
    function SortableGrid(): ReactElement {
      const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
      });
      const byDepth = sortDescriptor.column === "depth";
      const sign = sortDescriptor.direction === "ascending" ? 1 : -1;
      const sorted = [...BOATS].sort(
        (a, b) =>
          sign * (byDepth ? a.depth - b.depth : a.name.localeCompare(b.name)),
      );
      return panel(
        boatGrid({
          items: sorted,
          onSortChange: setSortDescriptor,
          sortDescriptor,
        }),
      );
    }

    it("marks the sorted column with aria-sort and a direction attribute", () => {
      render(<SortableGrid />);

      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toHaveAttribute("aria-sort", "ascending");
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toHaveAttribute("data-sort-direction", "ascending");
      expect(
        screen.getByRole("columnheader", { name: "Depth" }),
      ).toHaveAttribute("aria-sort", "none");
    });

    it("toggles direction on the sorted column and reorders rows", async () => {
      const user = userEvent.setup();
      const { container } = render(<SortableGrid />);

      expect(rowNames(container)).toEqual(["Aster", "Brine", "Coral", "Drift"]);

      await user.click(screen.getByRole("columnheader", { name: "Name" }));

      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toHaveAttribute("aria-sort", "descending");
      expect(rowNames(container)).toEqual(["Drift", "Coral", "Brine", "Aster"]);
    });

    it("switches columns in ascending order first", async () => {
      const user = userEvent.setup();
      const { container } = render(<SortableGrid />);

      await user.click(screen.getByRole("columnheader", { name: "Depth" }));

      expect(
        screen.getByRole("columnheader", { name: "Depth" }),
      ).toHaveAttribute("aria-sort", "ascending");
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toHaveAttribute("aria-sort", "none");
      expect(rowNames(container)).toEqual(["Brine", "Drift", "Aster", "Coral"]);
    });

    it("reports the descriptor through onSortChange", async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();
      renderGrid({ onSortChange });

      await user.click(screen.getByRole("columnheader", { name: "Depth" }));

      expect(onSortChange).toHaveBeenCalledWith({
        column: "depth",
        direction: "ascending",
      });
    });
  });

  describe("empty state", () => {
    it("renders the default EmptyState with the default title", () => {
      const { container } = renderGrid({ items: [] });

      expect(screen.getByText("Nothing to show yet")).toBeInTheDocument();
      expect(container.querySelector(".snui-empty-state")).not.toBeNull();
    });

    it("renders an emptyDescription under the default title", () => {
      renderGrid({
        emptyDescription: "Add a source to see rows here.",
        items: [],
      });

      expect(
        screen.getByText("Add a source to see rows here."),
      ).toBeInTheDocument();
    });

    it("uses a custom emptyTitle", () => {
      renderGrid({ emptyTitle: "No boats underway", items: [] });

      expect(screen.getByText("No boats underway")).toBeInTheDocument();
    });

    it("renders a custom emptyState instead of the default", () => {
      const { container } = renderGrid({
        emptyState: <p>Nothing on the chart</p>,
        items: [],
      });

      expect(screen.getByText("Nothing on the chart")).toBeInTheDocument();
      expect(container.querySelector(".snui-empty-state")).toBeNull();
    });

    it("keeps EmptyState's empty-title throw", () => {
      expect(() => renderGrid({ emptyTitle: " ", items: [] })).toThrow(
        "signalk-nearlcrews-ui: EmptyState requires a non-empty title.",
      );
    });

    it("reads a blank bundle title as absent and shows the default", () => {
      // A partial translation leaves the rest in English rather than taking
      // the panel down the first time the grid is empty.
      renderInPanel(boatGrid({ items: [] }), {
        labels: { dataGrid: { emptyTitle: "   " } },
      });

      expect(screen.getByText("Nothing to show yet")).toBeInTheDocument();
    });

    it("prefers the caller's title to the bundle's", () => {
      renderInPanel(boatGrid({ emptyTitle: "No boats underway", items: [] }), {
        labels: { dataGrid: { emptyTitle: "Nog niets te tonen" } },
      });

      expect(screen.getByText("No boats underway")).toBeInTheDocument();
      expect(screen.queryByText("Nog niets te tonen")).toBeNull();
    });
  });

  describe("selection", () => {
    function selectedIds(selection: Selection): string[] {
      return selection === "all" ? ["all"] : [...selection].map(String).sort();
    }

    it("selects a single row and reports the keys", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn<(keys: Selection) => void>();
      const { container } = renderGrid({
        onSelectionChange,
        selectionMode: "single",
      });

      await user.click(rowAt(container, 1));

      expect(onSelectionChange).toHaveBeenCalled();
      expect(selectedIds(lastSelection(onSelectionChange))).toEqual(["b"]);
      expect(rowAt(container, 1)).toHaveAttribute("aria-selected", "true");
      expect(rowAt(container, 1)).toHaveAttribute("data-selected");
    });

    it("replaces the selection in single mode", async () => {
      const user = userEvent.setup();
      const { container } = renderGrid({
        defaultSelectedKeys: ["a"],
        selectionMode: "single",
      });

      expect(rowAt(container, 0)).toHaveAttribute("aria-selected", "true");

      await user.click(rowAt(container, 2));

      expect(rowAt(container, 0)).toHaveAttribute("aria-selected", "false");
      expect(rowAt(container, 2)).toHaveAttribute("aria-selected", "true");
    });

    it("accumulates plain clicks in multiple mode", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn<(keys: Selection) => void>();
      const { container } = renderGrid({
        onSelectionChange,
        selectionMode: "multiple",
      });

      await user.click(rowAt(container, 0));
      await user.click(rowAt(container, 2));

      expect(selectedIds(lastSelection(onSelectionChange))).toEqual(["a", "c"]);
      expect(rowAt(container, 0)).toHaveAttribute("aria-selected", "true");
      expect(rowAt(container, 2)).toHaveAttribute("aria-selected", "true");
    });

    it("extends a range with Shift click in multiple mode", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn<(keys: Selection) => void>();
      const { container } = renderGrid({
        onSelectionChange,
        selectionMode: "multiple",
      });

      await user.click(rowAt(container, 1));
      await user.keyboard("{Shift>}");
      await user.click(rowAt(container, 3));
      await user.keyboard("{/Shift}");

      expect(selectedIds(lastSelection(onSelectionChange))).toEqual([
        "b",
        "c",
        "d",
      ]);
      for (const index of [1, 2, 3]) {
        expect(rowAt(container, index)).toHaveAttribute(
          "aria-selected",
          "true",
        );
      }
    });

    it("supports controlled selectedKeys", () => {
      const { container } = renderGrid({
        selectedKeys: ["b", "d"],
        selectionMode: "multiple",
      });

      expect(rowAt(container, 1)).toHaveAttribute("aria-selected", "true");
      expect(rowAt(container, 3)).toHaveAttribute("aria-selected", "true");
      expect(rowAt(container, 0)).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("grid semantics", () => {
    it("honors an explicit isRowHeader instead of defaulting the first column", () => {
      const { container } = renderInPanel(
        <DataGrid aria-label="Boats" items={BOATS} renderRow={renderBoatRow}>
          <Column id="name">Name</Column>
          <Column id="depth" isRowHeader>
            Depth
          </Column>
        </DataGrid>,
      );

      const firstRow = rowAt(container, 0);
      expect(cellAt(firstRow, 0)).toHaveAttribute("role", "gridcell");
      expect(cellAt(firstRow, 1)).toHaveAttribute("role", "rowheader");
    });

    it("honors an explicit isRowHeader in a dynamic header instead of defaulting the first column", () => {
      const { container } = renderInPanel(
        <DataGrid
          aria-label="Boats"
          columns={NAME_DEPTH_COLUMNS}
          items={BOATS}
          renderRow={renderBoatRow}
        >
          {(column) =>
            column.key === "depth" ? (
              <Column id="depth" isRowHeader>
                Depth
              </Column>
            ) : (
              <Column id={column.key}>Name</Column>
            )
          }
        </DataGrid>,
      );

      const firstRow = rowAt(container, 0);
      expect(cellAt(firstRow, 0)).toHaveAttribute("role", "gridcell");
      expect(cellAt(firstRow, 1)).toHaveAttribute("role", "rowheader");
    });

    it.each([
      [
        "a wrapper component draws",
        (key: string) => <WrappedColumn id={key}>{key}</WrappedColumn>,
      ],
      [
        "the consumer opted out of",
        (key: string) => (
          <Column id={key} isRowHeader={false}>
            {key}
          </Column>
        ),
      ],
    ])(
      "defaults the first column of a dynamic header that %s",
      (_case, renderColumn) => {
        const { container } = renderInPanel(
          <DataGrid
            aria-label="Boats"
            columns={NAME_DEPTH_COLUMNS}
            items={BOATS}
            renderRow={renderBoatRow}
          >
            {(column) => renderColumn(column.key)}
          </DataGrid>,
        );

        const firstRow = rowAt(container, 0);
        expect(cellAt(firstRow, 0)).toHaveAttribute("role", "rowheader");
        expect(cellAt(firstRow, 1)).toHaveAttribute("role", "gridcell");
      },
    );

    it("exposes explicit roles on rows, cells, and header", () => {
      const { container } = renderGrid();

      expect(container.querySelector("thead")).toHaveAttribute(
        "role",
        "rowgroup",
      );
      expect(container.querySelector("tbody")).toHaveAttribute(
        "role",
        "rowgroup",
      );
      for (const row of bodyRows(container)) {
        expect(row).toHaveAttribute("role", "row");
        // The first column defaults to the row header.
        expect(cellAt(row, 0)).toHaveAttribute("role", "rowheader");
        expect(cellAt(row, 1)).toHaveAttribute("role", "gridcell");
      }
      expect(
        within(container.querySelector("thead") as HTMLElement).getAllByRole(
          "columnheader",
        ),
      ).toHaveLength(2);
    });
  });
});

describe("data grid style module", () => {
  it("keeps the control boundary on the grid, a focusable scroll region", () => {
    // Container outlines step back to the subtle border; the grid's edge is
    // the only boundary of something the keyboard operates, so it keeps the
    // 3:1 one.
    expect(ruleBody(TABLE_STYLES.styles, ".snui-data-grid")).toContain(
      CONTROL_SURFACE_DECLARATIONS,
    );
  });

  it("draws the header and row separators with the subtle border", () => {
    for (const cell of [
      '.snui-data-grid__header :is(th, [role="columnheader"])',
      '.snui-data-grid__body :is(td, [role="rowheader"], [role="gridcell"])',
    ]) {
      expect(ruleBody(TABLE_STYLES.styles, cell)).toContain(
        "border-block-end: 1px solid var(--snui-color-border-subtle);",
      );
    }
    expect(TABLE_STYLES.styles).not.toContain(
      "border-block-end: 1px solid var(--snui-color-border);",
    );
  });

  /**
   * The selectors of every rule in the module that declares `declaration`,
   * read from the shipped text, so a spec can run them against a rendered
   * grid the way the browser would.
   */
  function selectorsDeclaring(declaration: string): string[] {
    const selectors: string[] = [];
    for (const chunk of TABLE_STYLES.styles.split("}")) {
      const open = chunk.lastIndexOf("{");
      if (open === -1 || !chunk.slice(open).includes(declaration)) continue;
      const before = chunk.slice(0, open);
      selectors.push(
        before
          .slice(before.lastIndexOf("{") + 1)
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .trim(),
      );
    }
    expect(selectors, `no rule declares ${declaration}`).not.toHaveLength(0);
    return selectors;
  }

  it.each([
    ["never", "default"],
    ["always", "default"],
    ["never", "compact"],
    ["always", "compact"],
  ] as const)(
    "draws the selection bar in the first column only (virtualize %s, %s density)",
    (virtualize, density) => {
      // A virtualized grid wraps every cell in an element of its own, so a
      // cell there is always its parent's first child: the first column is
      // named by its index instead.
      const [, selected] = BOATS;
      if (selected === undefined) throw new Error("expected a second boat");
      const { container } = renderInPanel(
        boatGrid({
          defaultSelectedKeys: [selected.id],
          density,
          items: BOATS,
          selectionMode: "multiple",
          virtualize,
        }),
      );
      const rows = bodyRows(container);
      const firstColumn = (element: Element): boolean =>
        element.getAttribute("aria-colindex") === "1" ||
        element.getAttribute("data-column-index") === "0";
      // A rule that paints a pseudo-element is matched through the cell it
      // hangs from.
      const matches = (declaration: string): Element[] =>
        selectorsDeclaring(declaration).flatMap((selector) => [
          ...container.querySelectorAll(selector.replace(/::before$/, "")),
        ]);

      // The bar's width is added to the first column's inset once per row,
      // the header row included, so selecting a row paints the bar without
      // moving the row's text. Each density adds it to its own inset. A
      // default grid matches only the default inset; a compact grid matches
      // both, because the default inset's selector names no density, and the
      // browser spec reads the compact inset winning that cascade.
      const [defaultInset, compactInset] = [
        "padding-inline-start: calc(var(--snui-space-3) + 0.3rem);",
        "padding-inline-start: calc(var(--snui-space-2) + 0.3rem);",
      ].map(matches);
      const [ownInset, otherInset] =
        density === "compact"
          ? [compactInset, defaultInset]
          : [defaultInset, compactInset];
      expect(ownInset?.every(firstColumn)).toBe(true);
      expect(ownInset).toHaveLength(rows.length + 1);
      if (density === "default") expect(otherInset).toHaveLength(0);

      // Only the selected row paints it, in its first cell, in the accent
      // and under forced colors alike.
      for (const paint of [
        "border-inline-start: 0.3rem solid var(--snui-color-accent-fill);",
        "border-inline-start-color: HighlightText;",
      ]) {
        // Every match counts, so a paint that reached a header cell too
        // would fail here rather than be filtered away.
        const [cell, ...others] = matches(paint);
        expect(others, paint).toHaveLength(0);
        if (cell === undefined) throw new Error(`nothing matches ${paint}`);
        expect(firstColumn(cell)).toBe(true);
        expect(cell.closest('[role="row"]')).toHaveAttribute(
          "aria-selected",
          "true",
        );
      }
    },
  );

  it("draws the selection bar on a pseudo-element, so separators start at the edge", () => {
    // A reserved inline-start border on the cell mitres against the one-pixel
    // row separator and fades its first few pixels in, so no cell draws one:
    // the bar is a pseudo-element over the cell's own inset. It is drawn as
    // that pseudo-element's border, which snaps to whole pixels the way the
    // Banner, Card, and Toast tone bars do, so the widths match.
    const leadingBorders = selectorsDeclaring("border-inline-start");
    expect(
      leadingBorders.every((selector) => selector.endsWith("::before")),
    ).toBe(true);
    const bar = ruleBody(
      TABLE_STYLES.styles,
      '.snui-data-grid__body [role="row"][data-selected] :is(td, [role="rowheader"], [role="gridcell"])[data-column-index="0"]::before',
    );
    // Out of flow and spanning the cell, so it shows without moving text.
    expect(bar).toContain("position: absolute;");
    expect(bar).toContain("inset-block: 0;");
    expect(bar).toContain("inset-inline-start: 0;");
    expect(bar).toContain(
      "border-inline-start: 0.3rem solid var(--snui-color-accent-fill);",
    );
    expect(bar).not.toMatch(/inline-size|background/);

    // A row that holds keyboard focus paints its ring in the band just inside
    // its edge, and the bar steps inside that band so the ring stays whole.
    const insideRing = ruleBody(
      TABLE_STYLES.styles,
      '.snui-data-grid__body [role="row"][data-selected][data-focus-visible] :is(td, [role="rowheader"], [role="gridcell"])[data-column-index="0"]::before',
    );
    expect(insideRing).toContain(`inset-block: ${FOCUS_RING_WIDTH};`);
    expect(insideRing).toContain(`inset-inline-start: ${FOCUS_RING_WIDTH};`);
    // The ring the bar steps inside is the row's own, read from its rule
    // rather than found anywhere in the module, where the header cell's ring
    // would answer too.
    const ring = ruleBody(
      TABLE_STYLES.styles,
      '.snui-data-grid__body [role="row"][data-focus-visible]',
    );
    expect(ring).toContain(focusRingDeclarations("inset", false));
    // The header cell's ring reads the same width, so a contrast request
    // widens both.
    expect(
      ruleBody(
        TABLE_STYLES.styles,
        '.snui-data-grid__header :is(th, [role="columnheader"])[data-focus-visible]',
      ),
    ).toContain(focusRingDeclarations("inset", true));
    expect(FOCUS_RING_WIDTH).toBe("var(--snui-focus-ring-width)");
  });

  it("rings a focused selected row in HighlightText under forced colors", () => {
    // Forced colors fills a selected row with Highlight, so the Highlight
    // ring every other focused row takes would vanish into it.
    const forced = TABLE_STYLES.styles.slice(
      TABLE_STYLES.styles.indexOf("@media (forced-colors: active)"),
    );
    expect(
      ruleBody(
        forced,
        '  .snui-data-grid__body [role="row"][data-selected][data-focus-visible]',
      ),
    ).toContain("outline-color: HighlightText;");
  });

  it("bounds the virtualized viewport through an overridable property", () => {
    expect(TABLE_STYLES.styles).toMatch(
      /\.snui-data-grid--virtualized \{[^}]*max-block-size: var\(--snui-data-grid-max-block-size, 60dvh\);/,
    );
  });

  it("unwraps a truncated virtualized cell while it holds keyboard focus", () => {
    // The title that carries the full value reaches only a pointer, so a
    // keyboard user reads the value by focusing its cell.
    expect(TABLE_STYLES.styles).toMatch(
      /\.snui-data-grid--virtualized \.snui-data-grid__body :is\(\[role="rowheader"\], \[role="gridcell"\]\)\[data-focus-visible\],\n\.snui-data-grid--virtualized \.snui-data-grid__body :is\(\[role="rowheader"\], \[role="gridcell"\]\)\[data-focus-visible\] \.snui-data-grid__cell-text \{[^}]*overflow: visible;[^}]*text-overflow: clip;[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/,
    );
  });

  it("keeps the forced-colors fill for selection and outlines a hovered row", () => {
    const forced = TABLE_STYLES.styles.slice(
      TABLE_STYLES.styles.indexOf("@media (forced-colors: active)"),
    );
    // Only a selected row takes the Highlight fill.
    const fills = forced.match(/^\s*([^{}]+) \{\n\s*background: Highlight;/gm);
    expect(fills).not.toBeNull();
    for (const rule of fills ?? []) {
      expect(rule).toContain("[data-selected]");
    }
    // A hovered row that is not selected, and not the keyboard's row, is
    // outlined rather than filled, so it never reads as selected.
    expect(forced).toMatch(
      /\[data-selection-mode\]\[data-hovered\]:not\(\[data-selected\], \[data-focus-visible\]\) \{\n\s*outline: 2px dashed Highlight;\n\s*outline-offset: -2px;\n\s*\}/,
    );
    expect(forced).not.toMatch(
      /\[data-selection-mode\]\[data-hovered\] \{[^}]*background: Highlight;/,
    );
  });

  it("floors header and body cells from one column-width property", () => {
    const floors = TABLE_STYLES.styles.match(
      /min-width: var\(--snui-data-grid-column-min, 6rem\);/g,
    );
    expect(floors).toHaveLength(2);
    expect(TABLE_STYLES.styles).not.toMatch(/min-width: 6rem;/);
  });
});
