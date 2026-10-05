import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { CONTROL_STYLES } from "../../src/styles/controls.js";
import { FORM_STYLES } from "../../src/styles/forms.js";
import { FOUNDATION_STYLES } from "../../src/styles/foundation.js";
import { TRACK_THICKNESS_COARSE } from "../../src/styles/fragments.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import { PROGRESS_STYLES } from "../../src/styles/progress.js";
import { RADIO_STYLES } from "../../src/styles/radio.js";
import { RANGE_STYLES } from "../../src/styles/range.js";
import { SWITCH_STYLES } from "../../src/styles/switch.js";
import { TEXTAREA_STYLES } from "../../src/styles/textarea.js";
import { normalizedCss, stripComments, stylesFrom } from "../css-helpers.js";

/** The module source, so assertions can exclude the shared fragments. */
const CONTROLS_SOURCE = readFileSync(
  join(process.cwd(), "src", "styles", "controls.ts"),
  "utf8",
);

/**
 * Every style rule's selector list together with the at-rule preludes that
 * enclose it, found by tracking block nesting through the stylesheet text.
 * Whitespace inside a list is collapsed, so a list reads the same however the
 * sheet wraps it.
 */
function styleRules(css: string): { selector: string; atRules: string[] }[] {
  const found: { selector: string; atRules: string[] }[] = [];
  const stack: string[] = [];
  let prelude = "";
  for (const character of css) {
    if (character === "{") {
      const trimmed = normalizedCss(prelude.trim());
      if (!trimmed.startsWith("@")) {
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

/**
 * Every innermost rule of a comment-free sheet, as its selector list and its
 * declarations, with whitespace collapsed in both.
 */
function ruleBlocks(css: string): { selectors: string[]; body: string }[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: (match[1] ?? "")
      .split(/,(?![^()]*\))/)
      .map((selector) => normalizedCss(selector.trim())),
    body: normalizedCss((match[2] ?? "").trim()),
  }));
}

/** A selector with every `:where()` group removed, which leaves its weight. */
function withoutWhere(selector: string): string {
  let kept = "";
  let index = 0;
  for (;;) {
    const at = selector.indexOf(":where(", index);
    if (at === -1) return kept + selector.slice(index);
    kept += selector.slice(index, at);
    let depth = 0;
    index = at + ":where".length;
    do {
      if (selector[index] === "(") depth += 1;
      if (selector[index] === ")") depth -= 1;
      index += 1;
    } while (depth > 0 && index < selector.length);
  }
}

/** The prelude of the block that restates a sheet in system colors. */
const FORCED_COLORS = "@media (forced-colors: active)";

/* A field whose slot holds a control blocked either way. */
const HELD_FIELD =
  '.snui-field:has(> .snui-field__control :is(:disabled, [aria-disabled="true"]))';
/* A control that holds a value and can still be changed. */
const LIVE_VALUE_CONTROL =
  ':is(input:not([type="hidden"]), select, textarea, [role="radio"]):not(:is(:disabled, [aria-disabled="true"]))';
/* The field whose label dims: a held one with no live value control left. */
const BLOCKED_FIELD = `${HELD_FIELD}:where(:not(:has(> .snui-field__control ${LIVE_VALUE_CONTROL})))`;

describe("control and form stylesheets", () => {
  const controls = stripComments(CONTROL_STYLES);
  const forms = stripComments(FORM_STYLES);
  /* The per-control modules the root sheet no longer carries. */
  const progress = stripComments(PROGRESS_STYLES.styles);
  const radio = stripComments(RADIO_STYLES.styles);
  const range = stripComments(RANGE_STYLES.styles);
  const switchStyles = stripComments(SWITCH_STYLES.styles);
  const textarea = stripComments(TEXTAREA_STYLES.styles);
  /* The control sheets, for the assertions that name a control rule. */
  const controlSheets = [
    controls,
    forms,
    progress,
    radio,
    range,
    switchStyles,
    textarea,
  ];
  /*
   * Every shipped rule, root sheet first, for the guards that must hold
   * across the package rather than across a hand-kept list. A hover rule
   * added to a tab, a collapsible toggle, or the foundation reset has to go
   * through the same gate as one added here.
   */
  const everyRule = STYLE_MODULES.flatMap((module) =>
    styleRules(stripComments(module.styles)),
  );
  /* The forced-colors block of each root sheet the cases below read. */
  const forcedControls = stylesFrom(controls, FORCED_COLORS);
  const forcedForms = stylesFrom(forms, FORCED_COLORS);

  it("gates every raw hover rule on a hover-capable pointer", () => {
    const hovers = everyRule.filter(({ selector }) =>
      selector.includes(":hover"),
    );
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

  it("keeps each engine's pseudo-elements out of a shared selector list", () => {
    // An engine drops a whole selector list that names a pseudo-element it
    // does not know. Chromium and Safari know no ::-moz- one, so a list that
    // mixes the two loses its WebKit half there without a word.
    for (const { selector } of everyRule) {
      expect(
        selector.includes("::-webkit-") && selector.includes("::-moz-"),
        selector,
      ).toBe(false);
    }
  });

  it("raises both engines' range tracks on a coarse pointer", () => {
    const coarseRules = styleRules(range)
      .filter(({ atRules }) =>
        atRules.some((rule) => rule.includes("(any-pointer: coarse)")),
      )
      .map(({ selector }) => selector);
    const flat = normalizedCss(range);
    for (const selector of [
      ".snui-range::-webkit-slider-runnable-track",
      ".snui-range::-moz-range-track, .snui-range::-moz-range-progress",
    ]) {
      expect(coarseRules).toContain(selector);
      expect(flat).toContain(
        `${selector} { height: ${TRACK_THICKNESS_COARSE}; }`,
      );
    }
  });

  it("lifts text controls to 16px on coarse pointers", () => {
    expect(controls).toMatch(
      /@media \(any-pointer: coarse\) \{\s*\.snui-input \{\s*font-size: max\(1rem, var\(--snui-font-size\)\);/,
    );
    // The select and the textarea reach the same floor through snui-input,
    // which each always carries, so the textarea's own module restates
    // neither that rule nor the forced-colors invalid outline.
    expect(textarea).not.toContain("any-pointer: coarse");
    expect(textarea).not.toContain("forced-colors: active");
  });

  it("lets the focus ring replace every forced-colors invalid outline", () => {
    // The dashed reconstruction outweighs the ring a field gets under forced
    // colors, so each selector that draws it has to stand aside while the
    // control shows visible focus.
    const invalidRules = [controls, range, radio].flatMap((sheet) =>
      [...sheet.matchAll(/([^{}]+)\{\s*outline: 2px dashed CanvasText;/g)].map(
        (match) => match[1] ?? "",
      ),
    );
    expect(invalidRules.length).toBe(3);
    for (const list of invalidRules) {
      for (const selector of list.split(",")) {
        expect(selector.trim()).toMatch(
          /:not\(:focus-visible\)|:not\(\[data-focus-visible\]\)/,
        );
      }
    }
  });

  it("marks an invalid control with a shape as well as a color", () => {
    // Night caps every foreground's red, so the danger border alone cannot
    // separate a refused field from an ordinary one.
    expect(controls).toMatch(
      /\.snui-input\[aria-invalid="true"\]:not\(:focus-visible\) \{\s*outline: 1px dashed var\(--snui-color-danger\);/,
    );
    expect(controls).toMatch(
      /\.snui-button--danger \{[^}]*border-style: dashed;/,
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
        switchStyles,
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
    for (const sheet of controlSheets) {
      expect(sheet).not.toMatch(/\bmargin-(?:top|bottom):/);
      expect(sheet).not.toMatch(/(?<![-\w])(?:top|bottom):/);
    }
    expect(controls).toContain("margin-block-end: var(--snui-space-2);");
  });

  it("reconstructs secondary and ghost buttons under forced colors", () => {
    expect(forcedControls).toMatch(
      /\.snui-button--secondary,\s*\.snui-button--secondary:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover \{\s*forced-color-adjust: none;\s*border-color: ButtonText;\s*background: ButtonFace;\s*color: ButtonText;/,
    );
    expect(forcedControls).toMatch(
      /\.snui-button--ghost,\s*\.snui-button--ghost:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover \{\s*forced-color-adjust: none;/,
    );
    expect(forcedControls).toMatch(
      /\.snui-button--secondary:focus-visible,\s*\.snui-button--ghost:focus-visible,/,
    );
    expect(forcedControls).toMatch(
      /\.snui-button\[aria-disabled="true"\]:not\(\[aria-busy="true"\]\) \{\s*border-color: GrayText;\s*color: GrayText;/,
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

  it("draws a blocked reason as the muted description text beside its control", () => {
    // A button's reason travels with the button as one item in a row.
    expect(controls).toMatch(
      /\.snui-button-reason \{\s*display: inline-flex;\s*max-width: 100%;\s*flex-direction: column;/,
    );
    expect(controls).toMatch(
      /\.snui-button-reason--full-width \{\s*display: flex;\s*width: 100%;/,
    );
    expect(controls).toMatch(
      /\.snui-button-reason__text \{\s*min-width: 0;\s*color: var\(--snui-color-text-muted\);/,
    );
    // A checkbox's reason lines up with its description, label hidden or not.
    expect(controls).toMatch(
      /\.snui-checkbox__description,\s*\.snui-checkbox__reason \{\s*min-width: 0;\s*color: var\(--snui-color-text-muted\);/,
    );
    expect(controls).toContain(
      ".snui-checkbox--label-hidden > :is(.snui-checkbox__description, .snui-checkbox__reason, .snui-checkbox__error)",
    );
  });

  it("paints a blocked segmented option as a disabled one and keeps a read-only group's cursor", () => {
    expect(controls).toMatch(
      /\.snui-segmented\[aria-readonly="true"\] \.snui-segmented__option \{\s*cursor: not-allowed;/,
    );
    expect(controls).toMatch(
      /\.snui-segmented__option\[aria-disabled="true"\]:not\(:disabled\) \{\s*cursor: not-allowed;\s*color: var\(--snui-color-text-disabled\);/,
    );
    // Its resting look holds through hover and press because every live
    // option rule excludes an option blocked either way, in the theme and
    // under forced colors, rather than because a blocked rule undoes each
    // state in turn.
    const liveStates = styleRules(controls)
      .map(({ selector }) => selector)
      .filter(
        (selector) =>
          selector.includes(".snui-segmented__option") &&
          /:hover|:active/.test(selector),
      );
    expect(liveStates).toEqual([
      '.snui-segmented__option:not(:is(:disabled, [aria-disabled="true"])):not([aria-checked="true"]):hover',
      '.snui-segmented__option:not(:is(:disabled, [aria-disabled="true"])):not([aria-checked="true"]):active',
      '.snui-segmented__option[aria-checked="true"]:not(:is(:disabled, [aria-disabled="true"])):hover',
      '.snui-segmented__option[aria-checked="true"]:not(:is(:disabled, [aria-disabled="true"])):active',
      '.snui-segmented__option[aria-checked="true"], .snui-segmented__option[aria-checked="true"]:not(:is(:disabled, [aria-disabled="true"])):hover, .snui-segmented__option[aria-checked="true"]:not(:is(:disabled, [aria-disabled="true"])):active',
    ]);
    // The blocked selected fill keeps its :not(:disabled), which puts it one
    // step above the blocked text rule whose color it replaces.
    expect(controls).toMatch(
      /\.snui-segmented__option\[aria-disabled="true"\]\[aria-checked="true"\]:not\(:disabled\) \{\s*background: var\(--snui-color-text-disabled\);\s*color: var\(--snui-color-surface\);/,
    );
  });

  it("keeps the control boundary token on the segmented track, the one edge of an interactive control", () => {
    // Container outlines move to the subtle token; a control's only edge does
    // not, so it holds the 3:1 a control boundary needs.
    expect(controls).toMatch(
      /\.snui-segmented__group \{\s*border: 1px solid var\(--snui-color-border\);/,
    );
    expect(controls).not.toContain("--snui-color-border-subtle");
  });

  it("sets a button's own type size, so a footer or a small-text surface cannot shrink it", () => {
    expect(controls).toMatch(
      /\.snui-button \{[^}]*font-size: var\(--snui-font-size\);/,
    );
    // The list-line form reads as part of its row, so it keeps the row's size.
    expect(controls).toMatch(/\.snui-button--text \{[^}]*font-size: inherit;/);
  });

  it("leaves a button rendered as an anchor to its own variant rules", () => {
    // The package's link look outweighs one class, so it has to step aside
    // for a button anchor rather than be outweighed by every variant.
    const foundation = stripComments(FOUNDATION_STYLES);
    for (const selector of [
      "a:any-link:where(:not(.snui-button))",
      "a:visited:where(:not(.snui-button))",
      "a:any-link:hover:where(:not(.snui-button))",
    ]) {
      expect(foundation).toContain(`${selector} {`);
    }
    expect(foundation).not.toMatch(/(^|\s)a:any-link \{/);
    expect(foundation).not.toMatch(/(^|\s)a:visited \{/);
  });

  it("dims a blocked checkbox's own label, in the theme and under forced colors", () => {
    // The markers set their own colors, so the blocked rule names them too.
    expect(controls).toMatch(
      /\.snui-checkbox:has\(\.snui-checkbox__input:is\(:disabled, \[aria-disabled="true"\]\)\) \.snui-checkbox__label,\s*\.snui-checkbox:has\(\.snui-checkbox__input:is\(:disabled, \[aria-disabled="true"\]\)\) \.snui-checkbox__label :is\(\.snui-optional-mark, \.snui-required-mark\) \{\s*color: var\(--snui-color-text-disabled\);/,
    );
    // Every piece of label text takes the system color, the markers
    // included, but a link, which a disabled box does not disable, keeps the
    // system link color. Nothing opts the subtree out of forced colors, so no
    // theme color can reach the system palette through it.
    expect(forcedControls).toMatch(
      /\.snui-checkbox:has\(\.snui-checkbox__input:is\(:disabled, \[aria-disabled="true"\]\)\) \.snui-checkbox__label,\s*\.snui-checkbox:has\(\.snui-checkbox__input:is\(:disabled, \[aria-disabled="true"\]\)\) \.snui-checkbox__label :not\(:any-link, :any-link \*\) \{\s*color: GrayText;\s*\}/,
    );
  });

  it("keeps every blocked field text rule under forced colors inside the system palette", () => {
    // forced-color-adjust inherits, so an opt-out on a label would hand its
    // markers and links back their theme colors.
    expect(forcedForms).toMatch(
      /\.snui-field-group:disabled > \.snui-field-group__legend,\s*\.snui-field-group:disabled > \.snui-field-group__legend :not\(:any-link, :any-link \*\),\s*\.snui-field-group:disabled > \.snui-field-group__description,\s*\.snui-field-group:disabled > \.snui-field-group__description :not\(:any-link, :any-link \*\) \{\s*color: GrayText;\s*\}/,
    );
    expect(normalizedCss(forcedForms)).toContain(
      `${BLOCKED_FIELD} > .snui-field__label, ${BLOCKED_FIELD} > .snui-field__label :not(:any-link, :any-link *) { color: GrayText; }`,
    );
    // A blocked field's markers dim with its label in the theme as well.
    expect(normalizedCss(forms)).toContain(
      `${BLOCKED_FIELD} > .snui-field__label, ${BLOCKED_FIELD} > .snui-field__label :is(.snui-optional-mark, .snui-required-mark) { color: var(--snui-color-text-disabled); }`,
    );
    // Any rule whose selector reaches a label, a legend, or a description,
    // by the package's class or by the bare element, must not opt out. The
    // element branch starts at a combinator or a list separator, so a
    // modifier such as `--label-hidden` or an `aria-label` attribute does not
    // count as the element.
    const optsOut = (block: string): boolean =>
      /[^{}]*(?:__(?:label|legend|description)\b|(?:^|[\s>+~(,])(?:label|legend)(?![\w-]))[^{}]*\{[^}]*forced-color-adjust:\s*none/.test(
        block,
      );
    for (const block of [forcedForms, forcedControls]) {
      expect(optsOut(block)).toBe(false);
    }
    // The guard itself catches an opt-out in each shape a descendant rule
    // has taken, on the bare text rule, and on a bare element selector.
    for (const injected of [
      ".snui-field__label :not(:any-link, :any-link *) { forced-color-adjust: none; }",
      ".snui-field-group__legend * { forced-color-adjust: none; }",
      ".snui-checkbox__label {\n    color: GrayText;\n    forced-color-adjust: none;\n  }",
      ".snui-field-group:disabled > legend { forced-color-adjust: none; }",
      ".snui-checkbox label :not(:any-link, :any-link *) { forced-color-adjust:none; }",
    ]) {
      expect(optsOut(`${forcedControls}\n${injected}`), injected).toBe(true);
    }
    // And it does not mistake a modifier, an attribute, or another control
    // for a label.
    for (const unrelated of [
      ".snui-checkbox--label-hidden { forced-color-adjust: none; }",
      ".snui-button[aria-label] { forced-color-adjust: none; }",
      ".snui-button--primary { forced-color-adjust: none; }",
    ]) {
      expect(optsOut(unrelated), unrelated).toBe(false);
    }
  });

  it("dims a field's label only while its slot holds a blocked control and no live value control", () => {
    // The label names the value controls in its slot. A blocked button
    // beside a live input, one disabled option of a select or a segmented
    // control, and a disabled secondary input each leave one live, so the
    // label stays live; a plain button and a hidden input hold no value the
    // reader edits, so neither keeps it live.
    const labelRules = ruleBlocks(forms).filter(({ selectors }) =>
      selectors.some((selector) => selector.startsWith(".snui-field:has(")),
    );
    expect(labelRules.map(({ selectors }) => selectors)).toEqual([
      [
        `${BLOCKED_FIELD} > .snui-field__label`,
        `${BLOCKED_FIELD} > .snui-field__label :is(.snui-optional-mark, .snui-required-mark)`,
      ],
      [
        `${BLOCKED_FIELD} > .snui-field__label`,
        `${BLOCKED_FIELD} > .snui-field__label :not(:any-link, :any-link *)`,
      ],
    ]);
    // The live half sits inside :where(), which counts for nothing, so each
    // rule weighs what the held-field selector alone weighs, (0,4,0) on the
    // label, and a consumer override that outweighed it before still does.
    for (const selector of labelRules.flatMap(({ selectors }) => selectors)) {
      expect(withoutWhere(selector)).toBe(
        selector.replace(BLOCKED_FIELD, HELD_FIELD),
      );
    }
  });

  it("dims every natively disabled segmented option, whichever way its group is held", () => {
    const themed = controls.slice(0, controls.indexOf(FORCED_COLORS));
    // No group condition: a wholly disabled group dims its unselected
    // options too, rather than leaving them in the muted token.
    const disabledText = ruleBlocks(themed).find(({ selectors }) =>
      selectors.includes(".snui-segmented__option:disabled"),
    );
    expect(disabledText?.body).toContain(
      "color: var(--snui-color-text-disabled);",
    );
    expect(controls).not.toContain(
      '.snui-segmented:not([aria-disabled="true"]) .snui-segmented__option:disabled',
    );
    // The rule weighs (0,2,0), under the selected disabled fill at (0,3,0),
    // so a disabled option that is also the selected one reads on its fill
    // in the surface token instead of in the fill's own color. It follows
    // the selected rule it ties with, and the fill follows it.
    const selectedAt = themed.indexOf(
      '.snui-segmented__option[aria-checked="true"] {',
    );
    const disabledAt = themed.indexOf(".snui-segmented__option:disabled {");
    const fillAt = themed.indexOf(
      '.snui-segmented__option:disabled[aria-checked="true"]',
    );
    expect(selectedAt).toBeGreaterThanOrEqual(0);
    expect(disabledAt).toBeGreaterThan(selectedAt);
    expect(fillAt).toBeGreaterThan(disabledAt);
    // Every hover and press rule on an option excludes a natively disabled
    // one, in the theme and under forced colors, so no live state repaints it.
    const liveStates = ruleBlocks(controls)
      .flatMap(({ selectors }) => selectors)
      .filter(
        (selector) =>
          selector.includes(".snui-segmented__option") &&
          /:hover|:active/.test(selector),
      );
    expect(liveStates.length).toBeGreaterThan(0);
    for (const selector of liveStates) {
      expect(selector).toMatch(/:not\((?::is\()?:disabled/);
    }
  });

  it("paints every blocked button GrayText under forced colors, at the blocked rules' own weight", () => {
    // The aria-disabled branch weighs three classes and excludes a busy
    // button, the same as the theme's blocked rules it has to replace.
    expect(forcedControls).toMatch(
      /\.snui-button:disabled,\s*\.snui-button\[aria-disabled="true"\]:not\(\[aria-busy="true"\]\) \{\s*border-color: GrayText;\s*color: GrayText;\s*opacity: 1;/,
    );
    expect(forcedControls).toMatch(
      /\.snui-button--primary:disabled,\s*\.snui-button--primary\[aria-disabled="true"\]:not\(\[aria-busy="true"\]\) \{\s*background: ButtonFace;/,
    );
    // The dashed state outline sits on the resting danger rule alone, not on
    // its hover restatement, which would outweigh the focus ring.
    expect(forcedControls).toMatch(
      /\.snui-button--danger \{\s*outline: 2px dashed ButtonText;\s*outline-offset: 1px;\s*\}/,
    );
    const dangerHover =
      /\.snui-button--danger,\s*\.snui-button--danger:not\(:disabled\):not\(\[aria-disabled="true"\]\):hover,[^{]*\{([^}]*)\}/.exec(
        forcedControls,
      );
    expect(dangerHover?.[1]).toBeDefined();
    expect(dangerHover?.[1]).not.toContain("outline");
    // Danger's dashed outline dims with the rest, except while the focus
    // ring owns the outline.
    expect(forcedControls).toMatch(
      /\.snui-button--danger:disabled,\s*\.snui-button--danger\[aria-disabled="true"\]:not\(\[aria-busy="true"\]\):not\(:focus-visible\) \{\s*outline-color: GrayText;/,
    );
  });

  it("repaints every disabled selection glyph from the system palette under forced colors", () => {
    // Each of these parts opts out of forced-color adjustment to keep its
    // selected state, so a themed disabled rule that outweighs the forced
    // one paints the theme's disabled token there. Every themed disabled
    // rule on such a part is therefore restated, selector for selector, in
    // the forced block.
    // A negation names the state it excludes, so it is set aside first.
    const isDisabledState = (selector: string): boolean =>
      /:disabled|\[data-disabled\]|\[aria-disabled="true"\]/.test(
        selector.replaceAll(/:not\((?:[^()]|\([^()]*\))*\)/g, ""),
      );
    for (const [sheet, part] of [
      [radio, ".snui-radio__control"],
      [switchStyles, ".snui-switch__track"],
      [switchStyles, ".snui-switch__thumb"],
      [range, "-thumb"],
      // The selected segmented option is the one that opts out.
      [controls, '[aria-checked="true"]'],
    ] as const) {
      const forcedAt = sheet.indexOf(FORCED_COLORS);
      const forced = ruleBlocks(sheet.slice(forcedAt));
      const themedDisabled = ruleBlocks(sheet.slice(0, forcedAt))
        .flatMap(({ selectors }) => selectors)
        .filter(
          (selector) => selector.includes(part) && isDisabledState(selector),
        );
      expect(themedDisabled.length, part).toBeGreaterThan(0);
      for (const selector of new Set(themedDisabled)) {
        const restated = forced.filter(({ selectors }) =>
          selectors.includes(selector),
        );
        expect(restated.length, selector).toBeGreaterThan(0);
        for (const { body } of restated) {
          expect(body, selector).toMatch(/GrayText|Canvas/);
          expect(body, selector).not.toContain("var(--snui-color");
        }
      }
    }
  });

  it("orders each forced disabled rule after the selected rule it ties with", () => {
    // A disabled selected dial or track matches both at one weight, so the
    // disabled border has to come later to replace the highlight one.
    for (const [sheet, selected, disabled] of [
      [
        radio,
        ".snui-radio__button[data-selected] .snui-radio__control {",
        ".snui-radio__button[data-disabled] .snui-radio__control {",
      ],
      [
        switchStyles,
        ".snui-switch__button[data-selected] .snui-switch__track {",
        ".snui-switch__button[data-disabled] .snui-switch__track {",
      ],
    ] as const) {
      const forced = stylesFrom(sheet, FORCED_COLORS);
      expect(forced.indexOf(selected), selected).toBeGreaterThanOrEqual(0);
      expect(forced.indexOf(disabled), disabled).toBeGreaterThan(
        forced.indexOf(selected),
      );
    }
  });

  it("grays the filled half of a disabled range track under forced colors", () => {
    // The forced track names its system colors outright, so the disabled
    // progress token the theme dims the fill with never reaches it.
    const forced = normalizedCss(stylesFrom(range, FORCED_COLORS));
    for (const [selector, direction] of [
      [".snui-range:disabled::-webkit-slider-runnable-track", "right"],
      [".snui-range:disabled:dir(rtl)::-webkit-slider-runnable-track", "left"],
    ] as const) {
      expect(forced).toContain(
        `${selector} { background: linear-gradient( to ${direction}, GrayText 0 var(--snui-range-progress, 0%), ButtonText var(--snui-range-progress, 0%) ); }`,
      );
    }
    expect(forced).toContain(
      ".snui-range:disabled::-moz-range-progress { background: GrayText; }",
    );
    // The right-to-left rule outweighs the left-to-right one, so a disabled
    // slider keeps its mirrored fill.
    expect(
      forced.indexOf(".snui-range:disabled::-webkit-slider-runnable-track {"),
    ).toBeGreaterThan(
      forced.indexOf(".snui-range:dir(rtl)::-webkit-slider-runnable-track {"),
    );
  });

  it("lines the switch messages up with its label and hides an empty error region", () => {
    expect(switchStyles).toMatch(
      /\.snui-switch__description \{\s*min-width: 0;\s*color: var\(--snui-color-text-muted\);[\s\S]*?padding-inline-start: calc\(2\.25rem \+ var\(--snui-space-3\)\);/,
    );
    expect(switchStyles).toMatch(
      /\.snui-switch__error \{\s*min-width: 0;\s*color: var\(--snui-color-danger\);[\s\S]*?padding-inline-start: calc\(2\.25rem \+ var\(--snui-space-3\)\);/,
    );
    // An empty announcing region leaves the flow through the one shared
    // rule, which reaches every field error region by its block class, not
    // through a copy in the switch module.
    expect(stripComments(COMPONENT_STYLES)).toMatch(
      /\.snui-field-error:empty,\s*\.snui-checkbox-group__warning:empty \{\s*position: absolute/,
    );
    expect(switchStyles).not.toContain(".snui-switch__error:empty");
  });
});
