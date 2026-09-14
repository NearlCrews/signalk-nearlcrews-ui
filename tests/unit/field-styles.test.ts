import { describe, expect, it } from "vitest";

import { CONTROL_STYLES } from "../../src/styles/controls.js";
import {
  SELECTION_GLYPH_SIZE,
  TRACK_THICKNESS,
} from "../../src/styles/fragments.js";
import { RADIO_STYLES } from "../../src/styles/radio.js";
import { RANGE_STYLES } from "../../src/styles/range.js";
import { SWITCH_STYLES } from "../../src/styles/switch.js";

/**
 * The sheet with every run of whitespace collapsed, so an assertion reads the
 * rule rather than the formatter's line breaks and indentation.
 */
function normalizedCss(css: string): string {
  return css.replace(/\s+/g, " ");
}

/** The rule bodies a selector opens, comments and nesting left as they are. */
function ruleBodies(css: string, selector: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(`${selector} {`, from);
    if (at === -1) return bodies;
    const open = css.indexOf("{", at);
    const close = css.indexOf("}", open);
    bodies.push(css.slice(open + 1, close));
    from = close;
  }
}

describe("radio group styles", () => {
  it("dims the group's own text while the group is unavailable", () => {
    // A full-strength label over dimmed options reads as a live question with
    // unavailable answers rather than as an unavailable control.
    expect(normalizedCss(RADIO_STYLES.styles)).toContain(
      ".snui-radio-group[data-disabled] :is(.snui-radio-group__label, .snui-radio-group__description) { color: var(--snui-color-text-disabled);",
    );
    // Forced colors repaints authored text with its ordinary color, so the
    // unavailable state is restated with the system one.
    expect(RADIO_STYLES.styles).toContain("color: GrayText;");
  });

  it("sizes the dial from the shared selection glyph measurement", () => {
    expect(
      ruleBodies(RADIO_STYLES.styles, ".snui-radio__control")[0],
    ).toContain(`width: ${SELECTION_GLYPH_SIZE};`);
    // The checkbox box and the radio dial read as one size side by side.
    expect(ruleBodies(CONTROL_STYLES, ".snui-checkbox__input")[0]).toContain(
      `width: ${SELECTION_GLYPH_SIZE};`,
    );
  });
});

describe("range styles", () => {
  it("states the disabled presentation in one rule", () => {
    expect(
      ruleBodies(RANGE_STYLES.styles, ".snui-range:disabled"),
    ).toHaveLength(1);
    expect(
      ruleBodies(RANGE_STYLES.styles, ".snui-range:disabled")[0],
    ).toContain(
      "--snui-range-progress-color: var(--snui-color-text-disabled);",
    );
  });

  it("keeps the fill boundary visible while the value is invalid", () => {
    const invalid = ruleBodies(
      RANGE_STYLES.styles,
      '.snui-range[aria-invalid="true"]',
    );
    expect(invalid[0]).toContain(
      "--snui-range-progress-color: var(--snui-color-danger);",
    );
    // Recoloring the remainder too would flatten the two halves into one bar
    // and take the value reading with it.
    expect(invalid[0]).not.toContain("--snui-range-track-color");
  });

  it("centers the thumb against the one track thickness", () => {
    expect(RANGE_STYLES.styles).toContain(
      `calc((${TRACK_THICKNESS} - var(--snui-range-thumb-size)) / 2)`,
    );
    expect(RANGE_STYLES.styles).toContain(`height: ${TRACK_THICKNESS};`);
  });

  it("rebuilds the filled portion under forced colors", () => {
    // The flat system color the track would otherwise take leaves the thumb
    // as the only reading of the value.
    expect(normalizedCss(RANGE_STYLES.styles)).toContain(
      "Highlight 0 var(--snui-range-progress, 0%), ButtonText var(--snui-range-progress, 0%)",
    );
    expect(
      ruleBodies(RANGE_STYLES.styles, ".snui-range::-moz-range-progress"),
    ).toEqual([
      expect.stringContaining("background: var(--snui-range-progress-color);"),
      // The coarse-pointer block raises the track between the two, the way it
      // raises the progress bar's.
      expect.stringContaining("height: 0.5rem;"),
      expect.stringContaining("background: Highlight;"),
    ]);
  });
});

describe("switch styles", () => {
  it("hands the thumb travel to the compositor where direction can be matched", () => {
    // An inline offset is the only travel a right-to-left panel mirrors on
    // its own, so the transform arrives with its own mirror and only where
    // the engine can match the direction selector.
    expect(SWITCH_STYLES.styles).toContain("@supports selector(:dir(rtl)) {");
    expect(normalizedCss(SWITCH_STYLES.styles)).toContain(
      "transition: transform var(--snui-transition-fast),",
    );
    const travel = "calc(2.25rem - 2px - 2px - 0.875rem - 0.125rem - 0.125rem)";
    expect(SWITCH_STYLES.styles).toContain(`translate(${travel}, -50%)`);
    expect(SWITCH_STYLES.styles).toContain(
      `translate(calc(-1 * ${travel}), -50%)`,
    );
  });

  it("keeps the inline offset for engines without a direction selector", () => {
    expect(SWITCH_STYLES.styles).toContain(
      "inset-inline-start: calc(100% - 0.875rem - 0.125rem);",
    );
  });
});
