import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  Cell,
  Column,
  DataGrid,
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

/** Column entries for the specs that render the header or the cells dynamically. */
export const NAME_DEPTH_COLUMNS = [{ key: "name" }, { key: "depth" }] as const;

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

// The header shape is a union now, so the shared helper varies only the
// props that sit outside it.
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

export function bodyRows(container: HTMLElement): NodeListOf<HTMLElement> {
  return container.querySelectorAll<HTMLElement>(
    ".snui-data-grid__body [role='row']",
  );
}

export function rowNames(container: HTMLElement): string[] {
  return [...bodyRows(container)].map(
    (row) =>
      row.querySelector("[role='rowheader'], [role='gridcell']")?.textContent ??
      "",
  );
}

export function rowAt(container: HTMLElement, index: number): HTMLElement {
  const row = [...bodyRows(container)][index];
  if (row === undefined) {
    throw new Error(`Expected a row at index ${String(index)}.`);
  }
  return row;
}

export function cellAt(row: HTMLElement, index: number): HTMLElement {
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
