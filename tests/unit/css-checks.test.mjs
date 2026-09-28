import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  maskCss,
  readCss,
  singleClassOf,
  splitSelectorList,
} from "../../bin/lib/css-source.mjs";
import {
  assertPackageTokens,
  CONSUMER_HOOK_NAMES,
  declaredTokenNames,
  findTokenProblems,
  PANEL_CONTAINER_NAME,
} from "../../bin/lib/package-tokens.mjs";
import { repositoryPath } from "../../scripts/lib/paths.mjs";
import {
  PANEL_CONTAINER_NAME as PACKAGE_CONTAINER_NAME,
  PUBLIC_TOKEN_NAMES,
  renderTokenStyles,
} from "../../src/styles/tokens.js";

describe("the CSS reader", () => {
  it("drops comments and blanks strings so neither can end a block", () => {
    expect(maskCss('a{content:"}{;"}/* } */b{}')).toBe('a{content:"   "} b{}');
    expect(maskCss("a{content:'it\\'s'}")).toBe("a{content:'     '}");
    expect(maskCss('a{content:"open')).toBe('a{content:"    "');
  });

  it("splits selector lists at top-level commas only", () => {
    expect(splitSelectorList(".a, :is(.b, .c) > .d ,[x='1,2'] ,")).toEqual([
      ".a",
      ":is(.b, .c) > .d",
      "[x='1,2']",
    ]);
  });

  it("reads rules, at-rules, and declarations, nested ones included", () => {
    const { atRules, declarations, rules } = readCss(`
      @import url("a;b.css");
      .row { gap: var(--snui-space-2); color: red }
      @container snui-panel (width <= 32rem) {
        .row, .cell::after { gap: 0; }
      }
      .list { .item { margin: 0 } }
      @font-face { font-family: x; }
    `);

    expect(atRules.map(({ name }) => name)).toEqual([
      "import",
      "container",
      "font-face",
    ]);
    expect(atRules[1].prelude).toBe("snui-panel (width <= 32rem)");
    expect(rules).toEqual([
      {
        atRules: [],
        declarations: [
          { property: "gap", value: "var(--snui-space-2)" },
          { property: "color", value: "red" },
        ],
        nested: false,
        selectors: [".row"],
      },
      {
        atRules: ["@container snui-panel (width <= 32rem)"],
        declarations: [{ property: "gap", value: "0" }],
        nested: false,
        selectors: [".row", ".cell::after"],
      },
      {
        atRules: [],
        declarations: [],
        nested: false,
        selectors: [".list"],
      },
      {
        atRules: [],
        declarations: [{ property: "margin", value: "0" }],
        nested: true,
        selectors: [".item"],
      },
    ]);
    expect(declarations.map(({ property }) => property)).toEqual([
      "gap",
      "color",
      "gap",
      "margin",
      "font-family",
    ]);
  });

  it("names the class of a single class selector and nothing else", () => {
    expect(singleClassOf(" .row ")).toBe("row");
    expect(singleClassOf(".row::after")).toBe("row");
    expect(singleClassOf(".-row_2")).toBe("-row_2");
    for (const selector of [".row.row", ".row:hover", ".list .row", "row"]) {
      expect(singleClassOf(selector), selector).toBeUndefined();
    }
  });
});

describe("package names in consumer CSS", () => {
  const allowed = new Set([
    "--snui-space-2",
    "--snui-color-border",
    ...CONSUMER_HOOK_NAMES,
  ]);

  it("reads exactly the public token names from a token sheet", () => {
    // The CLI takes the allowed names from the installed release's
    // tokens.css, which is only right while that sheet declares exactly the
    // public tokens and nothing else.
    expect(
      [...declaredTokenNames(renderTokenStyles(".snui-tokens"))].sort(),
    ).toEqual([...PUBLIC_TOKEN_NAMES].sort());
  });

  it("keeps the container name and the hooks the package documents", () => {
    expect(PANEL_CONTAINER_NAME).toBe(PACKAGE_CONTAINER_NAME);
    const reference = readFileSync(
      repositoryPath("docs", "api-reference.md"),
      "utf8",
    );
    for (const hook of CONSUMER_HOOK_NAMES) {
      expect(reference, hook).toContain(`\`${hook}\``);
      expect(PUBLIC_TOKEN_NAMES, hook).not.toContain(hook);
    }
  });

  it("passes public tokens, hooks, overrides, data attributes, and the panel container", () => {
    expect(
      findTokenProblems(
        `.row{gap:var(--snui-space-2);--snui-color-border:red}
        .grid{--snui-data-grid-max-block-size:40dvh}
        [data-snui-theme] .x{content:"module__snui-space-2"}
        @container snui-panel (width<=32rem){.row{gap:0}}
        @container (width<=32rem){.row{gap:0}}
        @container not (width<=32rem){.row{gap:0}}`,
        allowed,
      ),
    ).toEqual([]);
  });

  it("names unknown references, unknown settings, renames, and misnamed containers", () => {
    expect(
      findTokenProblems(
        `.row{gap:var(--snui-space-22);--snui-colour-border:red;color:var(--a1b2-snui-color-border)}
        .module__snui-panel{gap:0}
        @container snui-panle (width<=32rem){.row{gap:0}}
        @container module__snui-panel (width<=32rem){.row{gap:0}}`,
        allowed,
      ),
    ).toEqual([
      "module__snui-panel is a renamed form of the package's snui-panel. A CSS modules pipeline renamed it, so it no longer matches anything the package declares; switch off identifier renaming for the package's names.",
      "--a1b2-snui-color-border is a renamed form of the package's snui-color-border. A CSS modules pipeline renamed it, so it no longer matches anything the package declares; switch off identifier renaming for the package's names.",
      "var(--snui-space-22) names no public token or documented consumer hook, so the property silently takes its fallback, inherited, or initial value.",
      "--snui-colour-border is set, but it is no public token or documented consumer hook, so nothing in the package reads it.",
      "@container snui-panle names no container. The panel container is named exactly snui-panel.",
    ]);
  });

  it("names a rename that adds a hash after the name as well as a prefix", () => {
    expect(
      findTokenProblems(
        `.a{color:var(--x_y-snui-color-border-h4sh)}
        @container app__snui-panel__h4sh (width<=32rem){.a{gap:0}}
        @container x-snui-panle (width<=32rem){.a{gap:0}}`,
        allowed,
      ),
    ).toEqual([
      "app__snui-panel__h4sh is a renamed form of the package's snui-panel. A CSS modules pipeline renamed it, so it no longer matches anything the package declares; switch off identifier renaming for the package's names.",
      "--x_y-snui-color-border-h4sh is a renamed form of the package's snui-color-border. A CSS modules pipeline renamed it, so it no longer matches anything the package declares; switch off identifier renaming for the package's names.",
      "@container x-snui-panle names no container. The panel container is named exactly snui-panel.",
    ]);
  });

  it("reports every file's problems together", () => {
    expect(() =>
      assertPackageTokens(
        [
          { name: "a.css", source: ".a{gap:var(--snui-space-2)}" },
          { name: "b.css", source: ".b{gap:var(--snui-space-9)}" },
        ],
        allowed,
      ),
    ).toThrow(
      "The built remote's CSS references package names the installed release does not declare:\nb.css: var(--snui-space-9)",
    );
    expect(() =>
      assertPackageTokens([{ name: "a.css", source: ".a{}" }], allowed),
    ).not.toThrow();
  });
});
