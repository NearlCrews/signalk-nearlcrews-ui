/**
 * Declaration blocks shared by more than one rule.
 *
 * Each fragment is interpolated where its rule already lives rather than
 * hoisted into a single selector, so module order, and therefore the cascade,
 * is unchanged. Only the declarations are written once.
 */

import { CONTAINER_BREAKPOINT_NARROW, PANEL_CONTAINER_NAME } from "./tokens.js";

const VISUALLY_HIDDEN_PROPERTIES: readonly (readonly [string, string])[] = [
  ["position", "absolute"],
  ["width", "1px"],
  ["height", "1px"],
  ["padding", "0"],
  ["margin", "-1px"],
  ["overflow", "hidden"],
  // No deprecated `clip` fallback beside it: every engine at the package's
  // support floor honours `clip-path`, and both contain a fixed descendant.
  ["clip-path", "inset(50%)"],
  ["white-space", "nowrap"],
  ["border", "0"],
];

/**
 * Takes an element out of flow while leaving it in the accessibility tree.
 * The utility class has to beat component rules, so it marks every
 * declaration important; a rule that already targets one component does not.
 */
export function visuallyHiddenDeclarations(important = false): string {
  const suffix = important ? " !important" : "";
  return VISUALLY_HIDDEN_PROPERTIES.map(
    ([property, value]) => `  ${property}: ${value}${suffix};`,
  ).join("\n");
}

/** Shared presentation for every field error message. */
export const FIELD_ERROR_DECLARATIONS = [
  "  min-width: 0;",
  "  color: var(--snui-color-danger);",
  "  font-size: var(--snui-font-size-sm);",
  "  font-weight: var(--snui-font-weight-medium);",
  "  overflow-wrap: anywhere;",
].join("\n");

/** The raised surface every anchored overlay paints. */
export const RAISED_OVERLAY_DECLARATIONS = [
  "  border: 1px solid var(--snui-color-border);",
  "  border-radius: var(--snui-radius-md);",
  "  background: var(--snui-color-surface-raised);",
  "  box-shadow: var(--snui-shadow-overlay);",
  "  color: var(--snui-color-text);",
  "  opacity: 1;",
  "  transform: none;",
  "  transition:\n    opacity var(--snui-transition-fast),\n    transform var(--snui-transition-fast);",
].join("\n");

/** The entering and exiting state of an anchored overlay. */
export const OVERLAY_TRANSITION_DECLARATIONS = [
  "  opacity: 0;",
  "  transform: translateY(-0.25rem);",
].join("\n");

/**
 * Forced colors flattens the overlay's border and shadow, so the surface
 * boundary is redrawn with a system color. Indented for use inside a
 * forced-colors media block.
 */
export const FORCED_COLORS_OUTLINE_DECLARATIONS = [
  "    outline: 2px solid CanvasText;",
  "    outline-offset: -2px;",
].join("\n");

/**
 * The focus ring every interactive element paints. Inset rings (offset -2px)
 * suit rows and menu items; outset rings with the two-tone shadow suit
 * controls, where `--snui-focus-ring` fills the offset gap with
 * `--snui-color-focus-ring-band`, the fill behind the control, so the ring
 * keeps its own boundary next to a danger or accent edge.
 */
export function focusRingDeclarations(
  offset: "-2px" | "2px",
  shadow: boolean,
): string {
  return [
    "  outline: 2px solid var(--snui-color-focus);",
    `  outline-offset: ${offset};`,
    ...(shadow ? ["  box-shadow: var(--snui-focus-ring);"] : []),
  ].join("\n");
}

/**
 * Disabled presentation shared by every control. Text takes the disabled
 * token, which the contrast tests measure, instead of an opacity that dims an
 * unmeasurable amount. Opacity stays for icon-only children, and a filled
 * control restates its own disabled fill beside this block.
 */
export const DISABLED_DECLARATIONS = [
  "  cursor: not-allowed;",
  "  color: var(--snui-color-text-disabled);",
  // Chromium dims a disabled select to 0.7 opacity in its own stylesheet; the
  // token above carries the disabled state, so the control stays fully opaque.
  "  opacity: 1;",
].join("\n");

/** Pressed-state tint painted over the interactive hover fill. */
export const PRESSED_FILL_DECLARATION =
  "  background: var(--snui-color-accent-subtle);";

/**
 * The stacked body of a field: its label, its control, and its messages.
 * Shared by the field, the radio group, and the progress bar.
 */
export const FIELD_STACK_DECLARATIONS = [
  "  display: grid;",
  "  min-width: 0;",
  "  gap: var(--snui-space-1);",
].join("\n");

/** Shared presentation for the label a control names itself with. */
export const CONTROL_LABEL_DECLARATIONS = [
  "  min-width: 0;",
  "  color: var(--snui-color-text);",
  "  font-weight: var(--snui-font-weight-semibold);",
  "  overflow-wrap: anywhere;",
].join("\n");

/** Shared presentation for the muted description under a label. */
export const FIELD_DESCRIPTION_DECLARATIONS = [
  "  min-width: 0;",
  "  color: var(--snui-color-text-muted);",
  "  font-size: var(--snui-font-size-sm);",
  "  overflow-wrap: anywhere;",
].join("\n");

/** The plain bordered surface a container paints on the panel background. */
export const SURFACE_DECLARATIONS = [
  "  border: 1px solid var(--snui-color-border);",
  "  border-radius: var(--snui-radius-md);",
  "  background: var(--snui-color-surface);",
].join("\n");

/**
 * The row a checkbox or a radio is pressed by: the box, the text beside it,
 * and the target height the whole row carries, because the element the user
 * presses is the label rather than the box inside it.
 */
export const CONTROL_ROW_DECLARATIONS = [
  "  display: grid;",
  "  grid-template-columns: auto minmax(0, 1fr);",
  "  gap: var(--snui-space-1) var(--snui-space-3);",
  "  align-items: start;",
  "  min-height: var(--snui-control-min-height);",
  "  padding-block: var(--snui-space-2);",
  "  cursor: pointer;",
].join("\n");

/**
 * The optical nudge a square glyph takes to sit on a line of text beside it,
 * for the checkbox box and the card tone glyph. Stated once so the two cannot
 * drift apart.
 */
export const GLYPH_BASELINE_NUDGE = "0.125rem";

/**
 * Forced colors flattens a control that opts out of automatic adjustment to
 * preserve a selected or danger state, which takes the focus ring with it.
 * Rebuild it with system colors so the author theme token cannot blend into
 * Highlight. Indented for use inside a forced-colors media block.
 */
export const FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS = [
  "    outline: 2px solid CanvasText;",
  "    outline-offset: 2px;",
  "    box-shadow: none;",
].join("\n");

/**
 * The invalid outline every field reconstructs under forced colors, which
 * flattens the danger border to a system color and would otherwise erase the
 * valid versus invalid distinction. Indented for a forced-colors media block.
 */
export const FORCED_COLORS_INVALID_DECLARATIONS = [
  "    outline: 2px dashed CanvasText;",
  "    outline-offset: 1px;",
].join("\n");

/**
 * The size of the glyph a selection control paints: the checkbox box and the
 * radio dial. The two read as one size next to each other in a form, so the
 * measurement is stated once rather than resized in one module alone.
 */
export const SELECTION_GLYPH_SIZE = "1.25rem";

/**
 * The diameter of the tone dot. The status indicator and the toast card paint
 * the same mark, and the per-tone shapes are cut to this size, so resizing it
 * in one module alone would show two different dots in one panel.
 */
const TONE_DOT_SIZE = "0.75rem";

/**
 * The circle the per-tone shapes in `tone-rules.ts` refine. Both dots start
 * from it; a block adds only what its own layout needs beside it.
 */
export const TONE_DOT_DECLARATIONS = [
  `  width: ${TONE_DOT_SIZE};`,
  `  height: ${TONE_DOT_SIZE};`,
  "  border: 2px solid currentColor;",
  "  border-radius: 50%;",
  "  background: currentColor;",
].join("\n");

/**
 * The thickness of a horizontal track: the range slider's and the progress
 * bar's. The slider centers its thumb against this, so a change made in one
 * module alone would leave the thumb off center.
 */
export const TRACK_THICKNESS = "0.375rem";

/**
 * The same track under a coarse pointer, where a helm, a glove, or a moving
 * cabin means the track has to read as a length at a glance. The control
 * height and the range thumb already scale there, so the track follows.
 */
export const TRACK_THICKNESS_COARSE = "0.5rem";

/**
 * Takes the outer margins off the prose a consumer renders inside a body slot,
 * so the surface owns its own padding whatever the first and last blocks are.
 */
export function bodyEdgeMarginRules(block: string): string {
  return [
    `.${block} > :first-child { margin-block-start: 0; }`,
    `.${block} > :last-child { margin-block-end: 0; }`,
  ].join("\n");
}

/**
 * Caps a prose block at a comfortable measure. A description, a body, or a
 * footnote runs the full width of its container otherwise, and on a wide nav
 * station monitor a `width="full"` panel gives it far more than the sixty to
 * seventy-five characters a reader can track from line to line. Blocks that
 * hold a value, a control, or tabular content are not prose and keep the
 * width they are given.
 */
export const PROSE_MEASURE_DECLARATION = "  max-width: 70ch;";

/**
 * The narrow-panel condition, written once. Both halves are constants, the
 * name because `PanelRoot` declares it and the width because a container
 * condition cannot read a custom property.
 */
export const NARROW_PANEL_QUERY = `@container ${PANEL_CONTAINER_NAME} (max-width: ${CONTAINER_BREAKPOINT_NARROW})`;
