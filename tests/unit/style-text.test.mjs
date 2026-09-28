import { describe, expect, it } from "vitest";

import {
  applyEdits,
  compactCss,
  createCssState,
  createOffsetMapper,
  cssTokens,
  decodeVlq,
  encodeVlq,
  remapSourceMap,
  styleTextDifferences,
  styleTextEdits,
} from "../../scripts/lib/style-text.mjs";

/**
 * Sources in these tests spell an interpolation `#{`, which the helper turns
 * into the real thing, so a sample of compiled code does not read as a
 * placeholder left in an ordinary string.
 */
const js = (text) => text.replaceAll("#{", "${");

/** Compacts a compiled module's source the way the build step does. */
function compact(source) {
  return applyEdits(source, styleTextEdits(source, "module.js"));
}

describe("compactCss", () => {
  it("collapses whitespace runs and comments to one space", () => {
    expect(
      compactCss(`
.snui-a {
  /* Why the rule exists. */
  color: red;

  margin:   0;
}
`),
    ).toBe(" .snui-a { color: red; margin: 0; } ");
  });

  it("replaces a comment between two tokens with a space rather than nothing", () => {
    expect(compactCss("a/* note */b")).toBe("a b");
  });

  it("copies CSS strings as written", () => {
    expect(compactCss('content:  "a  /* b */  c" ;')).toBe(
      'content: "a  /* b */  c" ;',
    );
    expect(compactCss("content: 'it\\'s  here';")).toBe(
      "content: 'it\\'s  here';",
    );
  });

  it("keeps the whitespace a hex escape consumes", () => {
    expect(compactCss('content: "\\21C5  x";')).toBe('content: "\\21C5  x";');
    expect(compactCss(".a\\31  \n .b")).toBe(".a\\31  .b");
    expect(compactCss(".a\\31\r\n\r\n.b")).toBe(".a\\31\r\n .b");
    expect(compactCss(".a\\:b  c")).toBe(".a\\:b c");
    expect(compactCss("x\\")).toBe("x\\");
    expect(compactCss("x\\31")).toBe("x\\31");
  });

  it("carries an open comment or string into the next part", () => {
    const state = createCssState();
    expect(compactCss("a /* open", state)).toBe("a ");
    expect(state.comment).toBe(true);
    expect(compactCss("still */ b", state)).toBe(" b");
    expect(state.comment).toBe(false);

    expect(compactCss('[data-x="', state)).toBe('[data-x="');
    expect(state.quote).toBe('"');
    expect(compactCss('"] {  }', state)).toBe('"] { }');
    expect(state.quote).toBeUndefined();
  });

  it("keeps a trailing space where the next part is not visible", () => {
    expect(compactCss("a\n")).toBe("a ");
    expect(compactCss("")).toBe("");
  });
});

describe("styleTextEdits", () => {
  it("compacts string literals and re-quotes them", () => {
    expect(
      compact(`const RULES = ["  color: red;", "  margin: 0;"].join("\\n");`),
    ).toBe(`const RULES = [" color: red;", " margin: 0;"].join(" ");`);
  });

  it("compacts every text part of a template literal, nested ones included", () => {
    const source = [
      "export const STYLES = scope(`",
      ".a {",
      "  ${[",
      '    "  color: red;",',
      '  ].join("\\n")}',
      "  /* note */",
      '  content: "\\\\21C5";',
      "}",
      "`);",
    ].join("\n");
    expect(compact(source)).toBe(
      [
        "export const STYLES = scope(` .a { ${[",
        '    " color: red;",',
        '  ].join(" ")} content: "\\\\21C5"; } `);',
      ].join("\n"),
    );
  });

  it("escapes what a template literal body cannot hold", () => {
    expect(compact(js('const A = "  a`b  #{c}  d\\\\e";'))).toBe(
      js('const A = " a`b #{c} d\\\\e";'),
    );
    expect(compact(js("const A = `  a\\`b  \\#{c}  d\\\\e`;"))).toBe(
      js("const A = ` a\\`b \\#{c} d\\\\e`;"),
    );
  });

  it("leaves module specifiers, tagged templates, and compact text alone", () => {
    const source = [
      'import { a } from "./a  b.js";',
      'export { b } from "./c  d.js";',
      'const lazy = import("./e  f.js");',
      "const raw = String.raw`  x\n  y`;",
      'const tight = "color: red;";',
    ].join("\n");
    expect(styleTextEdits(source, "module.js")).toEqual([]);
  });

  it("refuses an interpolation inside a CSS comment", () => {
    expect(() => compact(js("const A = `a /* #{b} */ c`;"))).toThrow(
      "module.js:1:20: an interpolation sits inside a CSS comment",
    );
  });

  it("refuses a literal that ends inside a comment or a string", () => {
    expect(() => compact('const A = "a /* open";')).toThrow(
      "module.js:1:11: A string literal ends inside a CSS comment",
    );
    expect(() => compact('const A = `content: "open`;')).toThrow(
      "module.js:1:11: A template literal ends inside a CSS string",
    );
    expect(() => compact(js("const A = `x #{b} content: 'open`;"))).toThrow(
      "A template literal ends inside a CSS string",
    );
  });

  it("returns the edits in source order", () => {
    const edits = styleTextEdits(
      js('const A = `  a #{["  b"].join("\\n")}  c`;'),
      "module.js",
    );
    expect(edits.map((edit) => edit.start)).toEqual(
      [...edits.map((edit) => edit.start)].sort((a, b) => a - b),
    );
    expect(edits).toHaveLength(4);
  });
});

describe("offsets and source maps", () => {
  const source = "a = `\n    x\n`;\nfoo();\n";
  const edits = styleTextEdits(source, "module.js");

  it("maps offsets around and inside an edit", () => {
    const mapOffset = createOffsetMapper(edits);
    const [edit] = edits;
    expect(mapOffset(0)).toBe(0);
    expect(mapOffset(edit.start)).toBe(edit.start);
    expect(mapOffset(edit.start + 2)).toBe(edit.start);
    const shift = edit.text.length - (edit.end - edit.start);
    expect(mapOffset(source.indexOf("foo"))).toBe(
      source.indexOf("foo") + shift,
    );
  });

  it("round-trips Base64 VLQ values", () => {
    const values = [0, 1, -1, 15, -16, 16, 1024, -123456];
    expect(decodeVlq(encodeVlq(values))).toEqual(values);
    expect(encodeVlq([0, 0, 1, -1])).toBe("AACD");
    expect(() => decodeVlq("A!")).toThrow('Invalid Base64 VLQ digit "!"');
    expect(() => decodeVlq("g")).toThrow("Truncated Base64 VLQ segment");
  });

  it("moves every generated position with the text around it", () => {
    // Line 0 maps "a" and the template start; line 3 maps "foo".
    const map = {
      mappings: [
        `${encodeVlq([0, 0, 0, 0])},${encodeVlq([4, 0, 0, 4])}`,
        "",
        "",
        encodeVlq([0, 0, 5, -4, 0]),
      ].join(";"),
      names: ["foo"],
      sources: ["module.ts"],
      version: 3,
    };
    const rewritten = applyEdits(source, edits);
    expect(rewritten).toBe("a = ` x `;\nfoo();\n");
    const remapped = remapSourceMap(map, source, edits);
    expect(remapped.names).toEqual(["foo"]);
    expect(remapped.mappings).toBe(
      [
        `${encodeVlq([0, 0, 0, 0])},${encodeVlq([4, 0, 0, 4])}`,
        encodeVlq([0, 0, 5, -4, 0]),
      ].join(";"),
    );
  });
});

describe("cssTokens", () => {
  it("drops comments, merges whitespace, and keeps strings and escapes whole", () => {
    expect(cssTokens("a /* x */  b \"c  d\" \\31  e'f\\'g'")).toEqual([
      "a",
      " ",
      "b",
      " ",
      '"c  d"',
      " ",
      "\\31 ",
      " ",
      "e",
      "'f\\'g'",
    ]);
  });

  it("separates the runs a comment divides", () => {
    expect(cssTokens("a/**/b")).toEqual(["a", "b"]);
    expect(cssTokens("a b")).not.toEqual(cssTokens("a/**/b"));
    expect(cssTokens("a /* open")).toEqual(["a", " "]);
  });
});

describe("styleTextDifferences", () => {
  const identity = (styles) =>
    styles
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\s+/g, " ")
      .trim();

  it("accepts compacted text with the same tokens", () => {
    expect(
      styleTextDifferences(
        [{ id: "root", styles: "\n.a {\n  color: red; /* why */\n}\n" }],
        [{ id: "root", styles: " .a { color: red; } " }],
        identity,
      ),
    ).toEqual([]);
  });

  it("reports text the compaction step never reached", () => {
    expect(
      styleTextDifferences(
        [{ id: "root", styles: ".a {\n}" }],
        [{ id: "root", styles: ".a {\n}" }],
        identity,
      ),
    ).toEqual([
      "root: the built text still holds a line break or a comment, so the compaction step did not run.",
    ]);
  });

  it("reports a token or meaning change", () => {
    const failures = styleTextDifferences(
      [{ id: "root", styles: ".a/**/.b { color: red; }" }],
      [{ id: "root", styles: ".a .b { color: blue; }" }],
      (styles) => styles,
    );
    expect(failures).toEqual([
      'root: the built CSS tokens differ from the source at token 1 (".b" in the source, " " built).',
      "root: the built CSS normalizes to different rules than the source.",
    ]);
  });

  it("reports built text that ends early", () => {
    expect(
      styleTextDifferences(
        [{ id: "root", styles: ".a { }" }],
        [{ id: "root", styles: ".a {" }],
        (styles) => styles.replace(/\s/g, ""),
      ),
    ).toEqual([
      'root: the built CSS tokens differ from the source at token 3 (" " in the source, undefined built).',
      "root: the built CSS normalizes to different rules than the source.",
    ]);
  });

  it("reports a different module list", () => {
    expect(
      styleTextDifferences(
        [{ id: "root", styles: "" }],
        [
          { id: "root", styles: "" },
          { id: "dialog", styles: "" },
        ],
        identity,
      ),
    ).toEqual([
      "The built style modules are root, dialog, but the source declares root.",
    ]);
  });
});
