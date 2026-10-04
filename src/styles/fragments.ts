/**
 * Declaration blocks shared by more than one rule.
 *
 * Each fragment is interpolated where its rule already lives rather than
 * hoisted into a single selector, so module order, and therefore the cascade,
 * is unchanged. Only the declarations are written once.
 */

/*
 * Every constant here is a plain literal, or a call marked pure where it has
 * to interpolate, so a bundler drops the fragments an entry never reads. An
 * unmarked call such as `[...].join("\n")` is kept whether or not anything
 * uses it. A block of declarations is widened with `as string`, which keeps
 * its whole text out of the emitted declarations; an annotation would do the
 * same, but the lint rule against inferrable types removes one.
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
export const FIELD_ERROR_DECLARATIONS = `  min-width: 0;
  color: var(--snui-color-danger);
  font-size: var(--snui-font-size-sm);
  font-weight: var(--snui-font-weight-medium);
  overflow-wrap: anywhere;` as string;

/** The raised surface every anchored overlay paints. */
export const RAISED_OVERLAY_DECLARATIONS =
  `  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  opacity: 1;
  transform: none;
  transition:
    opacity var(--snui-transition-fast),
    transform var(--snui-transition-fast);` as string;

/**
 * The hover step and focus ring band every raised overlay surface remaps for
 * what it paints inside. In Dark the flat hover fill equals the raised
 * surface, so a hover fill inside a toast, a dialog, or a popover would
 * vanish without the raised step, and the ring band has to match the fill
 * behind the control.
 */
export const RAISED_SURFACE_TOKEN_DECLARATIONS =
  `  --snui-color-interactive-hover: var(--snui-color-hover-raised);
  --snui-color-focus-ring-band: var(--snui-color-surface-raised);` as string;

/**
 * Padding that keeps a fixed, viewport-sized layer clear of the device safe
 * areas and never tighter than the standard gutter. Safe-area insets are
 * physical edges, so the shorthand stays physical.
 */
export const SAFE_AREA_PADDING_DECLARATIONS = `  padding:
    max(var(--snui-space-4), env(safe-area-inset-top, 0px))
    max(var(--snui-space-4), env(safe-area-inset-right, 0px))
    max(var(--snui-space-4), env(safe-area-inset-bottom, 0px))
    max(var(--snui-space-4), env(safe-area-inset-left, 0px));` as string;

/** The entering and exiting state of an anchored overlay. */
export const OVERLAY_TRANSITION_DECLARATIONS = `  opacity: 0;
  transform: translateY(-0.25rem);` as string;

/**
 * Forced colors flattens the overlay's border and shadow, so the surface
 * boundary is redrawn with a system color. Indented for use inside a
 * forced-colors media block.
 */
export const FORCED_COLORS_OUTLINE_DECLARATIONS =
  `    outline: 2px solid CanvasText;
    outline-offset: -2px;` as string;

/**
 * The width of every focus ring: 2 pixels, and 3 under `prefers-contrast:
 * more`, which the token sheet raises. Under forced colors a danger button's
 * ring adds one pixel to it: a solid ring that replaces the dashed state
 * outline while the button holds keyboard focus. Anything positioned against
 * a ring, such as the data grid selection bar inside a focused row, steps by
 * it.
 */
export const FOCUS_RING_WIDTH = "var(--snui-focus-ring-width)";

/**
 * The offset of an inset focus ring, which lies just inside the edge: as far
 * in as the ring is wide, so it tracks the width a contrast request raises.
 */
export const INSET_FOCUS_RING_OFFSET = `calc(-1 * ${FOCUS_RING_WIDTH})`;

/**
 * Where a focus ring sits. An inset ring, for rows and menu items, lies just
 * inside the edge, so its offset follows the ring width; an outset ring, for
 * controls, stands 2 pixels clear.
 */
export type FocusRingPlacement = "inset" | "outset";

/**
 * The focus ring every interactive element paints, at the shared ring width.
 * Outset rings with the two-tone shadow suit controls, where
 * `--snui-focus-ring` fills the offset gap with `--snui-color-focus-ring-band`,
 * the fill behind the control, so the ring keeps its own boundary next to a
 * danger or accent edge.
 */
export function focusRingDeclarations(
  placement: FocusRingPlacement,
  shadow: boolean,
): string {
  return [
    `  outline: ${FOCUS_RING_WIDTH} solid var(--snui-color-focus);`,
    `  outline-offset: ${placement === "inset" ? INSET_FOCUS_RING_OFFSET : "2px"};`,
    ...(shadow ? ["  box-shadow: var(--snui-focus-ring);"] : []),
  ].join("\n");
}

/**
 * Disabled presentation shared by every control. Text takes the disabled
 * token, which the contrast tests measure, instead of an opacity that dims an
 * unmeasurable amount. Opacity stays for icon-only children, and a filled
 * control restates its own disabled fill beside this block.
 */
// Chromium dims a disabled select to 0.7 opacity in its own stylesheet; the
// color token carries the disabled state, so the control stays fully opaque.
export const DISABLED_DECLARATIONS = `  cursor: not-allowed;
  color: var(--snui-color-text-disabled);
  opacity: 1;` as string;

/**
 * A control blocked either way: natively disabled, or held focusable through
 * aria-disabled so closing it on a focused control cannot destroy that focus.
 * Both arguments weigh (0,1,0) and `:is()` takes the weight of its most
 * specific argument, so substituting it for either one changes no rule's
 * specificity.
 */
export const BLOCKED_SELECTOR = ':is(:disabled, [aria-disabled="true"])';

/** Pressed-state tint painted over the interactive hover fill. */
export const PRESSED_FILL_DECLARATION =
  "  background: var(--snui-color-accent-subtle);";

/**
 * The stacked body of a field: its label, its control, and its messages.
 * Shared by the field, the radio group, and the progress bar.
 */
export const FIELD_STACK_DECLARATIONS = `  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);` as string;

/** Shared presentation for the label a control names itself with. */
export const CONTROL_LABEL_DECLARATIONS = `  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;` as string;

/**
 * The visible name of a group of controls: a fieldset legend, or the label a
 * radiogroup draws in its place.
 */
export const GROUP_LEGEND_DECLARATIONS = `  max-width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;` as string;

/** Shared presentation for the muted description under a label. */
export const FIELD_DESCRIPTION_DECLARATIONS = `  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  overflow-wrap: anywhere;` as string;

/** A bordered surface on the panel background, outlined with `borderToken`. */
function surfaceDeclarations(borderToken: string): string {
  return [
    `  border: 1px solid var(${borderToken});`,
    "  border-radius: var(--snui-radius-md);",
    "  background: var(--snui-color-surface);",
  ].join("\n");
}

/**
 * The plain bordered surface a container paints on the panel background. Its
 * outline is decorative, so it takes the subtle border and leaves the 3:1
 * boundary to the controls inside it.
 */
export const SURFACE_DECLARATIONS = /* @__PURE__ */ surfaceDeclarations(
  "--snui-color-border-subtle",
);

/**
 * The same surface where its edge is the only boundary of something a reader
 * operates: the segmented group track and the data grid, a focusable scroll
 * region. It keeps the 3:1 boundary token when container outlines step back
 * to the subtle one.
 */
export const CONTROL_SURFACE_DECLARATIONS = /* @__PURE__ */ surfaceDeclarations(
  "--snui-color-border",
);

/**
 * The text a table caption takes, shared by Table and DataGrid so a panel
 * moving between them keeps its caption.
 */
export const TABLE_CAPTION_DECLARATIONS = `  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  text-align: start;
  overflow-wrap: anywhere;` as string;

/**
 * The width of the leading tone bar on Banner, Card, Toast, and a toned
 * section, which a selected data grid row matches with its own leading bar.
 */
export const TONE_BAR_WIDTH = "0.3rem";

/**
 * The row a checkbox or a radio is pressed by: the box, the text beside it,
 * and the target height the whole row carries, because the element the user
 * presses is the label rather than the box inside it.
 */
export const CONTROL_ROW_DECLARATIONS = `  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--snui-space-1) var(--snui-space-3);
  align-items: start;
  min-height: var(--snui-control-min-height);
  padding-block: var(--snui-space-2);
  cursor: pointer;` as string;

/**
 * The optical nudge a square glyph takes to sit on a line of text beside it,
 * for the checkbox box, the radio dial, and the card tone glyph. Stated once
 * so they cannot drift apart.
 */
export const GLYPH_BASELINE_NUDGE = "0.125rem";

/**
 * The tone glyph's box, in ems of the glyph's own size. A factor rather than
 * a length, so a slot set in another font size can be measured against it.
 */
export const TONE_GLYPH_BOX_EM = 1.125;

/**
 * The space a tone glyph keeps before its own text, in ems of the glyph's
 * size. The card, metric, badge, field error, and freshness glyphs take it as
 * a margin, and the CollapsibleSection tone slot holds it beside the toggle's
 * own gap. Progress, StatusIndicator, Banner, and Toast space their glyphs
 * with a spacing token instead.
 */
export const TONE_GLYPH_GAP_EM = 0.375;

/**
 * A glyph slot one line box tall at the top of its flex row, with the glyph
 * centered in it, so the glyph sits on the first line of the text beside it
 * however far that text wraps. Set on the text's baseline instead, a glyph
 * smaller than the text centered on its own small text, below the middle of
 * the line. Shared by the Progress tone mark and the CollapsibleSection tone
 * slot.
 */
export const FIRST_LINE_GLYPH_SLOT_DECLARATIONS = `  display: flex;
  flex: none;
  align-self: flex-start;
  align-items: center;
  block-size: 1lh;` as string;

/** The required and optional markers a field or checkbox label may hold. */
export const FIELD_MARKERS = ":is(.snui-optional-mark, .snui-required-mark)";

/**
 * Every descendant except a link and the link's own content, for a rule
 * that recolors a label or legend's text but leaves an operable link to its
 * own color.
 */
export const NON_LINK_DESCENDANTS = ":not(:any-link, :any-link *)";

/**
 * Forced colors flattens a control that opts out of automatic adjustment to
 * preserve a selected or danger state, which takes the focus ring with it.
 * Rebuild it with system colors so the author theme token cannot blend into
 * Highlight. Indented for use inside a forced-colors media block.
 */
export const FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS = /* @__PURE__ */ [
  `    outline: ${FOCUS_RING_WIDTH} solid CanvasText;`,
  "    outline-offset: 2px;",
  "    box-shadow: none;",
].join("\n");

/**
 * The invalid outline every field reconstructs under forced colors, which
 * flattens the danger border to a system color and would otherwise erase the
 * valid versus invalid distinction. Indented for a forced-colors media block.
 */
export const FORCED_COLORS_INVALID_DECLARATIONS =
  `    outline: 2px dashed CanvasText;
    outline-offset: 1px;` as string;

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
export const TONE_DOT_DECLARATIONS = /* @__PURE__ */ [
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
 * The rules that stretch a button row's actions across a narrow panel, written
 * for the inside of a container query block. Each button in the row grows,
 * and so does the wrapper a button with a visible blocked reason sits in.
 */
export function stretchedActionRules(row: string): string {
  return `  /*
   * A button that draws its blocked reason sits inside a wrapper, which is
   * then the row's child, so the stretch names both and the wrapper stretches
   * its button in turn.
   */
  ${row} > :is(.snui-button, .snui-button-reason) {
    flex: 1 1 auto;
  }

  ${row} > .snui-button-reason {
    align-items: stretch;
  }`;
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
