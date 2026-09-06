import { visuallyHiddenDeclarations } from "./fragments.js";
import { scopeStyles } from "./scope.js";

/**
 * The lightweight semantic table (Table, TableScrollRegion, and the cell
 * components). DataGrid's react-aria grid keeps its own module in table.ts.
 */
export const SIMPLE_TABLE_STYLES = scopeStyles(`
/*
 * A wide table scrolls inside its own focusable region, so keyboard users can
 * reach the overflow and the panel itself never scrolls sideways.
 */
.snui-table-scroll {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.snui-table-scroll:focus-visible {
  border-radius: var(--snui-radius-sm);
}

.snui-table {
  width: 100%;
  border-collapse: collapse;
  caption-side: top;
  color: var(--snui-color-text);
  text-align: start;
}

.snui-table__caption {
  padding-block-end: var(--snui-space-2);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  text-align: start;
  overflow-wrap: anywhere;
}

.snui-table__caption--hidden {
${visuallyHiddenDeclarations()}
}

.snui-table th,
.snui-table td {
  padding: var(--snui-space-2) var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border);
  text-align: start;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.snui-table th {
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-semibold);
}

.snui-table tbody th {
  color: var(--snui-color-text);
  font-size: inherit;
  background: transparent;
}

.snui-table--compact th,
.snui-table--compact td {
  padding: var(--snui-space-1) var(--snui-space-2);
}

/* Figures align in a column and stop shifting as values tick over. */
.snui-table__cell--numeric {
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.snui-table--zebra tbody tr:nth-child(even) > td,
.snui-table--zebra tbody tr:nth-child(even) > th {
  background: var(--snui-color-surface-stripe);
}

@media (forced-colors: active) {
  .snui-table th,
  .snui-table td {
    border-color: CanvasText;
  }
}
`);
