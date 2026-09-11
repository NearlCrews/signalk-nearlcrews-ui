import { describe, expect, it } from "vitest";

import { PANEL_STYLES } from "../../src/styles/index.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import {
  CONTAINER_BREAKPOINT_NARROW,
  PANEL_CONTAINER_NAME,
} from "../../src/styles/tokens.js";
import { PACKAGE_VERSION, SPINNER_ANIMATION_NAME } from "../../src/version.js";

describe("versioned keyframes", () => {
  it("derives the spinner keyframe name from the package version", () => {
    expect(SPINNER_ANIMATION_NAME).toBe(
      `snui-v${PACKAGE_VERSION.replaceAll(".", "-")}-spin`,
    );
  });

  it("defines every keyframe a module animates in that module or the root", () => {
    const rootKeyframes = defined(PANEL_STYLES);
    let referenceCount = 0;
    for (const module of STYLE_MODULES) {
      const declared = new Set([...rootKeyframes, ...defined(module.styles)]);
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
    const versionMarker = PACKAGE_VERSION.replaceAll(".", "-");
    for (const module of STYLE_MODULES) {
      for (const match of module.styles.matchAll(
        /@keyframes\s+([A-Za-z0-9_-]+)/g,
      )) {
        const name = match[1] ?? "";
        expect(name, `${name} carries no package version`).toContain(
          versionMarker,
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
    expect(defined(PANEL_STYLES)).toContain(SPINNER_ANIMATION_NAME);
    expect(SPINNER_ANIMATION_NAME).toContain(
      PACKAGE_VERSION.replaceAll(".", "-"),
    );
  });
});

function defined(styles: string): string[] {
  return [...styles.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map(
    (match) => match[1] ?? "",
  );
}

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
 * Every region a component keeps mounted while it has nothing to say. Each one
 * is empty in the DOM sense while it waits, so the rule that takes it out of
 * the flow is keyed on `:empty`.
 */
const SILENT_REGION_SELECTORS = [
  ".snui-banner:empty",
  ".snui-status:empty",
  ".snui-metric__value:empty",
  ".snui-field__error:empty",
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

/** The declarations of the first rule whose selector list names `selector`. */
function declarationsFor(css: string, selector: string): string {
  const index = css.indexOf(selector);
  if (index === -1) throw new Error(`No rule opens with ${selector}.`);
  const open = css.indexOf("{", index);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

describe("mounted regions with nothing to announce", () => {
  it("costs no box, border, padding, or margin while a region waits", () => {
    for (const selector of SILENT_REGION_SELECTORS) {
      const declarations = declarationsFor(PANEL_STYLES, selector);
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
    const base = declarationsFor(PANEL_STYLES, ".snui-card {");
    const flush = declarationsFor(PANEL_STYLES, ".snui-card--flush {");

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
