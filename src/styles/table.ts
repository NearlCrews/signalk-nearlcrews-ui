import { focusRingDeclarations } from "./fragments.js";
import { scopeStyles } from "./scope.js";

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

.snui-data-grid__header :is(th, [role="columnheader"]) {
  box-sizing: border-box;
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

.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting] {
  cursor: pointer;
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting][data-pressed] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-focus-visible] {
${focusRingDeclarations("-2px", true)}
}

/* Sort state pairs the glyph with aria-sort, never the glyph alone. */
.snui-data-grid__header :is(th, [role="columnheader"])[data-allows-sorting]::after {
  content: "\\21C5";
  margin-inline-start: var(--snui-space-2);
  color: var(--snui-color-text-muted);
  font-size: 0.75em;
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-sort-direction="ascending"]::after {
  content: "\\25B2";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__header :is(th, [role="columnheader"])[data-sort-direction="descending"]::after {
  content: "\\25BC";
  color: var(--snui-color-accent-fill);
}

.snui-data-grid__body :is(td, [role="rowheader"], [role="gridcell"]) {
  box-sizing: border-box;
  padding: var(--snui-space-2) var(--snui-space-3);
  border-bottom: 1px solid var(--snui-color-border);
  min-width: 6rem;
  overflow-wrap: anywhere;
}

.snui-data-grid__body [role="row"][data-selection-mode] {
  cursor: pointer;
}

.snui-data-grid__body [role="row"][data-selection-mode][data-hovered] {
  background: var(--snui-color-interactive-hover);
}

.snui-data-grid__body [role="row"][data-selected] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-surface)
  );
}

.snui-data-grid__body [role="row"][data-selected][data-hovered] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 18%,
    var(--snui-color-interactive-hover)
  );
}

.snui-data-grid__body [role="row"][data-focus-visible] {
${focusRingDeclarations("-2px", false)}
}

.snui-data-grid--zebra:not(.snui-data-grid--virtualized) .snui-data-grid__body > tr:nth-of-type(even):not([data-selected]):not([data-hovered]),
.snui-data-grid--zebra.snui-data-grid--virtualized .snui-data-grid__body [role="row"][data-snui-zebra-odd]:not([data-selected]):not([data-hovered]) {
  background: var(--snui-color-surface-raised);
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

.snui-data-grid--virtualized .snui-data-grid__body :is([role="rowheader"], [role="gridcell"]) {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
