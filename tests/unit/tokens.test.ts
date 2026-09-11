import { describe, expect, it } from "vitest";
import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { PANEL_STYLES } from "../../src/styles/index.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import {
  CONTAINER_BREAKPOINT_NARROW,
  PUBLIC_TOKEN_NAMES,
  renderTokenStyles,
  TOKEN_STYLES,
  TOKENS_ROOT_CLASS,
} from "../../src/styles/tokens.js";
import { ROOT_SELECTOR } from "../../src/version.js";

describe("design token scales", () => {
  it("defines every public token in the token stylesheet", () => {
    for (const name of PUBLIC_TOKEN_NAMES) {
      expect(TOKEN_STYLES, `missing definition for ${name}`).toContain(
        `${name}:`,
      );
    }
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

  it("paints a two-tone focus ring", () => {
    expect(TOKEN_STYLES).toContain(
      "--snui-focus-ring: 0 0 0 2px var(--snui-color-surface), 0 0 0 6px color-mix(in srgb, var(--snui-color-focus) 38%, transparent);",
    );
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

  it("keeps 999px behind the pill radius token", () => {
    const allStyles = STYLE_MODULES.map((module) => module.styles).join("\n");
    const occurrences = allStyles.split("999px").length - 1;
    expect(occurrences).toBe(1);
    expect(PANEL_STYLES).toContain("--snui-radius-pill: 999px;");
  });

  it("routes every narrow-panel container query through the shared breakpoint", () => {
    const queries = STYLE_MODULES.flatMap((module) =>
      [
        ...module.styles.matchAll(
          /@container snui-panel \(max-width: ([^)]+)\)/g,
        ),
      ].map((match) => match[1]),
    );

    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect(query).toBe(CONTAINER_BREAKPOINT_NARROW);
    }
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
