import { focusRingDeclarations } from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

const TABLE_CSS = scopeStyles(`
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

.snui-data-grid__header :is(th, [role="columnheader"]) {
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
  min-width: 6rem;
  text-align: start;
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting] {
  cursor: pointer;
}

/* Header cells sit on the raised surface, so the raised hover step keeps the
   hover and pressed fills visible in Dark. */
.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting][data-hovered],
.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting][data-pressed] {
  background: var(--snui-color-hover-raised);
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-focus-visible] {
${focusRingDeclarations("-2px", true)}
}

/*
 * Sort state pairs the glyph with aria-sort, never the glyph alone. The
 * empty alternative text keeps the glyph out of the header's accessible
 * name, which aria-sort already describes.
 */
.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting]::after {
  content: "\\21C5" / "";
  margin-inline-start: var(--snui-space-2);
  color: var(--snui-color-text-muted);
  font-size: 0.8em;
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-sort-direction="ascending"]::after {
  content: "\\25B2" / "";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-sort-direction="descending"]::after {
  content: "\\25BC" / "";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__body :is(td, [role="rowheader"], [role="gridcell"]) {
  box-sizing: border-box;
  padding: var(--snui-space-2) var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border);
  min-width: 6rem;
  /* Live values tick over without shifting their neighbors. */
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

.snui-data-grid__body [role="row"][data-selection-mode][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__body [role="row"][data-selected] {
  background: var(--snui-color-accent-subtle);
}

.snui-data-grid__body [role="row"][data-selected][data-hovered] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 8%,
    var(--snui-color-accent-subtle)
  );
}

.snui-data-grid__body [role="row"][data-focus-visible] {
${focusRingDeclarations("-2px", false)}
}

.snui-data-grid--zebra:not(.snui-data-grid--virtualized) .snui-data-grid__body > tr:nth-of-type(even):not([data-selected]):not([data-hovered]),
.snui-data-grid--zebra.snui-data-grid--virtualized .snui-data-grid__body [role="row"][data-snui-zebra-odd]:not([data-selected]):not([data-hovered]) {
  background: var(--snui-color-surface-stripe);
}

.snui-data-grid--compact .snui-data-grid__header :is(th, [role="columnheader"]),
.snui-data-grid--compact .snui-data-grid__body :is(td, [role="rowheader"], [role="gridcell"]) {
  padding: var(--snui-space-1) var(--snui-space-2);
}

.snui-data-grid--compact .snui-data-grid__header :is(th, [role="columnheader"]) {
  height: auto;
}

.snui-data-grid--virtualized {
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
  .snui-data-grid__body [role="row"][data-selected] {
    background: Highlight;
  }

  .snui-data-grid__body [role="row"][data-selected],
  .snui-data-grid__body [role="row"][data-selected] :is([role="rowheader"], [role="gridcell"]) {
    color: HighlightText;
  }

  .snui-data-grid__body [role="row"][data-selected][data-hovered] {
    background: Highlight;
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
