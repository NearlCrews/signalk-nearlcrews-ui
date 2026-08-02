/**
 * Declaration blocks shared by more than one rule.
 *
 * Each fragment is interpolated where its rule already lives rather than
 * hoisted into a single selector, so module order, and therefore the cascade,
 * is unchanged. Only the declarations are written once.
 */

const VISUALLY_HIDDEN_PROPERTIES: readonly (readonly [string, string])[] = [
  ["position", "absolute"],
  ["width", "1px"],
  ["height", "1px"],
  ["padding", "0"],
  ["margin", "-1px"],
  ["overflow", "hidden"],
  ["clip", "rect(0, 0, 0, 0)"],
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
 * suit rows and menu items; outset rings with the soft shadow suit controls.
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

/** Disabled presentation shared by every control. */
export const DISABLED_DECLARATIONS = [
  "  cursor: not-allowed;",
  "  opacity: 0.58;",
].join("\n");

/** Pressed-state tint painted over the interactive hover fill. */
export const PRESSED_FILL_DECLARATION =
  "  background: color-mix(in srgb, var(--snui-color-accent-fill) 12%, var(--snui-color-interactive-hover));";

/** Dot shape per semantic tone, keyed by the tone modifier. */
const TONE_DOT_SHAPES: readonly (readonly [string, string])[] = [
  ["info", "  border-radius: var(--snui-radius-sm);"],
  [
    "success",
    "  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);\n  border-radius: 0;",
  ],
  [
    "warning",
    "  clip-path: polygon(50% 0, 100% 100%, 0 100%);\n  border-radius: 0;",
  ],
  [
    "danger",
    "  clip-path: polygon(\n    50% 0,\n    100% 25%,\n    100% 75%,\n    50% 100%,\n    0 75%,\n    0 25%\n  );\n  border-radius: 0;",
  ],
];

/**
 * Gives each tone a distinct dot shape, so a state never depends on color
 * alone for someone who cannot distinguish the hues. The block owns the tone
 * modifier and the dot element, so indicators and toasts share one set of
 * shapes.
 */
export function toneDotShapeRules(block: string, dotClass: string): string {
  return TONE_DOT_SHAPES.map(
    ([tone, declarations]) =>
      `.${block}--${tone} .${dotClass} {\n${declarations}\n}`,
  ).join("\n\n");
}
