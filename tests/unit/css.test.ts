import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

import { PANEL_STYLES } from "../../src/styles/index.js";
import {
  PUBLIC_COLOR_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  TOKEN_STYLES,
} from "../../src/styles/tokens.js";
import { ROOT_SELECTOR } from "../../src/version.js";

// jsdom rewrites import.meta.url to an http URL, so resolve from the
// project root (the vitest working directory) instead.
const COMPONENTS_DIR = join(process.cwd(), "src", "components");

/**
 * Class tokens referenced by component TSX. The lookbehind keeps custom
 * property names (`--snui-*`) and version attributes (`data-snui-*`) out of
 * the class set. Tokens ending in a dash come from template literals such as
 * `snui-button--${variant}` and act as prefixes.
 */
const CLASS_TOKEN_PATTERN = /(?<![-\w])snui-[a-z0-9_-]+/g;

/** Classes the components reference without a matching rule, each by design. */
const UNSTYLED_HOOK_CLASSES: Record<string, true> = {
  // Outer react-aria field wrappers; the layout rules live on the __button
  // element rendered inside them.
  "snui-radio": true,
  "snui-switch": true,
  // Structural grouping inside the section header, sized by the header's own
  // child rules.
  "snui-section__heading-group": true,
  // Inherits size, weight, and color from the surrounding snui-toast__tone rule.
  "snui-toast__tone-glyph": true,
};

/** Classes the stylesheet defines without a literal TSX reference. */
const STYLESHEET_ONLY_CLASSES: Record<string, true> = {
  // Applied through the ROOT_CLASS constant, so the literal never appears in
  // component source.
  "snui-root": true,
};

function componentClassTokens(): {
  literals: Set<string>;
  prefixes: Set<string>;
} {
  const literals = new Set<string>();
  const prefixes = new Set<string>();
  const files = readdirSync(COMPONENTS_DIR).filter((file) =>
    file.endsWith(".tsx"),
  );
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const source = readFileSync(`${COMPONENTS_DIR}/${file}`, "utf8");
    for (const line of source.split("\n")) {
      // Toast element keys use an `snui-toast-${n}` template; keys are not
      // classes, so key-building lines stay out of the scan.
      if (/\bkey\s*=/.test(line)) continue;
      for (const match of line.matchAll(CLASS_TOKEN_PATTERN)) {
        const token = match[0];
        if (token.endsWith("-")) prefixes.add(token);
        else literals.add(token);
      }
    }
  }
  return { literals, prefixes };
}

function stylesheetClasses(): Set<string> {
  return new Set(
    [...PANEL_STYLES.matchAll(/\.(snui-[a-z0-9_-]+)/g)].map(
      (match) => match[1] ?? "",
    ),
  );
}

describe("stylesheet validity", () => {
  it("parses without errors and round-trips through lightningcss", () => {
    const first = transform({
      filename: "panel.css",
      code: Buffer.from(PANEL_STYLES, "utf8"),
      minify: false,
    });
    expect(first.warnings).toEqual([]);

    // lightningcss normalizes declaration order, so the round-trip compares
    // selector and token content rather than bytes.
    const second = transform({
      filename: "panel-roundtrip.css",
      code: first.code,
      minify: false,
    });
    const output = Buffer.from(second.code).toString("utf8");
    const sourceClasses = stylesheetClasses();
    const outputClasses = new Set(
      [...output.matchAll(/\.(snui-[a-z0-9_-]+)/g)].map(
        (match) => match[1] ?? "",
      ),
    );
    expect(outputClasses).toEqual(sourceClasses);
    for (const token of PUBLIC_TOKEN_NAMES) {
      expect(output).toContain(`${token}:`);
    }
  });
});

describe("class coverage", () => {
  it("styles every class the components reference", () => {
    const defined = stylesheetClasses();
    const { literals, prefixes } = componentClassTokens();

    for (const literal of [...literals].sort()) {
      if (UNSTYLED_HOOK_CLASSES[literal] === true) continue;
      expect(
        defined.has(literal),
        `components reference .${literal} but the stylesheet never styles it`,
      ).toBe(true);
    }
    for (const prefix of [...prefixes].sort()) {
      const covered = [...defined].some((name) => name.startsWith(prefix));
      expect(
        covered,
        `components build "${prefix}…" classes but the stylesheet styles none of them`,
      ).toBe(true);
    }
  });

  it("keeps every stylesheet class referenced by the components", () => {
    const defined = stylesheetClasses();
    const { literals, prefixes } = componentClassTokens();

    for (const name of [...defined].sort()) {
      if (STYLESHEET_ONLY_CLASSES[name] === true) continue;
      const referenced =
        literals.has(name) ||
        [...prefixes].some((prefix) => name.startsWith(prefix));
      expect(
        referenced,
        `the stylesheet styles .${name} but no component references it`,
      ).toBe(true);
    }
  });
});

/** Extracts the body of the first rule whose selector exactly matches. */
function ruleBody(styles: string, selector: string): string {
  const start = styles.indexOf(selector);
  expect(start, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
  const open = styles.indexOf("{", start + selector.length);
  let depth = 0;
  for (let index = open; index < styles.length; index += 1) {
    const char = styles[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return styles.slice(open + 1, index);
    }
  }
  throw new Error(`unterminated rule for ${selector}`);
}

function definedTokens(body: string): Set<string> {
  return new Set(
    [...body.matchAll(/(--snui-[a-z0-9-]+)\s*:/g)].map(
      (match) => match[1] ?? "",
    ),
  );
}

describe("theme token blocks", () => {
  const THEME_SELECTORS = [
    `${ROOT_SELECTOR}[data-snui-theme="light"]`,
    `${ROOT_SELECTOR}[data-snui-theme="dark"]`,
    `${ROOT_SELECTOR}[data-snui-theme="night"]`,
  ] as const;

  it("defines every public token in the base root block", () => {
    const base = definedTokens(ruleBody(TOKEN_STYLES, ROOT_SELECTOR));
    for (const token of PUBLIC_TOKEN_NAMES) {
      expect(base.has(token), `base root block never defines ${token}`).toBe(
        true,
      );
    }
  });

  it("defines every public color token in each explicit theme block", () => {
    for (const selector of THEME_SELECTORS) {
      const block = definedTokens(ruleBody(TOKEN_STYLES, selector));
      for (const token of PUBLIC_COLOR_TOKEN_NAMES) {
        expect(block.has(token), `${selector} never overrides ${token}`).toBe(
          true,
        );
      }
    }
  });

  it("overrides a public token in every theme block or in none", () => {
    const blocks = THEME_SELECTORS.map((selector) =>
      definedTokens(ruleBody(TOKEN_STYLES, selector)),
    );
    for (const token of PUBLIC_TOKEN_NAMES) {
      const overridden = blocks.filter((block) => block.has(token)).length;
      expect(
        overridden === 0 || overridden === blocks.length,
        `${token} is overridden in ${String(overridden)} of ${String(blocks.length)} theme blocks; a partial override silently falls back to the base value`,
      ).toBe(true);
    }
  });
});
