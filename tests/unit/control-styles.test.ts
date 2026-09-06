import { describe, expect, it } from "vitest";

import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { FORM_STYLES } from "../../src/styles/forms.js";

/**
 * Every `:hover` selector together with the at-rule preludes that enclose it,
 * found by tracking block nesting through the stylesheet text.
 */
function hoverSelectors(
  css: string,
): { selector: string; atRules: string[] }[] {
  const found: { selector: string; atRules: string[] }[] = [];
  const stack: string[] = [];
  let prelude = "";
  for (const character of css) {
    if (character === "{") {
      const trimmed = prelude.trim();
      if (trimmed.includes(":hover")) {
        found.push({
          selector: trimmed,
          atRules: stack.filter((entry) => entry.startsWith("@")),
        });
      }
      stack.push(trimmed);
      prelude = "";
    } else if (character === "}") {
      stack.pop();
      prelude = "";
    } else if (character === ";") {
      prelude = "";
    } else {
      prelude += character;
    }
  }
  return found;
}

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

describe("control and form stylesheets", () => {
  const controls = stripComments(CONTROL_STYLES);
  const forms = stripComments(FORM_STYLES);

  it("gates every raw hover rule on a hover-capable pointer", () => {
    const hovers = [...hoverSelectors(controls), ...hoverSelectors(forms)];
    expect(hovers.length).toBeGreaterThan(0);
    for (const { atRules, selector } of hovers) {
      const gated = atRules.some(
        (rule) =>
          rule.includes("(hover: hover)") ||
          // The forced-colors block restates hover so the system colors hold;
          // it never adds a hover-only fill of its own.
          rule.includes("(forced-colors: active)"),
      );
      expect(gated, `ungated hover rule: ${selector}`).toBe(true);
    }
  });

  it("lifts text controls to 16px on coarse pointers", () => {
    expect(controls).toMatch(
      /@media \(any-pointer: coarse\) \{\s*\.snui-input,\s*\.snui-select,\s*\.snui-textarea \{\s*font-size: max\(1rem, var\(--snui-font-size\)\);/,
    );
  });

  it("uses tone, track, and disabled tokens instead of derived colors", () => {
    expect(controls).not.toContain(
      "color-mix(in srgb, var(--snui-color-danger)",
    );
    expect(controls).toContain("background: var(--snui-color-danger-subtle);");
    expect(controls).toMatch(
      /\.snui-progress__track \{[^}]*background: var\(--snui-color-track\);/,
    );
    expect(forms).toMatch(
      /\.snui-field-group:disabled > \.snui-field-group__description \{\s*color: var\(--snui-color-text-disabled\);/,
    );
    expect(forms).not.toContain("opacity: 0.68");
  });

  it("writes block-axis offsets with logical properties", () => {
    for (const sheet of [controls, forms]) {
      expect(sheet).not.toMatch(/\bmargin-(?:top|bottom):/);
      expect(sheet).not.toMatch(/(?<![-\w])(?:top|bottom):/);
    }
    expect(controls).toContain("margin-block-end: var(--snui-space-2);");
  });

  it("reconstructs secondary and ghost buttons under forced colors", () => {
    const forcedColors = controls.slice(
      controls.indexOf("@media (forced-colors: active)"),
    );
    expect(forcedColors).toMatch(
      /\.snui-button--secondary,\s*\.snui-button--secondary:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover \{\s*forced-color-adjust: none;\s*border-color: ButtonText;\s*background: ButtonFace;\s*color: ButtonText;/,
    );
    expect(forcedColors).toMatch(
      /\.snui-button--ghost,\s*\.snui-button--ghost:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover \{\s*forced-color-adjust: none;/,
    );
    expect(forcedColors).toMatch(
      /\.snui-button--secondary:focus-visible,\s*\.snui-button--ghost:focus-visible,/,
    );
    expect(forcedColors).toMatch(
      /\.snui-button--secondary\[aria-disabled="true"\],[\s\S]*?color: GrayText;/,
    );
  });

  it("defines the monospace, row-sized, and hidden-label modifiers", () => {
    expect(controls).toMatch(
      /\.snui-input--monospace \{\s*font-family: var\(--snui-font-family-mono\);/,
    );
    expect(controls).toMatch(
      /\.snui-textarea--rows \{\s*min-height: auto;\s*field-sizing: content;/,
    );
    expect(controls).toMatch(
      /\.snui-checkbox--label-hidden \{\s*grid-template-columns: auto;/,
    );
  });
});
