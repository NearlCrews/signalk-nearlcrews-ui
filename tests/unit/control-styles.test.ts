import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { FORM_STYLES } from "../../src/styles/forms.js";
import { PROGRESS_STYLES } from "../../src/styles/progress.js";
import { RADIO_STYLES } from "../../src/styles/radio.js";
import { RANGE_STYLES } from "../../src/styles/range.js";
import { SWITCH_STYLES } from "../../src/styles/switch.js";
import { TEXTAREA_STYLES } from "../../src/styles/textarea.js";

/** The module source, so assertions can exclude the shared fragments. */
const CONTROLS_SOURCE = readFileSync(
  join(process.cwd(), "src", "styles", "controls.ts"),
  "utf8",
);

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
  /* The per-control modules the root sheet no longer carries. */
  const progress = stripComments(PROGRESS_STYLES.styles);
  const radio = stripComments(RADIO_STYLES.styles);
  const range = stripComments(RANGE_STYLES.styles);
  const control = stripComments(SWITCH_STYLES.styles);
  const textarea = stripComments(TEXTAREA_STYLES.styles);
  const everySheet = [
    controls,
    forms,
    progress,
    radio,
    range,
    control,
    textarea,
  ];

  it("gates every raw hover rule on a hover-capable pointer", () => {
    const hovers = everySheet.flatMap((sheet) => hoverSelectors(sheet));
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
      /@media \(any-pointer: coarse\) \{\s*\.snui-input,\s*\.snui-select \{\s*font-size: max\(1rem, var\(--snui-font-size\)\);/,
    );
    // The textarea carries the same floor from its own module.
    expect(textarea).toMatch(
      /@media \(any-pointer: coarse\) \{\s*\.snui-textarea \{\s*font-size: max\(1rem, var\(--snui-font-size\)\);/,
    );
  });

  it("uses tone, track, and disabled tokens instead of derived colors", () => {
    expect(controls).not.toContain(
      "color-mix(in srgb, var(--snui-color-danger)",
    );
    expect(controls).toContain("background: var(--snui-color-danger-subtle);");
    expect(progress).toMatch(
      /\.snui-progress__track \{[^}]*background: var\(--snui-color-track\);/,
    );
    expect(forms).toMatch(
      /\.snui-field-group:disabled > \.snui-field-group__description \{\s*color: var\(--snui-color-text-disabled\);/,
    );
    expect(forms).not.toContain("opacity: 0.68");
  });

  it("repaints disabled fills with the disabled text token instead of opacity", () => {
    // The shared disabled fragment is owned elsewhere; this module itself
    // writes no dimming opacity.
    expect(CONTROLS_SOURCE).not.toContain("opacity: 0.58");
    expect(controls).toMatch(
      /\.snui-button--primary:disabled,\s*\.snui-button--primary\[aria-disabled="true"\]:not\(\[aria-busy="true"\]\) \{\s*background: var\(--snui-color-text-disabled\);\s*color: var\(--snui-color-surface\);/,
    );
    for (const [sheet, selector] of [
      [range, ".snui-range:disabled::-webkit-slider-thumb"],
      // The box repaints its fill whichever way it is blocked, so the
      // selector covers the focusable aria-disabled form as well.
      [
        controls,
        '.snui-checkbox__input:is(:disabled, [aria-disabled="true"]):checked',
      ],
      [
        radio,
        ".snui-radio__button[data-disabled][data-selected] .snui-radio__control",
      ],
      [
        control,
        ".snui-switch__button[data-disabled][data-selected] .snui-switch__track",
      ],
      [controls, '.snui-segmented__option:disabled[aria-checked="true"]'],
    ] as const) {
      expect(sheet, `${selector} keeps its accent fill`).toContain(selector);
    }
    // Aria-disabled buttons that are busy keep their fill; the others share
    // the native disabled rule.
    expect(controls).toContain(
      '.snui-button[aria-disabled="true"]:not([aria-busy="true"]),',
    );
  });

  it("writes block-axis offsets with logical properties", () => {
    for (const sheet of everySheet) {
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
    expect(textarea).toMatch(
      /\.snui-textarea--rows \{\s*min-height: auto;\s*field-sizing: content;/,
    );
    expect(controls).toMatch(
      // The label inside the block is the target, so the modifier reaches it
      // rather than the block that also holds the description and the error.
      /\.snui-checkbox--label-hidden > \.snui-checkbox__control \{\s*grid-template-columns: auto;\s*justify-items: center;\s*align-items: center;\s*min-inline-size: var\(--snui-control-min-height\);/,
    );
  });
});
