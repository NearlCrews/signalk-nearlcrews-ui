import {
  type RenderResult,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement, useState } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";

import {
  Cell,
  Column,
  DataGrid,
  type DataGridProps,
  Row,
  type RowProps,
  type Selection,
  type SortDescriptor,
} from "../../src/data-grid.js";
import { PanelRoot } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

interface Boat {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
}

const BOATS: readonly Boat[] = [
  { id: "a", name: "Aster", depth: 12 },
  { id: "b", name: "Brine", depth: 4 },
  { id: "c", name: "Coral", depth: 30 },
  { id: "d", name: "Drift", depth: 8 },
];

function renderBoatRow(boat: Boat): ReactElement<RowProps<Boat>> {
  return (
    <Row>
      <Cell>{boat.name}</Cell>
      <Cell>{boat.depth}</Cell>
    </Row>
  );
}

function boatColumns(): ReactElement {
  return (
    <>
      <Column id="name" allowsSorting>
        Name
      </Column>
      <Column id="depth" allowsSorting>
        Depth
      </Column>
    </>
  );
}

function renderGrid(props: Partial<DataGridProps<Boat>> = {}): RenderResult {
  return renderInPanel(
    <DataGrid
      aria-label="Boats"
      items={BOATS}
      renderRow={renderBoatRow}
      {...props}
    >
      {boatColumns()}
    </DataGrid>,
  );
}

function bodyRows(container: HTMLElement): NodeListOf<HTMLElement> {
  return container.querySelectorAll<HTMLElement>(
    ".snui-data-grid__body [role='row']",
  );
}

function rowNames(container: HTMLElement): string[] {
  return [...bodyRows(container)].map(
    (row) =>
      row.querySelector("[role='rowheader'], [role='gridcell']")?.textContent ??
      "",
  );
}

function rowAt(container: HTMLElement, index: number): HTMLElement {
  const row = [...bodyRows(container)][index];
  if (row === undefined) {
    throw new Error(`Expected a row at index ${String(index)}.`);
  }
  return row;
}

function cellAt(row: HTMLElement, index: number): HTMLElement {
  const cell = [
    ...row.querySelectorAll<HTMLElement>(
      "[role='rowheader'], [role='gridcell']",
    ),
  ][index];
  if (cell === undefined) {
    throw new Error(`Expected a cell at index ${String(index)}.`);
  }
  return cell;
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
        "DataGrid requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
      );

      expect(() => renderGrid({ "aria-label": "  " })).toThrow(
        "DataGrid requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
      );
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

    it("forwards ref to the stable outer container", () => {
      const ref = createRef<HTMLDivElement>();
      renderGrid({ ref });

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("DIV");
      expect(ref.current).toHaveClass("snui-data-grid");
      expect(ref.current?.querySelector("[role='grid']")).toBeInTheDocument();
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
      const sorted = [...BOATS].sort((a, b) => {
        const left = sortDescriptor.column === "depth" ? a.depth : a.name;
        const right = sortDescriptor.column === "depth" ? b.depth : b.name;
        const order =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right));
        return sortDescriptor.direction === "ascending" ? order : -order;
      });
      return (
        <PanelRoot>
          <DataGrid
            aria-label="Boats"
            items={sorted}
            onSortChange={setSortDescriptor}
            renderRow={renderBoatRow}
            sortDescriptor={sortDescriptor}
          >
            {boatColumns()}
          </DataGrid>
        </PanelRoot>
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

      expect(screen.getByText("No data")).toBeInTheDocument();
      expect(container.querySelector(".snui-empty-state")).not.toBeNull();
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
        "EmptyState requires a non-empty title.",
      );
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

  describe("virtualization", () => {
    const fleet: readonly Boat[] = Array.from({ length: 20 }, (_, index) => ({
      id: `boat-${String(index)}`,
      name: `Boat ${String(index)}`,
      depth: index,
    }));

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
        <PanelRoot>
          <DataGrid
            ref={ref}
            aria-label="Boats"
            items={fleet}
            renderRow={renderBoatRow}
            virtualizeThreshold={10}
          >
            {boatColumns()}
          </DataGrid>
        </PanelRoot>,
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
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
      indices.forEach((index, position) => {
        expect(index).toBe(2 + position);
      });
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
      for (const row of container.querySelectorAll("[role='row']")) {
        expect(row).toHaveAttribute("role", "row");
      }
      const cells = [
        ...container.querySelectorAll("[role='rowheader'], [role='gridcell']"),
      ];
      expect(cells.length).toBeGreaterThan(0);
      const rowheaders = cells.filter(
        (cell) => cell.getAttribute("role") === "rowheader",
      );
      const gridcells = cells.filter(
        (cell) => cell.getAttribute("role") === "gridcell",
      );
      // RAC stamps rowheader on the row-header column; every other cell is a
      // gridcell. No cell may carry a third value or none.
      expect(rowheaders.length).toBeGreaterThan(0);
      expect(gridcells.length).toBeGreaterThan(0);
      expect(rowheaders.length + gridcells.length).toBe(cells.length);
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
