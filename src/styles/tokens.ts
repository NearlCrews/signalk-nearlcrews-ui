import { ROOT_SELECTOR } from "../version.js";

export type ColorTokenName =
  | "--snui-color-background"
  | "--snui-color-surface"
  | "--snui-color-surface-raised"
  | "--snui-color-surface-stripe"
  | "--snui-color-interactive-hover"
  | "--snui-color-hover-raised"
  | "--snui-color-surface-hover"
  | "--snui-color-surface-raised-hover"
  | "--snui-color-text"
  | "--snui-color-text-muted"
  | "--snui-color-text-disabled"
  | "--snui-color-border"
  | "--snui-color-track"
  | "--snui-color-accent-fill"
  | "--snui-color-accent-fill-hover"
  | "--snui-color-accent-subtle"
  | "--snui-color-on-accent"
  | "--snui-color-link"
  | "--snui-color-link-hover"
  | "--snui-color-link-visited"
  | "--snui-color-focus"
  | "--snui-color-success"
  | "--snui-color-success-subtle"
  | "--snui-color-warning"
  | "--snui-color-warning-subtle"
  | "--snui-color-danger"
  | "--snui-color-danger-subtle"
  | "--snui-color-info"
  | "--snui-color-info-subtle";

type HoverAliasTokenName =
  | "--snui-color-surface-hover"
  | "--snui-color-surface-raised-hover";

export type ThemeTokenSet = Readonly<Record<ColorTokenName, string>>;

type ThemeTokenSource = Readonly<
  Record<Exclude<ColorTokenName, HoverAliasTokenName>, string>
>;

/**
 * `--snui-color-surface-hover` and `--snui-color-surface-raised-hover` name
 * the same two fills as `--snui-color-interactive-hover` and
 * `--snui-color-hover-raised` with one word order (surface first, then state).
 * Both spellings are public; the aliases are derived so a pair cannot drift.
 */
function withHoverAliases(tokens: ThemeTokenSource): ThemeTokenSet {
  return {
    ...tokens,
    "--snui-color-surface-hover": tokens["--snui-color-interactive-hover"],
    "--snui-color-surface-raised-hover": tokens["--snui-color-hover-raised"],
  };
}

/*
 * Light keeps surface and surface-raised both white on purpose: a raised
 * element (menu, popover, metric on a card) is distinguished by its border and
 * shadow, and zebra rows take surface-stripe instead. The subtle fills are
 * tints a hair above the hover fill so text and the tone's own color stay
 * readable on them.
 */
export const LIGHT_TOKENS: ThemeTokenSet = withHoverAliases({
  "--snui-color-background": "#f4f6f8",
  "--snui-color-surface": "#ffffff",
  "--snui-color-surface-raised": "#ffffff",
  "--snui-color-surface-stripe": "#f3f5f9",
  "--snui-color-interactive-hover": "#eef2f7",
  "--snui-color-hover-raised": "#eef2f7",
  "--snui-color-text": "#18202c",
  "--snui-color-text-muted": "#596273",
  "--snui-color-text-disabled": "#7a8494",
  "--snui-color-border": "#7c8797",
  "--snui-color-track": "#cbd3dd",
  "--snui-color-accent-fill": "#2563eb",
  "--snui-color-accent-fill-hover": "#1d4ed8",
  "--snui-color-accent-subtle": "#e3ebfb",
  "--snui-color-on-accent": "#ffffff",
  "--snui-color-link": "#1d4ed8",
  "--snui-color-link-hover": "#1e40af",
  "--snui-color-link-visited": "#6d28d9",
  "--snui-color-focus": "#1d4ed8",
  "--snui-color-success": "#166534",
  "--snui-color-success-subtle": "#e0f3e7",
  "--snui-color-warning": "#854d0e",
  "--snui-color-warning-subtle": "#fbeed6",
  "--snui-color-danger": "#b42318",
  "--snui-color-danger-subtle": "#fbe5e2",
  "--snui-color-info": "#1e40af",
  "--snui-color-info-subtle": "#e3ebfb",
});

/*
 * Dark accent fills are light enough for the dark on-accent label to clear
 * APCA Lc 60 as well as WCAG AA, so button labels read at body-text strength.
 */
export const DARK_TOKENS: ThemeTokenSet = withHoverAliases({
  "--snui-color-background": "#10131c",
  "--snui-color-surface": "#181d29",
  "--snui-color-surface-raised": "#202737",
  "--snui-color-surface-stripe": "#1c2230",
  "--snui-color-interactive-hover": "#202737",
  "--snui-color-hover-raised": "#313847",
  "--snui-color-text": "#f5f7fa",
  "--snui-color-text-muted": "#b3bac7",
  "--snui-color-text-disabled": "#7f8898",
  "--snui-color-border": "#667085",
  "--snui-color-track": "#3b4354",
  "--snui-color-accent-fill": "#83b3ff",
  "--snui-color-accent-fill-hover": "#9cc3ff",
  "--snui-color-accent-subtle": "#1d2b48",
  "--snui-color-on-accent": "#10131c",
  "--snui-color-link": "#92b8ff",
  "--snui-color-link-hover": "#b6ceff",
  "--snui-color-link-visited": "#d8b4fe",
  "--snui-color-focus": "#8db9ff",
  "--snui-color-success": "#75d59a",
  "--snui-color-success-subtle": "#183226",
  "--snui-color-warning": "#f7bd69",
  "--snui-color-warning-subtle": "#3a2d14",
  "--snui-color-danger": "#ff8b82",
  "--snui-color-danger-subtle": "#40201f",
  "--snui-color-info": "#92b8ff",
  "--snui-color-info-subtle": "#1d2b48",
});

/*
 * Night is red-preserving. Every foreground keeps green and blue at or below
 * 0x40, so almost all of the light a panel emits is red, which dark-adapted
 * eyes at a helm tolerate. Text-class tokens (text, links, focus, the four
 * tones, and the accent fills) also keep red at or above 0xe0 so they stay
 * readable; border and text-disabled deliberately carry less red, because
 * brightness is the only hierarchy the cap leaves. The tones and the subtle
 * fills therefore differ little or not at all: shape, glyph, and tone label
 * carry status in Night, never hue. The cap also bounds contrast: the
 * brightest allowed text on the surface is 5.9:1, about APCA Lc 41, so Night
 * is gated on WCAG AA and the APCA column in the contrast tests is advisory.
 */
export const NIGHT_TOKENS: ThemeTokenSet = withHoverAliases({
  "--snui-color-background": "#050000",
  "--snui-color-surface": "#100000",
  "--snui-color-surface-raised": "#190000",
  "--snui-color-surface-stripe": "#260000",
  "--snui-color-interactive-hover": "#330000",
  "--snui-color-hover-raised": "#300606",
  "--snui-color-text": "#ff4040",
  "--snui-color-text-muted": "#f23838",
  "--snui-color-text-disabled": "#b03030",
  "--snui-color-border": "#c03030",
  "--snui-color-track": "#5e1212",
  "--snui-color-accent-fill": "#ec3838",
  "--snui-color-accent-fill-hover": "#ff4040",
  "--snui-color-accent-subtle": "#2c0000",
  "--snui-color-on-accent": "#100000",
  "--snui-color-link": "#ff3838",
  "--snui-color-link-hover": "#ff4040",
  "--snui-color-link-visited": "#f03434",
  "--snui-color-focus": "#ff4040",
  "--snui-color-success": "#f24040",
  "--snui-color-success-subtle": "#2c0000",
  "--snui-color-warning": "#ff4040",
  "--snui-color-warning-subtle": "#2c0000",
  "--snui-color-danger": "#ff3030",
  "--snui-color-danger-subtle": "#2c0000",
  "--snui-color-info": "#e84040",
  "--snui-color-info-subtle": "#2c0000",
});

function renderTokenBlock(tokens: ThemeTokenSet): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

/*
 * Elevation and the dialog scrim are per theme: a shadow or scrim tuned for
 * light surfaces is nearly invisible on dark ones, so Dark and Night carry
 * stronger alphas and each theme's scrim shares its shadow color.
 */
const LIGHT_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(15 23 42 / 14%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(15 23 42 / 22%);
  --snui-color-scrim: rgb(15 23 42 / 45%);`;
const DARK_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(0 0 0 / 50%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(0 0 0 / 65%);
  --snui-color-scrim: rgb(0 0 0 / 45%);`;
const NIGHT_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(90 0 0 / 28%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(90 0 0 / 42%);
  --snui-color-scrim: rgb(90 0 0 / 45%);`;

const LIGHT_BLOCK = `${renderTokenBlock(LIGHT_TOKENS)}
${LIGHT_SHADOW_BLOCK}`;
const DARK_BLOCK = `${renderTokenBlock(DARK_TOKENS)}
${DARK_SHADOW_BLOCK}`;
const NIGHT_BLOCK = `${renderTokenBlock(NIGHT_TOKENS)}
${NIGHT_SHADOW_BLOCK}`;

/**
 * The `container-name` `PanelRoot` sets on itself, together with
 * `container-type: inline-size`. Public API: a consumer writes
 * `@container snui-panel (...)` against it so its own rules respond to the
 * panel's width rather than the viewport's, which is what the panel actually
 * gets inside the Signal K Admin frame.
 */
export const PANEL_CONTAINER_NAME = "snui-panel";

/**
 * Inline-size breakpoint below which panels switch to their narrow layout.
 * Public API, and published as a string rather than a CSS custom property
 * because a container or media query condition cannot read one: a consumer
 * that wants to turn at the same width as the package interpolates this
 * value, or writes the documented number.
 */
export const CONTAINER_BREAKPOINT_NARROW = "37.5rem";

/**
 * Duration of --snui-transition-fast in milliseconds. Exit timers that must
 * outlive the fast transition read this so the number cannot drift from the
 * token.
 */
export const TRANSITION_FAST_MS = 140;

/** Initial data-grid row-height estimates in pixels, per density. */
export const DATA_GRID_ROW_HEIGHTS = {
  compact: 32,
  default: 44,
} as const;

/*
 * The type stack is system fonts, so weights have to exist in static faces:
 * Segoe UI, Roboto, and Liberation Sans ship 400 and 700, most also 500 and
 * 600 (Segoe UI Semibold, Roboto Medium), and none ship 650, which snapped to
 * 700 and collapsed medium, semibold, and bold into one weight. 500, 600, 700,
 * and 800 stay distinct where the face has them and degrade to the nearest
 * available weight where it does not.
 */
const TYPE_BLOCK = `  --snui-font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --snui-font-family-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --snui-font-size: 0.9375rem;
  --snui-font-size-sm: 0.875rem;
  --snui-font-size-xs: 0.8125rem;
  --snui-font-size-lg: 1.125rem;
  --snui-font-size-xl: 1.25rem;
  --snui-font-size-2xl: 1.5rem;
  --snui-font-weight-medium: 500;
  --snui-font-weight-semibold: 600;
  --snui-font-weight-bold: 700;
  --snui-font-weight-heavy: 800;
  --snui-line-height: 1.5;`;

/*
 * Overlay layers sit above Signal K Admin's fixed chrome, which follows the
 * Bootstrap scale: the fixed header at $zindex-sticky (1020) and the sidebar at
 * 1019. The values mirror Bootstrap's own offcanvas-backdrop (1040),
 * modal-backdrop (1050), and toast (1090) layers, so a dialog scrim dims the
 * header and a toast paints above it. The sticky layer is panel-local.
 */
const Z_LAYER_BLOCK = `  --snui-z-sticky: 2;
  --snui-z-overlay: 1040;
  --snui-z-modal: 1050;
  --snui-z-toast: 1090;`;

export const PUBLIC_FOUNDATION_TOKEN_NAMES = [
  "--snui-font-family",
  "--snui-font-family-mono",
  "--snui-font-size",
  "--snui-font-size-sm",
  "--snui-font-size-xs",
  "--snui-font-size-lg",
  "--snui-font-size-xl",
  "--snui-font-size-2xl",
  "--snui-font-weight-medium",
  "--snui-font-weight-semibold",
  "--snui-font-weight-bold",
  "--snui-font-weight-heavy",
  "--snui-line-height",
  "--snui-space-1",
  "--snui-space-2",
  "--snui-space-3",
  "--snui-space-4",
  "--snui-space-5",
  "--snui-space-6",
  "--snui-space-7",
  "--snui-space-8",
  "--snui-radius-sm",
  "--snui-radius-md",
  "--snui-radius-lg",
  "--snui-radius-pill",
  "--snui-control-min-height",
  "--snui-range-thumb-size",
  "--snui-range-progress-color",
  "--snui-range-track-color",
  "--snui-input-group-control-min",
  "--snui-input-group-control-basis",
  "--snui-content-width-standard",
  "--snui-content-width-wide",
  "--snui-focus-ring",
  "--snui-shadow-flat",
  "--snui-shadow-raised",
  "--snui-shadow-overlay",
  "--snui-color-scrim",
  "--snui-ease-standard",
  "--snui-transition-fast",
  "--snui-transition-normal",
  "--snui-transition-slow",
  "--snui-motion-spin",
  "--snui-z-sticky",
  "--snui-z-overlay",
  "--snui-z-modal",
  "--snui-z-toast",
] as const;

export type FoundationTokenName =
  (typeof PUBLIC_FOUNDATION_TOKEN_NAMES)[number];

export const PUBLIC_COLOR_TOKEN_NAMES = Object.freeze(
  Object.keys(LIGHT_TOKENS) as ColorTokenName[],
);

export const PUBLIC_TOKEN_NAMES: readonly (
  | ColorTokenName
  | FoundationTokenName
)[] = Object.freeze([
  ...PUBLIC_COLOR_TOKEN_NAMES,
  ...PUBLIC_FOUNDATION_TOKEN_NAMES,
]);

/**
 * The root class of `signalk-nearlcrews-ui/tokens.css`. See the design contract
 * for what the class guarantees.
 *
 * @internal The class name is public API; importing this constant is not.
 */
export const TOKENS_ROOT_CLASS = "snui-tokens";

/**
 * Renders the token declarations for one root selector, so the component styles
 * and the framework-neutral stylesheet cannot describe different palettes.
 *
 * The focus ring is two-tone: a surface-colored band fills the outline offset
 * so the ring keeps its own boundary beside a danger or accent edge, and a soft
 * focus-colored halo sits outside the outline.
 *
 * @internal
 */
export function renderTokenStyles(rootSelector: string): string {
  return `
${rootSelector} {
${LIGHT_BLOCK}
${TYPE_BLOCK}
  --snui-space-1: 0.25rem;
  --snui-space-2: 0.5rem;
  --snui-space-3: 0.75rem;
  --snui-space-4: 1rem;
  --snui-space-5: 1.5rem;
  --snui-space-6: 2rem;
  --snui-space-7: 2.5rem;
  --snui-space-8: 3rem;
  --snui-radius-sm: 0.375rem;
  --snui-radius-md: 0.625rem;
  --snui-radius-lg: 0.875rem;
  --snui-radius-pill: 999px;
  --snui-control-min-height: 2.5rem;
  --snui-range-thumb-size: 1.5rem;
  --snui-range-progress-color: var(--snui-color-accent-fill);
  --snui-range-track-color: var(--snui-color-track);
  --snui-input-group-control-min: 7rem;
  --snui-input-group-control-basis: 12rem;
  --snui-content-width-standard: 72rem;
  --snui-content-width-wide: 96rem;
  --snui-focus-ring: 0 0 0 2px var(--snui-color-surface), 0 0 0 6px color-mix(in srgb, var(--snui-color-focus) 38%, transparent);
  --snui-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --snui-transition-fast: ${String(TRANSITION_FAST_MS)}ms var(--snui-ease-standard);
  --snui-transition-normal: 240ms var(--snui-ease-standard);
  --snui-transition-slow: 360ms var(--snui-ease-standard);
  --snui-motion-spin: 0.8s;
${Z_LAYER_BLOCK}
  color-scheme: light;
}

[data-bs-theme="light"] ${rootSelector}:not([data-snui-theme]),
[data-coreui-theme="light"] ${rootSelector}:not([data-snui-theme]) {
${LIGHT_BLOCK}
  color-scheme: light;
}

[data-bs-theme="dark"] ${rootSelector}:not([data-snui-theme]),
[data-coreui-theme="dark"] ${rootSelector}:not([data-snui-theme]),
.dark-mode ${rootSelector}:not([data-snui-theme]) {
${DARK_BLOCK}
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  ${rootSelector}[data-snui-theme="system"] {
${DARK_BLOCK}
    color-scheme: dark;
  }
}

@media (prefers-color-scheme: light) {
  ${rootSelector}[data-snui-theme="system"] {
${LIGHT_BLOCK}
    color-scheme: light;
  }
}

${rootSelector}[data-snui-theme="light"] {
${LIGHT_BLOCK}
  color-scheme: light;
}

${rootSelector}[data-snui-theme="dark"] {
${DARK_BLOCK}
  color-scheme: dark;
}

${rootSelector}[data-snui-theme="night"] {
${NIGHT_BLOCK}
  color-scheme: dark;
}

@media (any-pointer: coarse) {
  ${rootSelector} {
    --snui-control-min-height: 2.75rem;
    --snui-range-thumb-size: 2.75rem;
  }
}
`;
}

export const TOKEN_STYLES = renderTokenStyles(ROOT_SELECTOR);
