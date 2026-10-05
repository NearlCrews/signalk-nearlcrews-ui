import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  Cell,
  Column,
  DataGrid,
  type DataGridColumnProps,
  type DataGridProps,
  Row,
  type RowProps,
} from "../../../src/data-grid.js";
import { renderInPanel } from "../../helpers.js";

export interface Boat {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
}

export const BOATS: readonly Boat[] = [
  { id: "a", name: "Aster", depth: 12 },
  { id: "b", name: "Brine", depth: 4 },
  { id: "c", name: "Coral", depth: 30 },
  { id: "d", name: "Drift", depth: 8 },
];

/** A generated fleet, for the specs that need more rows than BOATS holds. */
export function boatFleet(length: number): readonly Boat[] {
  return Array.from({ length }, (_, index) => ({
    id: `boat-${String(index)}`,
    name: `Boat ${String(index)}`,
    depth: index,
  }));
}

/** Column entries for the specs that render the header or the cells dynamically. */
export const NAME_DEPTH_COLUMNS = [{ key: "name" }, { key: "depth" }] as const;

type BoatColumn = (typeof NAME_DEPTH_COLUMNS)[number];

export function renderBoatRow(boat: Boat): ReactElement<RowProps<Boat>> {
  return (
    <Row>
      <Cell>{boat.name}</Cell>
      <Cell>{boat.depth}</Cell>
    </Row>
  );
}

export function boatColumns(): ReactElement {
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

/**
 * A row whose cells come from a function over NAME_DEPTH_COLUMNS. Passed to
 * `renderRow` as it stands, its identity is stable across renders, which the
 * row cache specs rely on.
 */
export function renderKeyedBoatRow(
  boat: Boat,
  rowProps: Omit<RowProps<BoatColumn>, "children" | "columns"> = {},
): ReactElement<RowProps<Boat>> {
  return (
    <Row columns={NAME_DEPTH_COLUMNS} {...rowProps}>
      {(column) => (
        <Cell>{column.key === "name" ? boat.name : boat.depth}</Cell>
      )}
    </Row>
  );
}

// The header shape is a union, so the shared helper varies only the props
// that sit outside it.
export type GridOverrides = Partial<
  Omit<DataGridProps<Boat>, "children" | "columns">
>;

export function boatGrid(props: GridOverrides = {}): ReactElement {
  return (
    <DataGrid
      aria-label="Boats"
      items={BOATS}
      renderRow={renderBoatRow}
      {...props}
    >
      {boatColumns()}
    </DataGrid>
  );
}

export function renderGrid(props: GridOverrides = {}): RenderResult {
  return renderInPanel(boatGrid(props));
}

/** A grid whose header is a render function drawing one plain column per entry. */
export function dynamicHeaderGrid(
  columns: readonly { readonly key: string }[],
  props: GridOverrides = {},
): ReactElement {
  return (
    <DataGrid
      aria-label="Boats"
      columns={columns}
      items={BOATS}
      renderRow={renderBoatRow}
      {...props}
    >
      {(column) => <Column id={column.key}>{column.key}</Column>}
    </DataGrid>
  );
}

/**
 * A grid whose header and rows are both render functions over
 * NAME_DEPTH_COLUMNS, so a spec states only the column options it varies.
 */
export function keyedBoatGrid(
  columnProps: (
    key: BoatColumn["key"],
  ) => Pick<DataGridColumnProps, "numeric" | "wrap">,
  props: GridOverrides = {},
): ReactElement {
  return (
    <DataGrid
      aria-label="Boats"
      columns={NAME_DEPTH_COLUMNS}
      items={BOATS}
      renderRow={renderKeyedBoatRow}
      {...props}
    >
      {(column) => (
        <Column id={column.key} {...columnProps(column.key)}>
          {column.key}
        </Column>
      )}
    </DataGrid>
  );
}

/** Every body cell, whichever of the two roles React Aria gave it. */
export const CELL_SELECTOR = "[role='rowheader'], [role='gridcell']";

export function bodyRows(container: HTMLElement): NodeListOf<HTMLElement> {
  return container.querySelectorAll<HTMLElement>(
    ".snui-data-grid__body [role='row']",
  );
}

export function rowNames(container: HTMLElement): string[] {
  return [...bodyRows(container)].map(
    (row) => row.querySelector(CELL_SELECTOR)?.textContent ?? "",
  );
}

export function rowAt(container: HTMLElement, index: number): HTMLElement {
  const row = bodyRows(container)[index];
  if (row === undefined) {
    throw new Error(`Expected a row at index ${String(index)}.`);
  }
  return row;
}

export function cellAt(row: HTMLElement, index: number): HTMLElement {
  const cell = row.querySelectorAll<HTMLElement>(CELL_SELECTOR)[index];
  if (cell === undefined) {
    throw new Error(`Expected a cell at index ${String(index)}.`);
  }
  return cell;
}
