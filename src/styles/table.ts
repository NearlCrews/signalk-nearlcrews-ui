import {
  focusRingDeclarations,
  SURFACE_DECLARATIONS,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Cell selectors, written once. Each carries the role fallback the virtualized
 * grid needs, and each is long enough that a typo in one copy would silently
 * match nothing.
 */
const CELL_ROLES = ':is(td, [role="rowheader"], [role="gridcell"])';
const HEADER_CELL = '.snui-data-grid__header :is(th, [role="columnheader"])';
const BODY_CELL = `.snui-data-grid__body ${CELL_ROLES}`;
const SELECTED_ROW = '.snui-data-grid__body [role="row"][data-selected]';

/**
 * Floor a column may not shrink below, as a custom property so a column pinned
 * narrower carries the smaller value on its own cells and the panel can lower
 * the floor for a whole grid.
 */
const COLUMN_MIN = "var(--snui-data-grid-column-min, 6rem)";

const TABLE_CSS = scopeStyles(`
.snui-data-grid {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: auto;
  /* A sideways flick that reaches the end of the grid must not scroll the
     panel or the host page behind it. */
  overscroll-behavior-x: contain;
${SURFACE_DECLARATIONS}
  color: var(--snui-color-text);
}

.snui-data-grid__caption {
  padding: var(--snui-space-2) var(--snui-space-3);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  text-align: start;
  overflow-wrap: anywhere;
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
  border-block-end: 1px solid var(--snui-color-border);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  min-width: ${COLUMN_MIN};
  text-align: start;
}

${HEADER_CELL}[data-allows-sorting] {
  cursor: pointer;
}

/* Header cells sit on the raised surface, so the raised hover step keeps the
   hover and pressed fills visible in Dark. */
${HEADER_CELL}[data-allows-sorting][data-hovered],
${HEADER_CELL}[data-allows-sorting][data-pressed] {
  background: var(--snui-color-hover-raised);
}

${HEADER_CELL}[data-focus-visible] {
${focusRingDeclarations("-2px", true)}
}

/*
 * Sort state pairs the glyph with aria-sort, never the glyph alone. The
 * empty alternative text keeps the glyph out of the header's accessible
 * name, which aria-sort already describes. The glyph is sized in em rather
 * than from the type scale so it tracks whatever size the header text takes,
 * including a panel that sets its own.
 */
${HEADER_CELL}[data-allows-sorting]::after {
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
  border-block-end: 1px solid var(--snui-color-border);
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

.snui-data-grid__body [role="row"][data-selection-mode] {
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
.snui-data-grid:not(.snui-data-grid--virtualized) .snui-data-grid__body [role="row"][data-selection-mode] {
  height: var(--snui-control-min-height);
}

.snui-data-grid--compact:not(.snui-data-grid--virtualized) .snui-data-grid__body [role="row"][data-selection-mode] {
  height: calc(var(--snui-control-min-height) - var(--snui-space-3));
}

.snui-data-grid__body [role="row"][data-selection-mode][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

${SELECTED_ROW} {
  background: var(--snui-color-accent-subtle);
}

/*
 * Selection also carries a leading bar, because the Night tint sits about
 * 1.1:1 against the surface behind it and hue alone is never the signal. The
 * bar is reserved on every first cell in transparent, so selecting a row
 * paints it rather than shifting the row's text.
 */
${HEADER_CELL}:first-child,
${BODY_CELL}:first-child {
  /* The width the tone bar takes on Banner, Card, and Toast. The header
     reserves it too, so the first column measures the same in both. */
  border-inline-start: 0.3rem solid transparent;
}

${SELECTED_ROW} ${CELL_ROLES}:first-child {
  border-inline-start-color: var(--snui-color-accent-fill);
}

${SELECTED_ROW}[data-hovered] {
  background: var(--snui-color-row-selected-hover);
}

.snui-data-grid__body [role="row"][data-focus-visible] {
${focusRingDeclarations("-2px", false)}
}

.snui-data-grid--zebra:not(.snui-data-grid--virtualized) .snui-data-grid__body > tr:nth-of-type(even):not([data-selected]):not([data-hovered]),
.snui-data-grid--zebra.snui-data-grid--virtualized .snui-data-grid__body [role="row"][data-snui-zebra-odd]:not([data-selected]):not([data-hovered]) {
  background: var(--snui-color-surface-stripe);
}

.snui-data-grid--compact ${HEADER_CELL},
.snui-data-grid--compact ${BODY_CELL} {
  padding: var(--snui-space-1) var(--snui-space-2);
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

.snui-data-grid--virtualized .snui-data-grid__header [role="columnheader"] {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.snui-data-grid--virtualized .snui-data-grid__body {
  width: 100%;
}

.snui-data-grid--virtualized .snui-data-grid__body [role="row"] {
  width: 100%;
  min-height: var(--snui-control-min-height);
}

.snui-data-grid--compact.snui-data-grid--virtualized .snui-data-grid__body [role="row"] {
  min-height: calc(var(--snui-control-min-height) - var(--snui-space-3));
}

/*
 * Virtualized cells keep one line so row heights stay predictable; text-only
 * content is wrapped in a span that carries the full value as a title, and
 * the ellipsis lives on that span because a flex container cannot truncate
 * its own anonymous text.
 */
.snui-data-grid--virtualized .snui-data-grid__body :is([role="rowheader"], [role="gridcell"]) {
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
.snui-data-grid--virtualized .snui-data-grid__body :is([role="rowheader"], [role="gridcell"])[data-snui-wrap] {
  align-items: flex-start;
  overflow-wrap: anywhere;
  white-space: normal;
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
  ${SELECTED_ROW} :is([role="rowheader"], [role="gridcell"]) {
    color: HighlightText;
  }

  ${SELECTED_ROW} ${CELL_ROLES}:first-child {
    border-inline-start-color: HighlightText;
  }

  ${SELECTED_ROW}[data-hovered] {
    background: Highlight;
  }

  /*
   * The unselected hover fill is a tint too, so it disappears the same way.
   * Reconstructed with the system pair, which also keeps the row's own text
   * readable against it.
   */
  .snui-data-grid__body [role="row"][data-selection-mode][data-hovered] {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }

  .snui-data-grid__body [role="row"][data-focus-visible],
  .snui-data-grid__header [role="columnheader"][data-focus-visible] {
    outline-color: Highlight;
  }

  .snui-data-grid__header [role="columnheader"][data-allows-sorting]::after,
  .snui-data-grid__header [role="columnheader"][data-sort-direction]::after {
    color: CanvasText;
  }
}
`);

/** Data-grid styles, installed by `DataGrid` through `useModuleStyles`. */
export const TABLE_STYLES: StyleModule = {
  id: "table",
  styles: TABLE_CSS,
};
