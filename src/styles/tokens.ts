import { ROOT_SELECTOR } from "../version.js";

export type ColorTokenName =
  | "--snui-color-background"
  | "--snui-color-surface"
  | "--snui-color-surface-raised"
  | "--snui-color-interactive-hover"
  | "--snui-color-hover-raised"
  | "--snui-color-text"
  | "--snui-color-text-muted"
  | "--snui-color-border"
  | "--snui-color-accent-fill"
  | "--snui-color-accent-fill-hover"
  | "--snui-color-on-accent"
  | "--snui-color-link"
  | "--snui-color-link-hover"
  | "--snui-color-link-visited"
  | "--snui-color-focus"
  | "--snui-color-success"
  | "--snui-color-warning"
  | "--snui-color-danger"
  | "--snui-color-info";

export type ThemeTokenSet = Readonly<Record<ColorTokenName, string>>;

export const LIGHT_TOKENS: ThemeTokenSet = {
  "--snui-color-background": "#f4f6f8",
  "--snui-color-surface": "#ffffff",
  "--snui-color-surface-raised": "#ffffff",
  "--snui-color-interactive-hover": "#eef2f7",
  "--snui-color-hover-raised": "#eef2f7",
  "--snui-color-text": "#18202c",
  "--snui-color-text-muted": "#596273",
  "--snui-color-border": "#7c8797",
  "--snui-color-accent-fill": "#2563eb",
  "--snui-color-accent-fill-hover": "#1d4ed8",
  "--snui-color-on-accent": "#ffffff",
  "--snui-color-link": "#1d4ed8",
  "--snui-color-link-hover": "#1e40af",
  "--snui-color-link-visited": "#6d28d9",
  "--snui-color-focus": "#1d4ed8",
  "--snui-color-success": "#166534",
  "--snui-color-warning": "#854d0e",
  "--snui-color-danger": "#b42318",
  "--snui-color-info": "#1e40af",
};

export const DARK_TOKENS: ThemeTokenSet = {
  "--snui-color-background": "#10131c",
  "--snui-color-surface": "#181d29",
  "--snui-color-surface-raised": "#202737",
  "--snui-color-interactive-hover": "#202737",
  "--snui-color-hover-raised": "#313847",
  "--snui-color-text": "#f5f7fa",
  "--snui-color-text-muted": "#b3bac7",
  "--snui-color-border": "#667085",
  "--snui-color-accent-fill": "#4c93ff",
  "--snui-color-accent-fill-hover": "#70a8ff",
  "--snui-color-on-accent": "#10131c",
  "--snui-color-link": "#92b8ff",
  "--snui-color-link-hover": "#b6ceff",
  "--snui-color-link-visited": "#d8b4fe",
  "--snui-color-focus": "#8db9ff",
  "--snui-color-success": "#75d59a",
  "--snui-color-warning": "#f7bd69",
  "--snui-color-danger": "#ff8b82",
  "--snui-color-info": "#92b8ff",
};

export const NIGHT_TOKENS: ThemeTokenSet = {
  "--snui-color-background": "#050000",
  "--snui-color-surface": "#100000",
  "--snui-color-surface-raised": "#190000",
  "--snui-color-interactive-hover": "#330000",
  "--snui-color-hover-raised": "#3d0a0a",
  "--snui-color-text": "#ff7878",
  "--snui-color-text-muted": "#d75b5b",
  "--snui-color-border": "#ad4040",
  "--snui-color-accent-fill": "#e54848",
  "--snui-color-accent-fill-hover": "#ff5a5a",
  "--snui-color-on-accent": "#190000",
  "--snui-color-link": "#ff9292",
  "--snui-color-link-hover": "#ffb0b0",
  "--snui-color-link-visited": "#e87373",
  "--snui-color-focus": "#ff6b6b",
  "--snui-color-success": "#ff8a7a",
  "--snui-color-warning": "#ffad66",
  "--snui-color-danger": "#ff6b6b",
  "--snui-color-info": "#ef7777",
};

function renderTokenBlock(tokens: ThemeTokenSet): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

/*
 * Elevation is per theme: a shadow tuned for light surfaces is nearly
 * invisible on dark ones, so Dark and Night carry stronger alphas.
 */
const LIGHT_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(15 23 42 / 14%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(15 23 42 / 22%);`;
const DARK_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(0 0 0 / 50%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(0 0 0 / 65%);`;
const NIGHT_SHADOW_BLOCK = `  --snui-shadow-flat: none;
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(90 0 0 / 28%);
  --snui-shadow-overlay: 0 0.5rem 1.5rem rgb(90 0 0 / 42%);`;

const LIGHT_BLOCK = `${renderTokenBlock(LIGHT_TOKENS)}
${LIGHT_SHADOW_BLOCK}`;
const DARK_BLOCK = `${renderTokenBlock(DARK_TOKENS)}
${DARK_SHADOW_BLOCK}`;
const NIGHT_BLOCK = `${renderTokenBlock(NIGHT_TOKENS)}
${NIGHT_SHADOW_BLOCK}`;

/** Inline-size breakpoint below which panels switch to their narrow layout. */
export const CONTAINER_BREAKPOINT_NARROW = "37.5rem";

export const PUBLIC_FOUNDATION_TOKEN_NAMES = [
  "--snui-font-family",
  "--snui-font-size",
  "--snui-font-size-sm",
  "--snui-font-size-xs",
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
  "--snui-ease-standard",
  "--snui-transition-fast",
  "--snui-transition-normal",
  "--snui-transition-slow",
  "--snui-motion-spin",
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

export const TOKEN_STYLES = `
${ROOT_SELECTOR} {
${LIGHT_BLOCK}
  --snui-font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --snui-font-size: 0.9375rem;
  --snui-font-size-sm: 0.875rem;
  --snui-font-size-xs: 0.8125rem;
  --snui-font-weight-medium: 600;
  --snui-font-weight-semibold: 650;
  --snui-font-weight-bold: 700;
  --snui-font-weight-heavy: 800;
  --snui-line-height: 1.5;
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
  --snui-range-track-color: var(--snui-color-border);
  --snui-input-group-control-min: 7rem;
  --snui-input-group-control-basis: 12rem;
  --snui-content-width-standard: 72rem;
  --snui-content-width-wide: 96rem;
  --snui-focus-ring: 0 0 0 3px color-mix(in srgb, var(--snui-color-focus) 38%, transparent);
  --snui-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --snui-transition-fast: 140ms ease;
  --snui-transition-normal: 240ms var(--snui-ease-standard);
  --snui-transition-slow: 360ms var(--snui-ease-standard);
  --snui-motion-spin: 0.8s;
  --snui-z-sticky: 2;
  --snui-z-overlay: 100;
  --snui-z-modal: 200;
  --snui-z-toast: 300;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  ${ROOT_SELECTOR}:not([data-snui-theme]) {
${DARK_BLOCK}
    color-scheme: dark;
  }
}

[data-bs-theme="light"] ${ROOT_SELECTOR}:not([data-snui-theme]),
[data-coreui-theme="light"] ${ROOT_SELECTOR}:not([data-snui-theme]) {
${LIGHT_BLOCK}
  color-scheme: light;
}

[data-bs-theme="dark"] ${ROOT_SELECTOR}:not([data-snui-theme]),
[data-coreui-theme="dark"] ${ROOT_SELECTOR}:not([data-snui-theme]),
.dark-mode ${ROOT_SELECTOR}:not([data-snui-theme]) {
${DARK_BLOCK}
  color-scheme: dark;
}

${ROOT_SELECTOR}[data-snui-theme="light"] {
${LIGHT_BLOCK}
  color-scheme: light;
}

${ROOT_SELECTOR}[data-snui-theme="dark"] {
${DARK_BLOCK}
  color-scheme: dark;
}

${ROOT_SELECTOR}[data-snui-theme="night"] {
${NIGHT_BLOCK}
  color-scheme: dark;
}

@media (any-pointer: coarse) {
  ${ROOT_SELECTOR} {
    --snui-control-min-height: 2.75rem;
    --snui-range-thumb-size: 2.75rem;
  }
}
`;
