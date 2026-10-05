import { describe, expect, it } from "vitest";
import { FOUNDATION_STYLES } from "../../src/styles/foundation.js";
import {
  FOCUS_RING_WIDTH,
  focusRingDeclarations,
  INSET_FOCUS_RING_OFFSET,
} from "../../src/styles/fragments.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import { PANEL_STYLES } from "../../src/styles/root-sheet.js";
import {
  CONTAINER_BREAKPOINT_NARROW,
  NIGHT_TOKENS,
  PANEL_CONTAINER_NAME,
  TOKEN_STYLES,
} from "../../src/styles/tokens.js";
import {
  PACKAGE_VERSION,
  ROOT_SELECTOR,
  SPINNER_ANIMATION_NAME,
} from "../../src/version.js";
import { hexChannels, NIGHT_CHANNEL_CAP } from "../color-channels.js";
import { blockAt, themeSelector } from "../css-helpers.js";

/** The package version the way a keyframe name carries it. */
const VERSION_MARKER = PACKAGE_VERSION.replaceAll(".", "-");

/** A keyframe declaration, with its name captured. */
const KEYFRAMES_PATTERN = /@keyframes\s+([A-Za-z0-9_-]+)/g;

/** The name of every keyframe a sheet declares. */
function keyframeNames(styles: string): string[] {
  return [...styles.matchAll(KEYFRAMES_PATTERN)].map((match) => match[1] ?? "");
}

describe("versioned keyframes", () => {
  it("derives the spinner keyframe name from the package version", () => {
    expect(SPINNER_ANIMATION_NAME).toBe(`snui-v${VERSION_MARKER}-spin`);
  });

  it("defines every keyframe a module animates in that module or the root", () => {
    const rootKeyframes = keyframeNames(PANEL_STYLES);
    let referenceCount = 0;
    for (const module of STYLE_MODULES) {
      const declared = new Set([
        ...rootKeyframes,
        ...keyframeNames(module.styles),
      ]);
      const references = [
        ...module.styles.matchAll(/animation:\s*([^;]+);/g),
      ].map((match) => match[1] ?? "");
      referenceCount += references.length;
      for (const shorthand of references) {
        // A rule naming a keyframe that does not exist still reports a normal
        // computed animation-duration, so only this check catches the break.
        const named = shorthand
          .trim()
          .split(/\s+/)
          .some((token) => declared.has(token));
        expect(
          named,
          `no @keyframes backs "${shorthand.trim()}" in the ${module.id} module`,
        ).toBe(true);
      }
    }
    expect(referenceCount).toBeGreaterThan(0);
  });

  it("declares every keyframe outside the scope block under a versioned name", () => {
    for (const module of STYLE_MODULES) {
      for (const match of module.styles.matchAll(KEYFRAMES_PATTERN)) {
        const name = match[1] ?? "";
        expect(name, `${name} carries no package version`).toContain(
          VERSION_MARKER,
        );
        const before = module.styles.slice(0, match.index);
        const depth =
          (before.match(/\{/g)?.length ?? 0) -
          (before.match(/\}/g)?.length ?? 0);
        expect(depth, `@keyframes ${name} is nested inside a block`).toBe(0);
      }
    }
  });

  it("qualifies the spinner keyframe so two package versions cannot collide", () => {
    expect(keyframeNames(PANEL_STYLES)).toContain(SPINNER_ANIMATION_NAME);
    expect(SPINNER_ANIMATION_NAME).toContain(VERSION_MARKER);
  });
});

/**
 * Blocks whose public API takes children, so one instance can contain another.
 * A modifier rule on these must not reach descendants with a plain descendant
 * combinator: it would repaint the parts of a nested instance that carries a
 * different modifier. Blocks that cannot nest (Progress, Metric, Banner's tone
 * icon, and the react-aria data grid) keep their descendant rules.
 */
const NESTABLE_BLOCKS = ["collapsible", "card", "field"] as const;

describe("nestable block modifiers", () => {
  it("reaches its own parts through the child combinator", () => {
    let ruleCount = 0;
    for (const block of NESTABLE_BLOCKS) {
      const leaking = new RegExp(
        `\\.snui-${block}--[a-z0-9-]+\\s+\\.snui-${block}__`,
        "g",
      );
      const scoped = new RegExp(
        `\\.snui-${block}--[a-z0-9-]+\\s*>\\s*\\.snui-${block}__`,
        "g",
      );
      for (const module of STYLE_MODULES) {
        ruleCount += [...module.styles.matchAll(scoped)].length;
        for (const match of module.styles.matchAll(leaking)) {
          expect(
            match[0],
            `${module.id} lets .snui-${block}--* reach a nested .snui-${block} instance; use the child combinator`,
          ).toBe("");
        }
      }
    }
    // Guards the regexes themselves: the scoped form has to appear somewhere.
    expect(ruleCount).toBeGreaterThan(0);
  });
});

/**
 * The controls a finger presses. `touch-action: manipulation` drops the
 * double-tap zoom delay and the ghost click behind it, which is what a gloved
 * hand at a helm feels as a control that ignored the first press.
 */
const PRESSABLE_SELECTORS = [
  "button",
  "summary",
  'input[type="checkbox"]',
  'input[type="range"]',
] as const;

describe("touch presses", () => {
  it("takes the double-tap delay off every pressable control", () => {
    const declarations = blockAt(PANEL_STYLES, PRESSABLE_SELECTORS.join(",\n"));
    expect(declarations).toContain("touch-action: manipulation");
  });
});

describe("host element reset", () => {
  it("repaints the highlight in package tokens rather than erasing it", () => {
    // Newline anchored, so the search cannot land on .snui-required-mark.
    const declarations = blockAt(PANEL_STYLES, "\nmark {");
    expect(declarations).toContain(
      "background: var(--snui-color-accent-subtle);",
    );
    expect(declarations).toContain("color: var(--snui-color-text);");
  });

  it("puts the list indent on the space scale", () => {
    const declarations = blockAt(PANEL_STYLES, "ul,\nol {");
    expect(declarations).toContain("padding-inline-start: var(--snui-space-5)");
  });

  it("keeps the safe-area padding on physical sides", () => {
    // env() insets name physical edges, so an RTL panel would pad the wrong
    // hardware edge if these went through the logical shorthand.
    const declarations = blockAt(PANEL_STYLES, ".snui-root__content {");
    expect(declarations).toContain("padding-left: max(");
    expect(declarations).toContain("padding-right: max(");
    expect(declarations).not.toContain("padding-inline:");
  });

  it("draws a plain rule as a divider, in the subtle border", () => {
    expect(blockAt(FOUNDATION_STYLES, "hr {")).toContain(
      "border-block-start: 1px solid var(--snui-color-border-subtle);",
    );
  });
});

/**
 * A rule inside the scoped sheet reaches the panel root through `:scope`. The
 * bare class matches a descendant root instead, and the scope boundary ends at
 * the next versioned root, so such a rule matches nothing at all. The pattern
 * spares `.snui-root__content` and the `.snui-root--*` width modifiers, which
 * are a descendant and a compound on `:scope`, and the version-qualified root,
 * which is the scope root itself and the one selector allowed outside it.
 */
const BARE_ROOT_CLASS = /\.snui-root(?![\w\-[])/;

describe("panel root selectors", () => {
  it("reaches the panel root through :scope rather than its class", () => {
    for (const { id, styles } of STYLE_MODULES) {
      for (const line of styles.split("\n")) {
        // Declarations and prose mention the class; only a selector applies it.
        const trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
        if (!trimmed.endsWith("{") && !trimmed.endsWith(",")) continue;
        expect(
          BARE_ROOT_CLASS.test(line),
          `${id} selects the panel root by class in "${line.trim()}"`,
        ).toBe(false);
      }
    }
  });
});

describe("panel root box", () => {
  it("keeps the panel root out of the containing-block chain", () => {
    // react-aria lays an anchored menu or popover out absolutely and measures
    // the room it may grow into against the viewport. A positioned panel root
    // becomes the containing block for that overlay and mixes the two frames,
    // which collapses every overlay opened once a tall panel has scrolled.
    const declarations = blockAt(PANEL_STYLES, ":scope {");
    expect(declarations).toContain("position: static");
  });
});

/**
 * Specificity of a compound selector list entry as the (0, b, 0) column these
 * selectors use: every class and attribute counts, `:not()` counts its
 * argument, and quoted attribute values are dropped first so the dots in a
 * version string do not read as classes.
 */
function classWeight(selector: string): number {
  const bare = selector.replace(/"[^"]*"/g, '""');
  return (bare.match(/\./g)?.length ?? 0) + (bare.match(/\[/g)?.length ?? 0);
}

/** Every selector the token sheet sets a palette with, in sheet order. */
const HOST_DARK_SELECTORS = [
  `[data-bs-theme="dark"] ${ROOT_SELECTOR}:not([data-snui-theme])`,
  `[data-coreui-theme="dark"] ${ROOT_SELECTOR}:not([data-snui-theme])`,
  `.dark-mode ${ROOT_SELECTOR}:not([data-snui-theme])`,
] as const;
const EXPLICIT_THEME_SELECTORS = ["system", "light", "dark", "night"].map(
  themeSelector,
);

describe("increased contrast request", () => {
  const CONTRAST_MEDIA = "@media (prefers-contrast: more)";

  function contrastRule(): { declarations: string; selectors: string[] } {
    const block = blockAt(TOKEN_STYLES, CONTRAST_MEDIA);
    const open = block.indexOf("{");
    return {
      declarations: block.slice(open + 1),
      selectors: block
        .slice(0, open)
        .split(",")
        .map((selector) => selector.trim()),
    };
  }

  it("raises the boundaries, the container outlines, and both dimmed text tokens", () => {
    const { declarations } = contrastRule();
    expect(declarations).toContain(
      "--snui-color-border: var(--snui-color-text)",
    );
    expect(declarations).toContain(
      "--snui-color-border-subtle: var(--snui-color-text)",
    );
    expect(declarations).toContain(
      "--snui-color-text-muted: var(--snui-color-text)",
    );
    // Disabled text climbs toward the text color but keeps a step below it, so
    // a blocked control still reads as blocked.
    expect(declarations).toContain("--snui-color-text-disabled: color-mix(");
    // Every focus ring reads the ring width, so this one line widens them all.
    expect(declarations).toContain("--snui-focus-ring-width: 3px");
  });

  /*
   * A palette is set on the root by a selector of up to four classes and
   * attributes. The request only lands where the contrast rule ties that
   * weight and follows it, so the rule names every palette selector again,
   * or one exactly as heavy, and sits after the last of them. Written at
   * the weight of a bare scope, it lost to every palette and never applied.
   */
  it("ties every palette selector and follows the last one", () => {
    const { selectors } = contrastRule();
    expect(selectors).toEqual([
      ROOT_SELECTOR,
      ...HOST_DARK_SELECTORS,
      `${ROOT_SELECTOR}[data-snui-theme]`,
    ]);
    const explicit = selectors.at(-1) ?? "";
    for (const theme of EXPLICIT_THEME_SELECTORS) {
      expect(classWeight(theme), theme).toBe(classWeight(explicit));
    }
    const contrastAt = TOKEN_STYLES.indexOf(CONTRAST_MEDIA);
    const contrastEnd =
      TOKEN_STYLES.indexOf("{", contrastAt) +
      blockAt(TOKEN_STYLES, CONTRAST_MEDIA).length +
      2;
    for (const palette of [
      ROOT_SELECTOR,
      ...HOST_DARK_SELECTORS,
      ...EXPLICIT_THEME_SELECTORS,
    ]) {
      expect(
        TOKEN_STYLES.slice(0, contrastAt),
        `${palette} sets no palette`,
      ).toContain(palette);
      expect(
        TOKEN_STYLES.lastIndexOf(palette),
        `${palette} is used again after the contrast rule`,
      ).toBeLessThan(contrastEnd);
    }
  });

  it("leaves the whole request to the token sheet", () => {
    // The ring width is a token like the colors, so no module restates a
    // width for the request; a scoped rule here would lose to the component
    // rings on weight, which is how they once kept 2 pixels. The root module
    // carries the token sheet, so everything else in it is checked.
    for (const module of STYLE_MODULES) {
      if (module.id === "root") continue;
      expect(module.styles, module.id).not.toContain(CONTRAST_MEDIA);
    }
    expect(PANEL_STYLES).toContain(TOKEN_STYLES);
    expect(PANEL_STYLES.replace(TOKEN_STYLES, ""), "root").not.toContain(
      CONTRAST_MEDIA,
    );
    expect(blockAt(TOKEN_STYLES, `${ROOT_SELECTOR} {`)).toContain(
      "--snui-focus-ring-width: 2px;",
    );
  });
});

/** The picker part of every date input, which draws a calendar. */
const DATE_PICKER_PART =
  'input:is([type="date"], [type="datetime-local"], [type="month"], [type="week"])::-webkit-calendar-picker-indicator';

/** The picker part of a time input, which draws a clock. */
const TIME_PICKER_PART =
  'input[type="time"]::-webkit-calendar-picker-indicator';

describe("focus rings", () => {
  /**
   * Every innermost rule in every module whose selector names a focus state,
   * or whose outline paints in the focus token, with its outline value.
   */
  function focusOutlines(): { readonly id: string; readonly value: string }[] {
    return STYLE_MODULES.flatMap((module) =>
      [...module.styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((rule) => {
        const selector = rule[1] ?? "";
        const body = rule[2] ?? "";
        const outline = /\boutline:\s*([^;]+);/.exec(body)?.[1];
        if (outline === undefined) return [];
        // A focus state inside :not() marks the rule for everything but a
        // focused element, so it is left out before the test.
        const focused =
          /:focus-visible|:focus-within|\[data-focus-visible\]/.test(
            selector.replace(/:not\([^)]*\)/g, ""),
          ) || outline.includes("var(--snui-color-focus)");
        return focused ? [{ id: module.id, value: outline }] : [];
      }),
    );
  }

  it("draws every focus ring at the shared ring width", () => {
    // Rings in the focus token and the system-colored rings forced colors
    // rebuilds them as all read the width the contrast request raises.
    const rings = focusOutlines();
    expect(rings.length).toBeGreaterThan(0);
    for (const { id, value } of rings) {
      // A ring that replaces a resting outline, as the danger button's
      // replaces its dashed state outline while it holds keyboard focus, may
      // add to the shared width, so focus reads as a new line, but always
      // builds on it.
      expect(value, id).toMatch(
        /^(var\(--snui-focus-ring-width\)|calc\(var\(--snui-focus-ring-width\) \+ \d+px\)) solid /,
      );
    }
    // No rule restates a fixed ring width outside the shorthand either.
    for (const module of STYLE_MODULES) {
      expect(module.styles, module.id).not.toMatch(/outline-width:\s*\d/);
    }
  });

  it("sets an inset ring inside the edge by the ring width", () => {
    expect(INSET_FOCUS_RING_OFFSET).toBe(
      "calc(-1 * var(--snui-focus-ring-width))",
    );
    expect(focusRingDeclarations("inset", false)).toContain(
      `outline-offset: ${INSET_FOCUS_RING_OFFSET};`,
    );
    expect(focusRingDeclarations("outset", true)).toContain(
      "outline-offset: 2px;",
    );
  });

  it("draws the date and time picker rings at the shared width in every theme", () => {
    // Chromium draws a focused picker's ring itself, 2 pixels wide and inset
    // by as much, and no author :focus-visible reaches the part. So a rule
    // under no theme sets the width and inset from the token, and the request
    // widens this ring with the rest.
    const rule = blockAt(
      FOUNDATION_STYLES,
      `\n${DATE_PICKER_PART}:focus-within,\n${TIME_PICKER_PART}:focus-within {`,
    );
    expect(rule).toContain(`outline-width: ${FOCUS_RING_WIDTH};`);
    expect(rule).toContain(`outline-offset: ${INSET_FOCUS_RING_OFFSET};`);
    // The browser still decides whether the ring shows and in what color.
    expect(rule).not.toMatch(/outline(-style|-color)?:/);
  });
});

describe("Night browser chrome", () => {
  const NIGHT_ROOT = ':scope[data-snui-theme="night"]';
  const SPINNER = `${NIGHT_ROOT} input[type="number"]::-webkit-inner-spin-button`;
  const CLEAR = `${NIGHT_ROOT} input[type="search"]::-webkit-search-cancel-button`;
  const DATE_PICKER = `${NIGHT_ROOT} ${DATE_PICKER_PART}`;
  const TIME_PICKER = `${NIGHT_ROOT} ${TIME_PICKER_PART}`;
  const GRIP = `${NIGHT_ROOT} textarea::-webkit-resizer`;
  const RTL_GRIP = `${NIGHT_ROOT} textarea:dir(rtl)::-webkit-resizer`;
  const SEGMENTS = [
    "year",
    "month",
    "week",
    "day",
    "hour",
    "minute",
    "second",
    "millisecond",
    "ampm",
  ].map((field) => `${NIGHT_ROOT} input::-webkit-datetime-edit-${field}-field`);
  const FOCUSED_SEGMENTS = SEGMENTS.map((segment) => `${segment}:focus-within`);

  /** The declarations of the rule whose selector list is exactly `selectors`. */
  function nightRule(...selectors: string[]): string {
    return blockAt(FOUNDATION_STYLES, `${selectors.join(",\n")} {`);
  }

  it("colors every scrollbar inside the panel from the root", () => {
    // scrollbar-color inherits, so the root declaration reaches the dialog,
    // menu, grid, and code block scrollers without a rule of their own.
    expect(nightRule(NIGHT_ROOT)).toContain(
      "scrollbar-color: var(--snui-color-border) var(--snui-color-surface);",
    );
  });

  it("paints a selection with the accent pair on the root and inside it", () => {
    const rule = nightRule(
      `${NIGHT_ROOT}::selection`,
      `${NIGHT_ROOT} ::selection`,
    );
    expect(rule).toContain("background-color: var(--snui-color-accent-fill);");
    expect(rule).toContain("color: var(--snui-color-on-accent);");
  });

  it("colors a native option list from the raised surface", () => {
    const rule = nightRule(`${NIGHT_ROOT} option`, `${NIGHT_ROOT} optgroup`);
    expect(rule).toContain(
      "background-color: var(--snui-color-surface-raised);",
    );
    expect(rule).toContain("color: var(--snui-color-text);");
  });

  it("covers the autofill paint and keeps the focus ring in front of it", () => {
    const cover = "inset 0 0 0 100vmax var(--snui-color-surface)";
    const resting = nightRule(
      `${NIGHT_ROOT} input:autofill`,
      `${NIGHT_ROOT} textarea:autofill`,
    );
    expect(resting).toContain(`box-shadow: ${cover};`);
    expect(resting).toContain(
      "-webkit-text-fill-color: var(--snui-color-text);",
    );
    const focused = nightRule(
      `${NIGHT_ROOT} input:autofill:focus-visible`,
      `${NIGHT_ROOT} textarea:autofill:focus-visible`,
    );
    expect(focused).toContain(`box-shadow: var(--snui-focus-ring), ${cover};`);
  });

  it("repaints the spinner and the clear button instead of removing them", () => {
    for (const part of [SPINNER, CLEAR]) {
      const rule = nightRule(part);
      expect(rule, part).toContain("appearance: none;");
      expect(rule, part).toContain(
        "background-color: var(--snui-color-text-muted);",
      );
      expect(rule, part).toMatch(/-webkit-mask: url\("data:image\/svg\+xml,/);
      expect(rule, part).toMatch(/\n {2}mask: url\("data:image\/svg\+xml,/);
      expect(rule, part).toMatch(/width: (0\.\d*[1-9]|[1-9])[\d.]*rem;/);
      // A theme must not take away a control the other themes offer: the
      // spinner is a mouse user's only pointer route to step a number.
      for (const removal of [
        "display: none",
        "visibility: hidden",
        "opacity: 0;",
        "width: 0;",
      ]) {
        expect(rule, part).not.toContain(removal);
      }
    }
  });

  it("keeps the spinner as wide as the native part it repaints", () => {
    // Chromium sizes its own spin button to the scrollbar width, 15 pixels on
    // Linux and Windows; the repainted part keeps that pointer target.
    expect(nightRule(SPINNER)).toContain("width: 0.9375rem;");
  });

  it("repaints the date and time pickers without moving their target", () => {
    for (const picker of [DATE_PICKER, TIME_PICKER]) {
      const rule = nightRule(picker);
      // The browser's icon is a background image drawn for its own scheme.
      expect(rule, picker).toContain("background-image: none;");
      expect(rule, picker).toContain(
        "background-color: var(--snui-color-text-muted);",
      );
      expect(rule, picker).toMatch(/\n {2}mask: url\("data:image\/svg\+xml,/);
      // The part keeps the box the browser gives it, so the picker opens from
      // the same target in every theme.
      expect(rule, picker).not.toMatch(
        /\b(width|height|padding|margin|display|appearance):/,
      );
    }
  });

  it("keeps a focused picker's ring, in the focus token, clear of the glyph mask", () => {
    for (const picker of [DATE_PICKER, TIME_PICKER]) {
      // Chromium matches an author :focus-within on these parts, never
      // :focus-visible, so the rule keys on it.
      const rule = nightRule(`${picker}:focus-within`);
      expect(rule, picker).toContain("outline-color: var(--snui-color-focus);");
      // The width and inset come from the rule every theme shares.
      expect(rule, picker).not.toMatch(/outline-(width|offset):/);
      // The glyph layer, then four layers opening a band as wide as the
      // shared ring width, where the ring is drawn inside the part.
      expect(rule, picker).toMatch(
        /\n {2}mask: url\("data:image\/svg\+xml,[^;]*content-box center \/ contain no-repeat, linear-gradient\(black 0 0\) top \/ 100% var\(--snui-focus-ring-width\) no-repeat, linear-gradient\(black 0 0\) bottom \/ 100% var\(--snui-focus-ring-width\) no-repeat, linear-gradient\(black 0 0\) left \/ var\(--snui-focus-ring-width\) 100% no-repeat, linear-gradient\(black 0 0\) right \/ var\(--snui-focus-ring-width\) 100% no-repeat;/,
      );
      // The resting glyph stays in the content box, so no background paints
      // in the band the ring takes.
      expect(nightRule(picker), picker).toContain(
        "background-clip: content-box;",
      );
    }
  });

  it("reads every date and time segment in the field's color", () => {
    // A segment the browser fixes as disabled otherwise takes its own grey.
    expect(nightRule(...SEGMENTS)).toContain("color: inherit;");
  });

  it("paints the segment being edited with the selection pair", () => {
    const rule = nightRule(...FOCUSED_SEGMENTS);
    expect(rule).toContain("background-color: var(--snui-color-accent-fill);");
    expect(rule).toContain("color: var(--snui-color-on-accent);");
  });

  it("draws the resize grip from the token in the browser's corner, mirrored in RTL", () => {
    const rule = nightRule(GRIP);
    // A scrollbar part takes no mask, so the strokes are gradient bands.
    expect(rule).toMatch(/background: linear-gradient\(135deg, /);
    expect(rule).toContain("var(--snui-color-text-muted)");
    // Two short strokes in a small inset square, like the native grip, so
    // they stay clear of the field's border and its rounded corner.
    expect(rule).toContain("right 3px bottom 3px / 8px 8px no-repeat");
    expect(rule).not.toMatch(/\b(width|height|display|resize):/);
    // The browser draws a right-to-left field's grip at its bottom left,
    // mirrored; the strokes turn to face that corner.
    const mirrored = nightRule(RTL_GRIP);
    expect(mirrored).toMatch(/background: linear-gradient\(225deg, /);
    expect(mirrored).toContain("left 3px bottom 3px / 8px 8px no-repeat");
  });

  it("paints the masked glyphs in the system button color under forced colors", () => {
    const forced = blockAt(FOUNDATION_STYLES, "@media (forced-colors: active)");
    const rule = blockAt(
      forced,
      `${SPINNER},\n  ${CLEAR},\n  ${DATE_PICKER},\n  ${TIME_PICKER} {`,
    );
    expect(rule).toContain("forced-color-adjust: none;");
    expect(rule).toContain("background-color: ButtonText;");
    const ring = blockAt(
      forced,
      `${DATE_PICKER}:focus-within,\n  ${TIME_PICKER}:focus-within {`,
    );
    expect(ring).toContain("outline-color: Highlight;");
  });

  it("draws the grip's strokes in button text under forced colors, on a clear corner", () => {
    const forced = blockAt(FOUNDATION_STYLES, "@media (forced-colors: active)");
    for (const [grip, side] of [
      [GRIP, "right"],
      [RTL_GRIP, "left"],
    ] as const) {
      const rule = blockAt(forced, `${grip} {`);
      expect(rule, grip).toContain("forced-color-adjust: none;");
      // The shorthand leaves the corner's background color clear: only the
      // strokes take the system color.
      expect(rule, grip).toMatch(
        /background: linear-gradient\([^;]*ButtonText 47% 56%[^;]*ButtonText 72% 81%/,
      );
      expect(rule, grip).toContain(`${side} 3px bottom 3px`);
      expect(rule, grip).not.toContain("background-color");
    }
  });

  it("draws every Night chrome color from a token the red cap holds", () => {
    const rules = [
      nightRule(NIGHT_ROOT),
      nightRule(`${NIGHT_ROOT}::selection`, `${NIGHT_ROOT} ::selection`),
      nightRule(`${NIGHT_ROOT} option`, `${NIGHT_ROOT} optgroup`),
      nightRule(
        `${NIGHT_ROOT} input:autofill`,
        `${NIGHT_ROOT} textarea:autofill`,
      ),
      nightRule(SPINNER),
      nightRule(CLEAR),
      nightRule(DATE_PICKER),
      nightRule(TIME_PICKER),
      nightRule(`${DATE_PICKER}:focus-within`),
      nightRule(`${TIME_PICKER}:focus-within`),
      nightRule(...SEGMENTS),
      nightRule(...FOCUSED_SEGMENTS),
      nightRule(GRIP),
      nightRule(RTL_GRIP),
    ].join("\n");
    // Literal colors would escape the channel cap the contrast spec applies
    // to the Night palette; a token reference cannot.
    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    for (const match of rules.matchAll(/var\((--snui-color-[a-z-]+)\)/g)) {
      const token = match[1] ?? "";
      const [, green, blue] = hexChannels(
        NIGHT_TOKENS[token as keyof typeof NIGHT_TOKENS],
      );
      expect(green, `${token} green`).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
      expect(blue, `${token} blue`).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
    }
  });
});

/**
 * Every region a component keeps mounted while it has nothing to say. Each one
 * is empty in the DOM sense while it waits, so the rule that takes it out of
 * the flow is keyed on `:empty`.
 */
const SILENT_REGION_SELECTORS = [
  ".snui-banner:empty",
  ".snui-status:empty",
  ".snui-metric__value:empty",
  ".snui-field-error:empty",
  ".snui-checkbox-group__warning:empty",
] as const;

/** Declarations that leave nothing of an element on screen. */
const NO_VISIBLE_BOX = [
  "position: absolute",
  "width: 1px",
  "height: 1px",
  "padding: 0",
  "margin: -1px",
  "border: 0",
  "overflow: hidden",
  "clip-path: inset(50%)",
] as const;

describe("mounted regions with nothing to announce", () => {
  it("costs no box, border, padding, or margin while a region waits", () => {
    for (const selector of SILENT_REGION_SELECTORS) {
      // Anchored at the start of a line, where a rule's selector list begins:
      // the same selectors also appear inside other rules' :not() lists.
      const declarations = blockAt(PANEL_STYLES, `\n${selector}`);
      for (const declaration of NO_VISIBLE_BOX) {
        expect(
          declarations,
          `${selector} does not declare ${declaration}`,
        ).toContain(declaration);
      }
      // display: none would take the region out of the accessibility tree
      // along with the layout, and a screen reader would never observe it.
      expect(declarations).not.toContain("display: none");
    }
  });
});

/*
 * Spacing the default card sets for its own chrome. A flush card draws none of
 * that chrome, so it has to clear every one of them: a consumer reaching for
 * flush is placing its own surface in the card, and a spacing it did not ask
 * for offsets that surface from the edge it was aligned to. Doubling a selector
 * to remove one is exactly the override `density="flush"` exists to delete.
 */
const CARD_CHROME_SPACING = ["gap", "padding"] as const;

describe("flush cards", () => {
  it("clears every spacing the default card sets", () => {
    const base = blockAt(PANEL_STYLES, ".snui-card {");
    const flush = blockAt(PANEL_STYLES, ".snui-card--flush {");

    for (const property of CARD_CHROME_SPACING) {
      expect(base, `.snui-card no longer sets ${property}`).toContain(
        `${property}: `,
      );
      expect(
        flush,
        `.snui-card--flush inherits the ${property} the default card sets`,
      ).toContain(`${property}: 0`);
    }
  });
});

describe("published panel container", () => {
  it("names the container consumers query and the width it turns at", () => {
    // PanelRoot declares the name once, from the constant, so the two cannot
    // drift; every query below is written out and is checked against it here.
    expect(PANEL_STYLES).toContain(`container-name: ${PANEL_CONTAINER_NAME};`);
    expect(PANEL_STYLES).toContain("container-type: inline-size;");

    let queryCount = 0;
    for (const module of STYLE_MODULES) {
      for (const match of module.styles.matchAll(/@container\s+([^{]*)\{/g)) {
        const prelude = (match[1] ?? "").trim();
        queryCount += 1;
        expect(
          prelude.startsWith(`${PANEL_CONTAINER_NAME} `),
          `${module.id} queries a container this package does not publish: ${prelude}`,
        ).toBe(true);
        // A container condition cannot read a custom property, which is why
        // the breakpoint ships as a constant rather than a token. A var()
        // here would silently never match.
        expect(prelude).not.toContain("var(");
      }
    }
    expect(queryCount).toBeGreaterThan(0);
  });

  it("turns at the published breakpoint everywhere it turns", () => {
    let narrowCount = 0;
    for (const module of STYLE_MODULES) {
      for (const match of module.styles.matchAll(
        /@container[^{]*\(max-width:\s*([^)]+)\)/g,
      )) {
        narrowCount += 1;
        expect((match[1] ?? "").trim()).toBe(CONTAINER_BREAKPOINT_NARROW);
      }
    }
    expect(narrowCount).toBeGreaterThan(0);
  });
});
