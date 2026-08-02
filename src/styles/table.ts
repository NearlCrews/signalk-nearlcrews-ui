import { focusRingDeclarations } from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { DATA_GRID_ROW_HEIGHTS, remLength } from "./tokens.js";

export const TABLE_STYLES = scopeStyles(`
.snui-data-grid {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: auto;
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
}

.snui-data-grid__table {
  width: 100%;
  border-collapse: collapse;
  font: inherit;
}

.snui-data-grid__header th {
  position: sticky;
  top: 0;
  z-index: var(--snui-z-sticky);
  height: var(--snui-control-min-height);
  padding: var(--snui-space-2) var(--snui-space-3);
  border-bottom: 1px solid var(--snui-color-border);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  min-width: 6rem;
  text-align: start;
}

.snui-data-grid__header th[data-allows-sorting] {
  cursor: pointer;
}

.snui-data-grid__header th[data-allows-sorting][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__header th[data-allows-sorting][data-pressed] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__header th[data-focus-visible] {
${focusRingDeclarations("-2px", true)}
}

/* Sort state pairs the glyph with aria-sort, never the glyph alone. */
.snui-data-grid__header th[data-allows-sorting]::after {
  content: "\\21C5";
  margin-inline-start: var(--snui-space-2);
  color: var(--snui-color-text-muted);
  font-size: 0.75em;
}

.snui-data-grid__header th[data-sort-direction="ascending"]::after {
  content: "\\25B2";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__header th[data-sort-direction="descending"]::after {
  content: "\\25BC";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__body td {
  padding: var(--snui-space-2) var(--snui-space-3);
  border-bottom: 1px solid var(--snui-color-border);
  min-width: 6rem;
  overflow-wrap: anywhere;
}

.snui-data-grid__body tr[data-selection-mode] {
  cursor: pointer;
}

.snui-data-grid__body tr[data-selection-mode][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__body tr[data-selected] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-surface)
  );
}

.snui-data-grid__body tr[data-selected][data-hovered] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 18%,
    var(--snui-color-interactive-hover)
  );
}

.snui-data-grid__body tr[data-focus-visible] {
${focusRingDeclarations("-2px", false)}
}

.snui-data-grid--zebra .snui-data-grid__body tr:nth-of-type(even):not([data-selected]):not([data-hovered]) {
  background: var(--snui-color-surface-raised);
}

.snui-data-grid--compact .snui-data-grid__header th,
.snui-data-grid--compact .snui-data-grid__body td {
  padding: var(--snui-space-1) var(--snui-space-2);
}

.snui-data-grid--compact .snui-data-grid__header th {
  height: auto;
}

/*
 * Virtualized grids restyle the table as stacked blocks with absolutely
 * positioned rows, the same structure RAC's own table virtualizer produces.
 * DataGrid.tsx stamps explicit rowgroup, row, and gridcell roles so the
 * accessibility tree survives the lost table layout. Rows are a fixed
 * height per density and the pixel offsets in DataGrid.tsx must match.
 */
.snui-data-grid--virtualized .snui-data-grid__table {
  display: block;
  min-width: max-content;
}

.snui-data-grid--virtualized .snui-data-grid__header {
  display: block;
  position: sticky;
  top: 0;
  z-index: var(--snui-z-sticky);
}

.snui-data-grid--virtualized .snui-data-grid__header tr {
  display: flex;
}

.snui-data-grid--virtualized .snui-data-grid__header th {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  height: var(--snui-control-min-height);
}

.snui-data-grid--virtualized .snui-data-grid__body {
  display: block;
  position: relative;
}

.snui-data-grid--virtualized .snui-data-grid__row {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  display: flex;
  width: 100%;
  height: ${remLength(DATA_GRID_ROW_HEIGHTS.default)};
}

.snui-data-grid--compact.snui-data-grid--virtualized .snui-data-grid__row {
  height: ${remLength(DATA_GRID_ROW_HEIGHTS.compact)};
}

.snui-data-grid--virtualized .snui-data-grid__row td {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tint, so reconstruct selection and focus with
   * system colors. aria-selected remains the programmatic cue.
   */
  .snui-data-grid__body tr[data-selected] {
    background: Highlight;
  }

  .snui-data-grid__body tr[data-selected],
  .snui-data-grid__body tr[data-selected] td {
    color: HighlightText;
  }

  .snui-data-grid__body tr[data-selected][data-hovered] {
    background: Highlight;
  }

  .snui-data-grid__body tr[data-focus-visible],
  .snui-data-grid__header th[data-focus-visible] {
    outline-color: Highlight;
  }

  .snui-data-grid__header th[data-allows-sorting]::after,
  .snui-data-grid__header th[data-sort-direction]::after {
    color: CanvasText;
  }
}
`);
