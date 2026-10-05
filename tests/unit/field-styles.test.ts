import { describe, expect, it } from "vitest";

import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { FORM_STYLES } from "../../src/styles/forms.js";
import { FOUNDATION_STYLES } from "../../src/styles/foundation.js";
import {
  SELECTION_GLYPH_SIZE,
  TRACK_THICKNESS,
  TRACK_THICKNESS_COARSE,
} from "../../src/styles/fragments.js";
import { LAYOUT_STYLES } from "../../src/styles/layout.js";
import { RADIO_STYLES } from "../../src/styles/radio.js";
import { RANGE_STYLES } from "../../src/styles/range.js";
import { SWITCH_STYLES } from "../../src/styles/switch.js";
import { TEXTAREA_STYLES } from "../../src/styles/textarea.js";
import { normalizedCss, ruleBody } from "../css-helpers.js";

/** The form sheet with its whitespace collapsed, read by several cases. */
const FORMS = normalizedCss(FORM_STYLES);

/**
 * Every rule body a selector opens, for the cases that count or compare the
 * rules a sheet writes for one selector. A single rule goes through the
 * shared ruleBody.
 */
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
    expect(ruleBody(RADIO_STYLES.styles, ".snui-radio__control")).toContain(
      `width: ${SELECTION_GLYPH_SIZE};`,
    );
    // The checkbox box and the radio dial read as one size side by side.
    expect(ruleBody(CONTROL_STYLES, ".snui-checkbox__input")).toContain(
      `width: ${SELECTION_GLYPH_SIZE};`,
    );
  });
});

describe("range styles", () => {
  it("states the disabled presentation in one rule", () => {
    const disabled = ruleBodies(RANGE_STYLES.styles, ".snui-range:disabled");
    expect(disabled).toHaveLength(1);
    expect(disabled[0]).toContain(
      "--snui-range-progress-color: var(--snui-color-text-disabled);",
    );
  });

  it("keeps the fill boundary visible while the value is invalid", () => {
    const invalid = ruleBody(
      RANGE_STYLES.styles,
      '.snui-range[aria-invalid="true"]',
    );
    expect(invalid).toContain(
      "--snui-range-progress-color: var(--snui-color-danger);",
    );
    // Recoloring the remainder too would flatten the two halves into one bar
    // and take the value reading with it.
    expect(invalid).not.toContain("--snui-range-track-color");
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
      expect.stringContaining(`height: ${TRACK_THICKNESS_COARSE};`),
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

describe("field group legend row", () => {
  it("floats the group's own legend so it lays out in the legend row", () => {
    // A first legend child that is not floated is drawn in the fieldset's
    // border and never becomes a grid item, so the row placement written
    // beside it would never apply.
    const legend = ruleBody(FORMS, ".snui-field-group__legend");
    // Every engine at the floor takes the logical keyword, so no physical
    // fallback rides beside it.
    expect(legend).toContain("float: inline-start;");
    expect(legend).not.toContain("float: left;");
    expect(legend).toContain("grid-column: 1;");
    expect(legend).toContain("grid-row: 1;");
    // Consumer legends keep the reset, which only the group's own class
    // outweighs.
    const reset = ruleBody(normalizedCss(FOUNDATION_STYLES), " legend");
    expect(reset).toContain("float: none;");
  });
});

describe("text control height", () => {
  it("lets the control floor set the height of single-line fields and keeps the textarea inset", () => {
    // With the separation token as block padding, a 1.5 line box made inputs
    // and selects taller than the buttons beside them on every pointer.
    const input = ruleBody(normalizedCss(CONTROL_STYLES), ".snui-input");
    expect(input).toContain("min-height: var(--snui-control-min-height);");
    expect(input).toContain(
      "padding: var(--snui-space-1) var(--snui-space-3);",
    );
    // Multi-line text keeps its room above the first line and below the last.
    const textarea = ruleBody(
      normalizedCss(TEXTAREA_STYLES.styles),
      ".snui-textarea",
    );
    expect(textarea).toContain("padding-block: var(--snui-space-2);");
  });
});

describe("field error row", () => {
  it("sets the danger glyph apart from its message and hangs wrapped lines past it", () => {
    // The message is its own flex item, so a wrapped line starts under the
    // text rather than under the glyph.
    const row = ruleBody(FORMS, ".snui-field-error__row");
    expect(row).toContain("display: flex;");
    expect(row).toContain("align-items: baseline;");
    const text = ruleBody(FORMS, ".snui-field-error__text");
    expect(text).toContain("min-width: 0;");
    // The gap is the one every glyph in front of its own text takes.
    const shared =
      /((?:\.snui-[a-z-]+__tone-glyph,\s*)+\.snui-[a-z-]+__tone-glyph)\s*\{\s*margin-inline-end:/.exec(
        normalizedCss(LAYOUT_STYLES),
      );
    expect(shared?.[1]).toContain(".snui-field-error__tone-glyph");
    expect(shared?.[1]).toContain(".snui-card__tone-glyph");
  });
});

describe("inline field without a description", () => {
  it("keeps the control in the label's row, so the label centers on it", () => {
    // With no description, a control spanning two rows split its height into
    // an empty second row and the label centered in a short first one.
    const rule = ruleBody(
      FORMS,
      ".snui-field--inline:not(:has(> .snui-field__description)) > .snui-field__control",
    );
    expect(rule).toContain("grid-row: 1;");
    // A narrow panel stacks the field, so there the control follows the
    // label again rather than sharing its row.
    const narrow = FORMS.slice(FORMS.lastIndexOf("@container"));
    expect(narrow).toMatch(
      /\.snui-field--inline:not\(:has\(> \.snui-field__description\)\) > \.snui-field__control, \.snui-field--inline > \.snui-field__error \{ grid-column: 1; grid-row: auto; \}/,
    );
  });
});

describe("optional marker", () => {
  it("draws the marker at the regular weight, apart from the semibold label", () => {
    // In Night the muted color sits almost on the text color, so weight is
    // the cue that separates the marker from the label.
    const mark = ruleBody(FORMS, ".snui-optional-mark");
    expect(mark).toContain("color: var(--snui-color-text-muted);");
    expect(mark).toContain("font-weight: normal;");
  });
});
