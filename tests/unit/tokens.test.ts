import { describe, expect, it } from "vitest";
import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { PANEL_STYLES } from "../../src/styles/index.js";
import {
  CONTAINER_BREAKPOINT_NARROW,
  PUBLIC_TOKEN_NAMES,
  TOKEN_STYLES,
} from "../../src/styles/tokens.js";

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
      "--snui-font-size-sm": "0.875rem",
      "--snui-font-size-xs": "0.8125rem",
      "--snui-font-weight-medium": "600",
      "--snui-font-weight-semibold": "650",
      "--snui-font-weight-bold": "700",
      "--snui-font-weight-heavy": "800",
      "--snui-space-7": "2.5rem",
      "--snui-space-8": "3rem",
      "--snui-radius-pill": "999px",
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(TOKEN_STYLES).toContain(`${name}: ${value};`);
    }
  });

  it("keeps the motion scale values stable", () => {
    expect(TOKEN_STYLES).toContain(
      "--snui-ease-standard: cubic-bezier(0.2, 0, 0, 1);",
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
    const occurrences = PANEL_STYLES.split("999px").length - 1;
    expect(occurrences).toBe(1);
    expect(PANEL_STYLES).toContain("--snui-radius-pill: 999px;");
  });

  it("routes every narrow-panel container query through the shared breakpoint", () => {
    const queries = [
      ...PANEL_STYLES.matchAll(/@container snui-panel \(max-width: ([^)]+)\)/g),
    ].map((match) => match[1]);

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
