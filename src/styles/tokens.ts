import { ROOT_SELECTOR } from "../version.js";

type ColorTokenName =
  | "--snui-color-background"
  | "--snui-color-surface"
  | "--snui-color-surface-raised"
  | "--snui-color-text"
  | "--snui-color-text-muted"
  | "--snui-color-border"
  | "--snui-color-accent-fill"
  | "--snui-color-accent-fill-hover"
  | "--snui-color-on-accent"
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
  "--snui-color-text": "#18202c",
  "--snui-color-text-muted": "#596273",
  "--snui-color-border": "#7c8797",
  "--snui-color-accent-fill": "#2563eb",
  "--snui-color-accent-fill-hover": "#1d4ed8",
  "--snui-color-on-accent": "#ffffff",
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
  "--snui-color-text": "#f5f7fa",
  "--snui-color-text-muted": "#b3bac7",
  "--snui-color-border": "#667085",
  "--snui-color-accent-fill": "#4c93ff",
  "--snui-color-accent-fill-hover": "#70a8ff",
  "--snui-color-on-accent": "#10131c",
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
  "--snui-color-text": "#ff7878",
  "--snui-color-text-muted": "#d05252",
  "--snui-color-border": "#a63d3d",
  "--snui-color-accent-fill": "#e54848",
  "--snui-color-accent-fill-hover": "#ff5a5a",
  "--snui-color-on-accent": "#190000",
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

const LIGHT_BLOCK = renderTokenBlock(LIGHT_TOKENS);
const DARK_BLOCK = renderTokenBlock(DARK_TOKENS);
const NIGHT_BLOCK = renderTokenBlock(NIGHT_TOKENS);

export const TOKEN_STYLES = `
${ROOT_SELECTOR} {
${LIGHT_BLOCK}
  --snui-font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --snui-font-size: 0.9375rem;
  --snui-line-height: 1.5;
  --snui-space-1: 0.25rem;
  --snui-space-2: 0.5rem;
  --snui-space-3: 0.75rem;
  --snui-space-4: 1rem;
  --snui-space-5: 1.5rem;
  --snui-space-6: 2rem;
  --snui-radius-sm: 0.375rem;
  --snui-radius-md: 0.625rem;
  --snui-radius-lg: 0.875rem;
  --snui-control-min-height: 2.5rem;
  --snui-content-max-width: 72rem;
  --snui-focus-ring: 0 0 0 3px color-mix(in srgb, var(--snui-color-focus) 38%, transparent);
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(15 23 42 / 14%);
  --snui-transition-fast: 140ms ease;
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
  --snui-shadow-raised: 0 0.125rem 0.5rem rgb(90 0 0 / 28%);
}

@media (pointer: coarse) {
  ${ROOT_SELECTOR} {
    --snui-control-min-height: 2.75rem;
  }
}
`;
