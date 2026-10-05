import { describe, expect, it } from "vitest";
import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { PANEL_STYLES } from "../../src/styles/root-sheet.js";
import {
  DATA_GRID_ROW_HEIGHTS_COARSE,
  DATA_GRID_ROW_HEIGHTS_FINE,
  PUBLIC_FOUNDATION_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  renderTokenStyles,
  TOKEN_STYLES,
  TOKENS_ROOT_CLASS,
} from "../../src/styles/tokens.js";
import { ROOT_SELECTOR } from "../../src/version.js";
import { ALL_MODULE_STYLES, stylesFrom } from "../css-helpers.js";

describe("design token scales", () => {
  it("exports the complete public foundation token surface", () => {
    expect(PUBLIC_FOUNDATION_TOKEN_NAMES).toEqual([
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
      "--snui-field-inline-label-min",
      "--snui-grid-track-min",
      "--snui-action-bar-surface",
      "--snui-content-width-standard",
      "--snui-content-width-wide",
      "--snui-color-focus-ring-band",
      "--snui-focus-ring",
      "--snui-focus-ring-width",
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
    ]);
    expect(new Set(PUBLIC_TOKEN_NAMES).size).toBe(PUBLIC_TOKEN_NAMES.length);
  });

  it("keeps the typography, spacing, and radius scale values stable", () => {
    const expected: Record<string, string> = {
      "--snui-font-family-mono":
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      "--snui-font-size": "0.9375rem",
      "--snui-font-size-sm": "0.875rem",
      "--snui-font-size-xs": "0.8125rem",
      "--snui-font-size-lg": "1.125rem",
      "--snui-font-size-xl": "1.25rem",
      "--snui-font-size-2xl": "1.5rem",
      "--snui-font-weight-medium": "500",
      "--snui-font-weight-semibold": "600",
      "--snui-font-weight-bold": "700",
      "--snui-font-weight-heavy": "800",
      "--snui-space-7": "2.5rem",
      "--snui-space-8": "3rem",
      "--snui-radius-pill": "999px",
      "--snui-range-track-color": "var(--snui-color-track)",
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(TOKEN_STYLES).toContain(`${name}: ${value};`);
    }
  });

  it("layers overlays above the Admin host's fixed chrome", () => {
    // Bootstrap's fixed header sits at 1020 and the sidebar at 1019.
    expect(TOKEN_STYLES).toContain("--snui-z-sticky: 2;");
    expect(TOKEN_STYLES).toContain("--snui-z-overlay: 1040;");
    expect(TOKEN_STYLES).toContain("--snui-z-modal: 1050;");
    expect(TOKEN_STYLES).toContain("--snui-z-toast: 1090;");
  });

  it("paints a two-tone focus ring over a remappable band", () => {
    expect(TOKEN_STYLES).toContain(
      "--snui-color-focus-ring-band: var(--snui-color-surface);",
    );
    expect(TOKEN_STYLES).toContain(
      `--snui-focus-ring:
    0 0 0 2px var(--snui-color-focus-ring-band),
    0 0 0 6px color-mix(in srgb, var(--snui-color-focus) 38%, transparent);`,
    );
  });

  it("emits each hover alias as a reference to the token it names", () => {
    // A copied value would keep the packaged fill when a consumer overrides
    // the token, or when a dialog remaps it to the raised fill.
    expect(TOKEN_STYLES).toContain(
      "--snui-color-surface-hover: var(--snui-color-interactive-hover);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-color-surface-raised-hover: var(--snui-color-hover-raised);",
    );
  });

  it("carries the light palette once, in the base block", () => {
    // Light is the base, so a host light marker and a light system preference
    // have nothing to declare; only the dark markers get a block.
    expect(TOKEN_STYLES).not.toContain('[data-bs-theme="light"]');
    expect(TOKEN_STYLES).not.toContain("@media (prefers-color-scheme: light)");
    expect(TOKEN_STYLES).toContain('[data-bs-theme="dark"]');
  });

  it("keeps the motion scale values stable on one easing curve", () => {
    expect(TOKEN_STYLES).toContain(
      "--snui-ease-standard: cubic-bezier(0.2, 0, 0, 1);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-transition-fast: 140ms var(--snui-ease-standard);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-transition-normal: 240ms var(--snui-ease-standard);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-transition-slow: 360ms var(--snui-ease-standard);",
    );
    expect(TOKEN_STYLES).toContain("--snui-motion-spin: 0.8s;");
  });

  it("gives dark and night themes their own elevation shadows", () => {
    expect(TOKEN_STYLES).toContain(
      "--snui-shadow-raised: 0 0.125rem 0.5rem rgb(0 0 0 / 50%);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-shadow-overlay: 0 0.5rem 1.5rem rgb(0 0 0 / 65%);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-shadow-raised: 0 0.125rem 0.5rem rgb(90 0 0 / 28%);",
    );
    expect(TOKEN_STYLES).toContain(
      "--snui-shadow-overlay: 0 0.5rem 1.5rem rgb(90 0 0 / 42%);",
    );
  });

  it("gives the coarse pointer both target size and target separation", () => {
    const coarse = stylesFrom(TOKEN_STYLES, "@media (any-pointer: coarse)");
    expect(coarse).toContain("--snui-space-2: 0.75rem;");
    expect(coarse).toContain("--snui-control-min-height: 2.75rem;");
    expect(coarse).toContain("--snui-range-thumb-size: 2.75rem;");
  });

  it("estimates a row from the control height its pointer resolves to", () => {
    // 2.75rem coarse and 2.5rem fine at a 16 pixel root, with a compact row
    // one --snui-space-3 (0.75rem) shorter than the default row.
    expect(
      DATA_GRID_ROW_HEIGHTS_COARSE.default - DATA_GRID_ROW_HEIGHTS_FINE.default,
    ).toBe(4);
    expect(
      DATA_GRID_ROW_HEIGHTS_COARSE.compact - DATA_GRID_ROW_HEIGHTS_FINE.compact,
    ).toBe(4);
    for (const heights of [
      DATA_GRID_ROW_HEIGHTS_COARSE,
      DATA_GRID_ROW_HEIGHTS_FINE,
    ]) {
      expect(heights.default - heights.compact).toBe(12);
    }
  });

  it("keeps 999px behind the pill radius token", () => {
    const occurrences = ALL_MODULE_STYLES.split("999px").length - 1;
    expect(occurrences).toBe(1);
    expect(PANEL_STYLES).toContain("--snui-radius-pill: 999px;");
  });

  it("drives the spinner duration from the motion token", () => {
    expect(CONTROL_STYLES).toContain("var(--snui-motion-spin)");
    expect(CONTROL_STYLES).not.toContain("0.8s");
  });
});

/*
 * The parity assertion carries the rest of this sheet's coverage: everything
 * proven about TOKEN_STYLES elsewhere holds for a string that differs from it
 * only by its root selector, so token coverage and CSS validity are not
 * reasserted here.
 */
describe("framework-neutral token stylesheet", () => {
  const neutralStyles = renderTokenStyles(`.${TOKENS_ROOT_CLASS}`);

  it("differs from the component token stylesheet only by its root selector", () => {
    expect(
      neutralStyles.split(`.${TOKENS_ROOT_CLASS}`).join(ROOT_SELECTOR),
    ).toBe(TOKEN_STYLES);
  });

  it("carries no versioned root", () => {
    for (const marker of ["snui-root", "data-snui-version"]) {
      expect(neutralStyles).not.toContain(marker);
    }
  });

  it("declares nothing but custom properties and color-scheme", () => {
    const properties = [...neutralStyles.matchAll(/^\s+([\w-]+)\s*:/gm)].map(
      (match) => match[1] ?? "",
    );

    expect([
      ...new Set(properties.filter((name) => !name.startsWith("--"))),
    ]).toEqual(["color-scheme"]);
  });
});
