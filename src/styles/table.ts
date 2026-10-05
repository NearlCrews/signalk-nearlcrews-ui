import {
  CONTROL_SURFACE_DECLARATIONS,
  FOCUS_RING_WIDTH,
  focusRingDeclarations,
  TABLE_CAPTION_DECLARATIONS,
  TONE_BAR_WIDTH,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Cell and row selectors, written once. Each carries the role fallback the
 * virtualized grid needs, and each is long enough that a typo in one copy
 * would silently match nothing. The role-only forms match by the role React
 * Aria writes on every cell in both layouts.
 */
const CELL_ROLES = ':is(td, [role="rowheader"], [role="gridcell"])';
const BODY_CELL_ROLE_ONLY = ':is([role="rowheader"], [role="gridcell"])';
const HEADER_CELL = '.snui-data-grid__header :is(th, [role="columnheader"])';
const HEADER_ROLE_CELL = '.snui-data-grid__header [role="columnheader"]';
const BODY_CELL = `.snui-data-grid__body ${CELL_ROLES}`;
const SORTABLE_HEADER = `${HEADER_CELL}[data-allows-sorting]`;
const BODY_ROW = '.snui-data-grid__body [role="row"]';
const SELECTABLE_ROW = `${BODY_ROW}[data-selection-mode]`;
const SELECTED_ROW = `${BODY_ROW}[data-selected]`;
const FOCUSED_ROW = `${BODY_ROW}[data-focus-visible]`;
const VIRTUALIZED_BODY_CELL = `.snui-data-grid--virtualized .snui-data-grid__body ${BODY_CELL_ROLE_ONLY}`;
/*
 * The first column, by the index React Aria writes on every cell in both
 * layouts rather than by position: a virtualized grid wraps each cell in an
 * element of its own, where every cell is its parent's first child. Header
 * cells carry the one-based aria-colindex, body cells the zero-based
 * data-column-index.
 */
const FIRST_HEADER_CELL = `${HEADER_CELL}[aria-colindex="1"]`;
const FIRST_COLUMN = '[data-column-index="0"]';

/**
 * Custom property holding the minimum width of a data-grid column. `DataGrid`
 * writes it on the cells of a column pinned narrower than the default floor,
 * which lowers the floor for those cells alone.
 *
 * @internal
 */
export const DATA_GRID_COLUMN_MIN_PROPERTY = "--snui-data-grid-column-min";

/**
 * Floor a column may not shrink below, as a custom property so a column pinned
 * narrower carries the smaller value on its own cells and the panel can lower
 * the floor for a whole grid.
 */
const COLUMN_MIN = `var(${DATA_GRID_COLUMN_MIN_PROPERTY}, 6rem)`;

/**
 * The row floor compact density trades for. A compact row has to measure the
 * same virtualized or not, so both layouts read it from here.
 */
const COMPACT_ROW_FLOOR =
  "calc(var(--snui-control-min-height) - var(--snui-space-3))";

const TABLE_CSS = scopeStyles(`
.snui-data-grid {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: auto;
  /* A sideways flick that reaches the end of the grid must not scroll the
     panel or the host page behind it. */
  overscroll-behavior-x: contain;
  /* The grid is a focusable scroll region, so its edge keeps the boundary
     token when container outlines step back to the subtle one. */
${CONTROL_SURFACE_DECLARATIONS}
  color: var(--snui-color-text);
}

.snui-data-grid__caption {
  padding: var(--snui-space-2) var(--snui-space-3);
${TABLE_CAPTION_DECLARATIONS}
}

.snui-data-grid__caption--hidden {
${visuallyHiddenDeclarations()}
}

.snui-data-grid__table {
  width: 100%;
  border-collapse: collapse;
  font: inherit;
}

${HEADER_CELL} {
  box-sizing: border-box;
  position: sticky;
  inset-block-start: 0;
  z-index: var(--snui-z-sticky);
  height: var(--snui-control-min-height);
  padding: var(--snui-space-2) var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border-subtle);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  min-width: ${COLUMN_MIN};
  text-align: start;
}

${SORTABLE_HEADER} {
  cursor: pointer;
}

/* Header cells sit on the raised surface, so the raised hover step keeps the
   hover and pressed fills visible in Dark. */
${SORTABLE_HEADER}[data-hovered],
${SORTABLE_HEADER}[data-pressed] {
  background: var(--snui-color-hover-raised);
}

${HEADER_CELL}[data-focus-visible] {
${focusRingDeclarations("inset", true)}
}

/*
 * Sort state pairs the glyph with aria-sort, never the glyph alone. The
 * empty alternative text keeps the glyph out of the header's accessible
 * name, which aria-sort already describes. The glyph is sized in em rather
 * than from the type scale so it tracks whatever size the header text takes,
 * including a panel that sets its own.
 */
${SORTABLE_HEADER}::after {
  content: "\\21C5" / "";
  margin-inline-start: var(--snui-space-2);
  color: var(--snui-color-text-muted);
  font-size: 0.8em;
}

${HEADER_CELL}[data-sort-direction="ascending"]::after {
  content: "\\25B2" / "";
  color: var(--snui-color-accent-fill);
}

${HEADER_CELL}[data-sort-direction="descending"]::after {
  content: "\\25BC" / "";
  color: var(--snui-color-accent-fill);
}

${BODY_CELL} {
  box-sizing: border-box;
  padding: var(--snui-space-2) var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border-subtle);
  min-width: ${COLUMN_MIN};
  /* Live values tick over without shifting their neighbors. Tabular figures
     are an OpenType feature most faces carry for Western Arabic digits alone,
     so a locale rendering another digit set keeps the alignment only as far
     as its font does. */
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

/* A numeric column right-aligns its header and cells so figures line up. */
.snui-data-grid :is(th, td, [role="columnheader"], [role="rowheader"], [role="gridcell"])[data-snui-numeric] {
  text-align: end;
}

${SELECTABLE_ROW} {
  cursor: pointer;
}

/*
 * Pressing a selectable row changes the selection, so the row carries the
 * control target floor. Table layout ignores min-height on a row, so the
 * floor is written as a height, which it treats as a minimum and still grows
 * for a taller cell; the virtualized rows below keep min-height because the
 * virtualizer measures them. Compact trades the floor for density, which the
 * design contract records as its one target-size exception.
 */
.snui-data-grid:not(.snui-data-grid--virtualized) ${SELECTABLE_ROW} {
  height: var(--snui-control-min-height);
}

.snui-data-grid--compact:not(.snui-data-grid--virtualized) ${SELECTABLE_ROW} {
  height: ${COMPACT_ROW_FLOOR};
}

${SELECTABLE_ROW}[data-hovered] {
  background: var(--snui-color-interactive-hover);
}

${SELECTED_ROW} {
  background: var(--snui-color-accent-subtle);
}

/*
 * Selection also carries a leading bar, because the Night tint sits about
 * 1.1:1 against the surface behind it and hue alone is never the signal. The
 * first column's inset is widened by the bar's width on every row and in the
 * header, so selecting a row paints the bar there rather than shifting the
 * row's text. The bar is drawn over that inset rather than as the cell's own
 * border: a leading border on the cell mitres against the row separator and
 * fades its first pixels in.
 */
${FIRST_HEADER_CELL},
${BODY_CELL}${FIRST_COLUMN} {
  /* The width the tone bar takes on Banner, Card, and Toast. */
  padding-inline-start: calc(var(--snui-space-3) + ${TONE_BAR_WIDTH});
}

${BODY_CELL}${FIRST_COLUMN} {
  position: relative;
}

/*
 * The bar is the pseudo-element's own border rather than its box, so it snaps
 * to whole pixels the way the Banner, Card, and Toast tone bars do and paints
 * exactly as wide as theirs.
 */
${SELECTED_ROW} ${CELL_ROLES}${FIRST_COLUMN}::before {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  border-inline-start: ${TONE_BAR_WIDTH} solid var(--snui-color-accent-fill);
  content: "";
  pointer-events: none;
}

/*
 * A row that holds keyboard focus paints its ring in the band just inside its
 * edge, and the positioned bar would paint over that band, so the bar steps
 * inside the ring and the ring stays whole.
 */
${SELECTED_ROW}[data-focus-visible] ${CELL_ROLES}${FIRST_COLUMN}::before {
  inset-block: ${FOCUS_RING_WIDTH};
  inset-inline-start: ${FOCUS_RING_WIDTH};
}

${SELECTED_ROW}[data-hovered] {
  background: var(--snui-color-row-selected-hover);
}

${FOCUSED_ROW} {
${focusRingDeclarations("inset", false)}
}

.snui-data-grid--zebra:not(.snui-data-grid--virtualized) .snui-data-grid__body > tr:nth-of-type(even):not([data-selected]):not([data-hovered]),
.snui-data-grid--zebra.snui-data-grid--virtualized ${BODY_ROW}[data-snui-zebra-odd]:not([data-selected]):not([data-hovered]) {
  background: var(--snui-color-surface-stripe);
}

.snui-data-grid--compact ${HEADER_CELL},
.snui-data-grid--compact ${BODY_CELL} {
  padding: var(--snui-space-1) var(--snui-space-2);
}

.snui-data-grid--compact ${FIRST_HEADER_CELL},
.snui-data-grid--compact ${BODY_CELL}${FIRST_COLUMN} {
  padding-inline-start: calc(var(--snui-space-2) + ${TONE_BAR_WIDTH});
}

.snui-data-grid--compact ${HEADER_CELL} {
  height: auto;
}

/*
 * The Virtualizer sizes its viewport from this box, so an unbounded grid would
 * lay out every row and virtualize nothing. The default bound is overridable,
 * and a panel that owns the height sets it through the custom property or its
 * own style.
 */
.snui-data-grid--virtualized {
  max-block-size: var(--snui-data-grid-max-block-size, 60dvh);
  overflow: hidden;
}

/* React Aria owns virtual row measurement, positioning, and ARIA metadata. */
.snui-data-grid--virtualized .snui-data-grid__table {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  max-height: inherit;
  overflow: auto;
  border-collapse: initial;
}

.snui-data-grid--virtualized .snui-data-grid__header {
  width: 100%;
}

.snui-data-grid--virtualized ${HEADER_ROLE_CELL} {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.snui-data-grid--virtualized .snui-data-grid__body {
  width: 100%;
}

.snui-data-grid--virtualized ${BODY_ROW} {
  width: 100%;
  min-height: var(--snui-control-min-height);
}

.snui-data-grid--compact.snui-data-grid--virtualized ${BODY_ROW} {
  min-height: ${COMPACT_ROW_FLOOR};
}

/*
 * Virtualized cells keep one line so row heights stay predictable; text-only
 * content is wrapped in a span that carries the full value as a title, and
 * the ellipsis lives on that span because a flex container cannot truncate
 * its own anonymous text.
 */
${VIRTUALIZED_BODY_CELL} {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snui-data-grid--virtualized .snui-data-grid__body .snui-data-grid__cell-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Flex cells align through justification rather than text-align. */
.snui-data-grid--virtualized :is([role="columnheader"], [role="rowheader"], [role="gridcell"])[data-snui-numeric] {
  justify-content: flex-end;
}

/* A wrap column trades one-line rows for the whole value. */
${VIRTUALIZED_BODY_CELL}[data-snui-wrap] {
  align-items: flex-start;
  overflow-wrap: anywhere;
  white-space: normal;
}

/*
 * The title that carries a truncated value reaches a pointer alone, so the
 * cell that holds keyboard focus shows its whole value instead. DataGrid
 * rebuilds the rows focus moves between, so the virtualizer measures them
 * again: the row grows to fit and settles back when focus moves on.
 */
${VIRTUALIZED_BODY_CELL}[data-focus-visible],
${VIRTUALIZED_BODY_CELL}[data-focus-visible] .snui-data-grid__cell-text {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tint, so reconstruct selection and focus with
   * system colors. aria-selected remains the programmatic cue.
   */
  ${SELECTED_ROW} {
    background: Highlight;
  }

  ${SELECTED_ROW},
  ${SELECTED_ROW} ${BODY_CELL_ROLE_ONLY} {
    color: HighlightText;
  }

  ${SELECTED_ROW} ${CELL_ROLES}${FIRST_COLUMN}::before {
    forced-color-adjust: none;
    border-inline-start-color: HighlightText;
  }

  ${SELECTED_ROW}[data-hovered] {
    background: Highlight;
  }

  /*
   * The unselected hover fill is a tint too, so it disappears the same way.
   * It is rebuilt as an inset outline rather than a fill, because the
   * Highlight fill is the selection mark and a pointer crossing the grid must
   * not paint rows that look selected. Dashed, so it never reads as the solid
   * keyboard ring, which keeps its own row.
   */
  ${SELECTABLE_ROW}[data-hovered]:not([data-selected], [data-focus-visible]) {
    outline: 2px dashed Highlight;
    outline-offset: -2px;
  }

  ${FOCUSED_ROW},
  ${HEADER_ROLE_CELL}[data-focus-visible] {
    outline-color: Highlight;
  }

  /*
   * A selected row is filled with Highlight, where a Highlight ring would
   * vanish, so a selected row that holds focus rings in HighlightText, the
   * color its bar and text already take.
   */
  ${SELECTED_ROW}[data-focus-visible] {
    outline-color: HighlightText;
  }

  ${HEADER_ROLE_CELL}[data-allows-sorting]::after,
  ${HEADER_ROLE_CELL}[data-sort-direction]::after {
    color: CanvasText;
  }
}
`);

/** Data-grid styles, installed by `DataGrid` through `useModuleStyles`. */
export const TABLE_STYLES: StyleModule = {
  id: "table",
  styles: TABLE_CSS,
};
