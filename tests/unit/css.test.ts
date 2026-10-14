import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { transform } from "lightningcss";
import { beforeAll, describe, expect, it } from "vitest";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import { PANEL_STYLES } from "../../src/styles/root-sheet.js";
import {
  PUBLIC_COLOR_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
  TOKEN_STYLES,
} from "../../src/styles/tokens.js";
import { SPACE_SCALE } from "../../src/utils/variants.js";
import {
  ROOT_CLASS,
  ROOT_SELECTOR,
  VISUALLY_HIDDEN_CLASS,
} from "../../src/version.js";
import {
  ALL_MODULE_STYLES,
  classNamesIn,
  ruleBody,
  themeSelector,
} from "../css-helpers.js";

// jsdom rewrites import.meta.url to an http URL, so resolve from the
// project root (the vitest working directory) instead. The components apply
// most classes, and the utilities render a few of their own.
const CLASS_SOURCE_DIRS = ["components", "utils"].map((directory) =>
  join(process.cwd(), "src", directory),
);

/**
 * Class names the sources apply through a shared constant rather than a
 * literal, by the constant's name, so a reference to the constant counts as
 * a reference to the class.
 */
const SHARED_CLASS_CONSTANTS: ReadonlyMap<string, string> = new Map([
  ["ROOT_CLASS", ROOT_CLASS],
  ["VISUALLY_HIDDEN_CLASS", VISUALLY_HIDDEN_CLASS],
]);

/** A module constant holding a class name, with its name and value captured. */
const CLASS_CONSTANT_PATTERN =
  /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*"(snui-[a-z0-9_-]+)"/g;

/** A quoted word, the shape every variant value a prop accepts is spelled in. */
const QUOTED_WORD_PATTERN = /"([a-z0-9][a-z0-9-]*)"/g;

/**
 * Class tokens referenced by component TSX. The lookbehind keeps custom
 * property names (`--snui-*`) and version attributes (`data-snui-*`) out of
 * the class set. Tokens ending in a dash come from template literals such as
 * `snui-button--${variant}` and act as prefixes.
 */
const CLASS_TOKEN_PATTERN = /(?<![-\w])snui-[a-z0-9_-]+/g;

/** Classes the components reference without a matching rule, each by design. */
const UNSTYLED_HOOK_CLASSES: ReadonlySet<string> = new Set([
  // Outer react-aria field wrappers; the layout rules live on the __button
  // element rendered inside them.
  "snui-radio",
  "snui-switch",
  // Structural grouping inside the section header, sized by the header's own
  // child rules.
  "snui-section__heading-group",
  // Focus hook the toast region uses to find the dismiss control; the button
  // itself is styled by the shared snui-button rules.
  "snui-toast__dismiss",
]);

function componentClassTokens(): {
  literals: Set<string>;
  prefixes: Set<string>;
  words: Set<string>;
} {
  const literals = new Set<string>();
  const prefixes = new Set<string>();
  const words = new Set<string>();
  const files = CLASS_SOURCE_DIRS.flatMap((directory) =>
    readdirSync(directory)
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => join(directory, file)),
  );
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // A class a module names once as a constant and builds its modifiers
    // from: its references read as the literal it holds.
    const constants = new Map(SHARED_CLASS_CONSTANTS);
    for (const [, name = "", value = ""] of source.matchAll(
      CLASS_CONSTANT_PATTERN,
    )) {
      constants.set(name, value);
    }
    for (const [, word = ""] of source.matchAll(QUOTED_WORD_PATTERN)) {
      words.add(word);
    }
    for (const sourceLine of source.split("\n")) {
      // Toast element keys use an `snui-toast-${n}` template; keys are not
      // classes, so key-building lines stay out of the scan.
      if (/\bkey\s*=/.test(sourceLine)) continue;
      let line = sourceLine;
      for (const [name, value] of constants) {
        if (!new RegExp(`\\b${name}\\b`).test(line)) continue;
        literals.add(value);
        line = line.replaceAll(`\${${name}}`, value);
      }
      for (const match of line.matchAll(CLASS_TOKEN_PATTERN)) {
        const token = match[0];
        if (token.endsWith("-")) prefixes.add(token);
        else literals.add(token);
      }
    }
  }
  return { literals, prefixes, words };
}

describe.each(STYLE_MODULES.map((module) => [module.id, module] as const))(
  "stylesheet validity: %s module",
  (_id, module) => {
    it("parses without errors and round-trips through lightningcss", () => {
      const first = transform({
        filename: `${module.id}.css`,
        code: Buffer.from(module.styles, "utf8"),
        minify: false,
      });
      expect(first.warnings).toEqual([]);

      // lightningcss normalizes declaration order, so the round-trip compares
      // selector and token content rather than bytes.
      const second = transform({
        filename: `${module.id}-roundtrip.css`,
        code: first.code,
        minify: false,
      });
      const output = Buffer.from(second.code).toString("utf8");
      expect(classNamesIn(output)).toEqual(classNamesIn(module.styles));
    });
  },
);

describe("root module", () => {
  it("keeps every public token through the lightningcss round-trip", () => {
    const output = Buffer.from(
      transform({
        filename: "root.css",
        code: Buffer.from(PANEL_STYLES, "utf8"),
        minify: false,
      }).code,
    ).toString("utf8");
    for (const token of PUBLIC_TOKEN_NAMES) {
      expect(output).toContain(`${token}:`);
    }
  });

  it("is the only module that declares tokens", () => {
    const rootTokens = definedTokens(PANEL_STYLES);
    for (const module of STYLE_MODULES.slice(1)) {
      for (const match of module.styles.matchAll(
        /(--snui-[a-z0-9-]+)\s*:\s*([^;]+);/g,
      )) {
        const name = match[1] ?? "";
        const value = (match[2] ?? "").trim();
        expect(
          rootTokens.has(name),
          `${module.id} declares ${name}, which the root module never defines; tokens belong to the root module`,
        ).toBe(true);
        expect(
          value,
          `${module.id} gives ${name} a raw value; a module may only point a root token at another root token`,
        ).toMatch(/^var\(--snui-[a-z0-9-]+\)$/);
      }
    }
  });
});

describe("class coverage", () => {
  // Both directions compare the same two sets, so the component sources are
  // read once for the pair.
  let defined = new Set<string>();
  let literals = new Set<string>();
  let prefixes = new Set<string>();
  let words = new Set<string>();
  beforeAll(() => {
    defined = classNamesIn(ALL_MODULE_STYLES);
    ({ literals, prefixes, words } = componentClassTokens());
  });

  it("styles every class the components reference", () => {
    for (const literal of [...literals].sort()) {
      if (UNSTYLED_HOOK_CLASSES.has(literal)) continue;
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
    // A class built from a template prefix counts only when the rest of its
    // name is a value the sources spell, so a variant whose value no prop
    // offers any more is caught rather than kept alive by its prefix. The gap
    // steps are numbers from the shared space scale.
    const offered = (suffix: string): boolean =>
      words.has(suffix) ||
      (SPACE_SCALE as readonly number[]).includes(Number(suffix));
    for (const name of [...defined].sort()) {
      const referenced =
        literals.has(name) ||
        [...prefixes].some(
          (prefix) =>
            name.startsWith(prefix) && offered(name.slice(prefix.length)),
        );
      expect(
        referenced,
        `the stylesheet styles .${name} but no component references it`,
      ).toBe(true);
    }
  });
});

function definedTokens(body: string): Set<string> {
  return new Set(
    [...body.matchAll(/(--snui-[a-z0-9-]+)\s*:/g)].map(
      (match) => match[1] ?? "",
    ),
  );
}

describe("theme token blocks", () => {
  const THEME_SELECTORS = ["light", "dark", "night"].map(themeSelector);

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

  it("lists every defined token as public API", () => {
    const publicNames = new Set<string>(PUBLIC_TOKEN_NAMES);
    const defined = new Set([
      ...definedTokens(ruleBody(TOKEN_STYLES, ROOT_SELECTOR)),
      ...THEME_SELECTORS.flatMap((selector) => [
        ...definedTokens(ruleBody(TOKEN_STYLES, selector)),
      ]),
    ]);
    for (const token of [...defined].sort()) {
      expect(
        publicNames.has(token),
        `${token} is defined by the token stylesheet but is not in PUBLIC_TOKEN_NAMES; every token the sheet declares is public API`,
      ).toBe(true);
    }
  });
});
