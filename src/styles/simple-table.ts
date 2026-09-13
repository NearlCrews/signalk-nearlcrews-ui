import { visuallyHiddenDeclarations } from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * The lightweight semantic table (Table, TableScrollRegion, and the cell
 * components), installed by `Table` through `useOptionalModuleStyles`, so a
 * panel without a table never injects them. DataGrid's react-aria grid keeps
 * its own module in table.ts.
 */
export const SIMPLE_TABLE_STYLES: StyleModule = {
  id: "simple-table",
  styles: scopeStyles(`
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
  text-wrap: balance;
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
  vertical-align: top;
  overflow-wrap: anywhere;
}

/*
 * Inside the scroll region a cell takes a width floor, so a wide table
 * overflows the region and scrolls the way the region promises instead of
 * squeezing every column down to one word per line. A table outside the
 * region keeps squeezing, because nothing there would scroll and the panel
 * itself must not. The floor is a custom property so a panel can lower it.
 */
.snui-table-scroll .snui-table th,
.snui-table-scroll .snui-table td {
  min-width: var(--snui-table-cell-min, 6rem);
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

/*
 * Figures align in a column and stop shifting as values tick over. Tabular
 * figures are an OpenType feature most faces carry for Western Arabic digits
 * alone, so a locale rendering another digit set keeps the alignment only as
 * far as its font does.
 */
.snui-table__cell--numeric {
  font-variant-numeric: tabular-nums;
  text-align: end;
}

/* The of-type form tolerates a script or a comment node sitting in the body,
   which consumer-authored markup can carry, and matches the data grid. */
.snui-table--zebra tbody > tr:nth-of-type(even) > td,
.snui-table--zebra tbody > tr:nth-of-type(even) > th {
  background: var(--snui-color-surface-stripe);
}

@media (forced-colors: active) {
  .snui-table th,
  .snui-table td {
    border-color: CanvasText;
  }
}
`),
};
