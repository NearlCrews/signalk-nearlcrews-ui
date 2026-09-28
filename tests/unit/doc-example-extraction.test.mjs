import { describe, expect, it } from "vitest";
import {
  atDocumentLines,
  exampleFiles,
} from "../../scripts/lib/doc-example-compile.mjs";
import {
  DOC_EXAMPLE_FILES,
  entryValueExports,
  exampleLocation,
  extractTsxExamples,
  isModuleExample,
  missingNames,
  snippetModule,
  snippetPreambleLines,
  snippetScope,
} from "../../scripts/lib/doc-examples.mjs";

const DOCUMENT = [
  "# Guide",
  "",
  "```sh",
  "npm install",
  "```",
  "",
  "## Basic use",
  "",
  "```tsx",
  'import { Button } from "signalk-nearlcrews-ui";',
  "",
  "export function Save() {",
  "  return <Button>Save</Button>;",
  "}",
  "```",
  "",
  "## Steps",
  "",
  "1. Wrap the dialog:",
  "",
  "   ```tsx",
  "   <Dialog title={title} />",
  "   ```",
  "",
  "~~~tsx",
  "<Banner>```not a fence```</Banner>",
  "```",
  "~~~",
  "",
  "````tsx",
  "<Button>",
  "```",
  "</Button>",
  "````",
].join("\n");

describe("documentation example extraction", () => {
  it("reads every tsx fence with its line, heading, and code without its fence indentation", () => {
    const examples = extractTsxExamples(DOCUMENT, "README.md");

    expect(examples).toEqual([
      {
        file: "README.md",
        heading: "Basic use",
        line: 9,
        source: [
          'import { Button } from "signalk-nearlcrews-ui";',
          "",
          "export function Save() {",
          "  return <Button>Save</Button>;",
          "}",
        ].join("\n"),
      },
      {
        file: "README.md",
        heading: "Steps",
        line: 21,
        source: "<Dialog title={title} />",
      },
      // A fence closes only on its own character, and only on a run at least
      // as long as the one that opened it.
      {
        file: "README.md",
        heading: "Steps",
        line: 25,
        source: "<Banner>```not a fence```</Banner>\n```",
      },
      {
        file: "README.md",
        heading: "Steps",
        line: 30,
        source: "<Button>\n```\n</Button>",
      },
    ]);
    expect(exampleLocation(examples[1])).toBe("README.md:21");
  });

  it("refuses a fence that never closes", () => {
    expect(() =>
      extractTsxExamples("```tsx\n<Button />\n", "docs/migration.md"),
    ).toThrow("docs/migration.md:1 opens a fence that never closes.");
  });

  it("names the two consumer documents", () => {
    expect(DOC_EXAMPLE_FILES).toEqual(["README.md", "docs/migration.md"]);
    expect(Object.isFrozen(DOC_EXAMPLE_FILES)).toBe(true);
  });

  it("tells a module from a snippet by its top-level statements", () => {
    expect(isModuleExample('import { Button } from "x";\n<Button />')).toBe(
      true,
    );
    expect(isModuleExample("export function Panel() {}")).toBe(true);
    expect(isModuleExample("<Button onClick={save}>Save</Button>")).toBe(false);
    // A word inside JSX text is not a statement.
    expect(isModuleExample("<p>Choose what to export first.</p>")).toBe(false);
  });
});

describe("snippet completion", () => {
  it("reads only value exports from an entry's declarations", () => {
    const declarations = [
      'export { Button, type ButtonProps, Dialog as Modal, } from "./a.js";',
      'export type { OverlayPlacement } from "./b.js";',
      "export {",
      "  toast,",
      "  type ToastContent,",
      '} from "./c.js";',
    ].join("\n");

    expect(entryValueExports(declarations)).toEqual([
      "Button",
      "Modal",
      "toast",
    ]);
  });

  it("collects the names a compiler run could not find in one file", () => {
    const output = [
      "examples/example-02.tsx(4,7): error TS2304: Cannot find name 'saving'.",
      "examples/example-02.tsx(5,3): error TS2552: Cannot find name 'Buton'. Did you mean 'Button'?",
      "examples/example-02.tsx(9,20): error TS2503: Cannot find namespace 'React'.",
      "examples/example-02.tsx(4,7): error TS2304: Cannot find name 'saving'.",
      "examples/example-03.tsx(1,1): error TS2304: Cannot find name 'other'.",
      "examples/example-02.tsx(2,2): error TS2322: Type 'number' is not assignable to type 'string'.",
    ].join("\n");

    expect(missingNames(output, "example-02.tsx")).toEqual([
      "Buton",
      "React",
      "saving",
    ]);
  });

  it("imports package names from the first entry that exports them and declares the rest", () => {
    const exportsBySpecifier = new Map([
      ["signalk-nearlcrews-ui", ["Button", "LabeledField"]],
      ["signalk-nearlcrews-ui/overlays", ["Dialog", "Button"]],
    ]);
    const scope = snippetScope(
      ["Button", "Dialog", "LabeledField", "React", "saving"],
      exportsBySpecifier,
    );

    expect(scope).toEqual({
      declarations: ["saving"],
      imports: new Map([
        ["signalk-nearlcrews-ui", ["Button", "LabeledField"]],
        ["signalk-nearlcrews-ui/overlays", ["Dialog"]],
        ["react", ["* as React"]],
      ]),
    });
  });

  it("completes a snippet into a module and counts the lines ahead of it", () => {
    const scope = {
      declarations: ["saving"],
      imports: new Map([
        ["signalk-nearlcrews-ui", ["Button"]],
        ["react", ["* as React"]],
      ]),
    };
    const snippet =
      "<Button loading={saving}>Save</Button>\n<Button>Discard</Button>";
    const module = snippetModule(snippet, scope);

    expect(module).toBe(
      [
        'import { Button } from "signalk-nearlcrews-ui";',
        'import * as React from "react";',
        "declare const saving: any;",
        "export function Example() {",
        "  return (",
        "    <>",
        snippet,
        "    </>",
        "  );",
        "}",
        "",
      ].join("\n"),
    );
    // A diagnostic on the snippet's first line maps back to the fence's first
    // code line only if this count is exact.
    const lines = module.split("\n");
    expect(lines[snippetPreambleLines(scope)]).toBe(
      "<Button loading={saving}>Save</Button>",
    );
  });
});

describe("compile diagnostics", () => {
  const moduleExample = {
    file: "README.md",
    heading: "Basic use",
    line: 211,
    source:
      'import { Button } from "signalk-nearlcrews-ui";\n\nexport const save = <Button>Save</Button>;',
  };
  const snippetExample = {
    file: "docs/migration.md",
    heading: "Dialogs",
    line: 345,
    source: "<AlertDialog open={resetOpen} />",
  };
  const scope = {
    declarations: ["resetOpen"],
    imports: new Map([["signalk-nearlcrews-ui/overlays", ["AlertDialog"]]]),
  };

  it("names each example's file in order and completes only the snippets", () => {
    const files = exampleFiles(
      [moduleExample, snippetExample],
      new Map([["example-02.tsx", scope]]),
    );

    expect(files.map(({ name, preamble }) => ({ name, preamble }))).toEqual([
      { name: "example-01.tsx", preamble: 0 },
      { name: "example-02.tsx", preamble: snippetPreambleLines(scope) },
    ]);
    expect(files[0]?.source).toBe(moduleExample.source);
    expect(files[1]?.source).toBe(snippetModule(snippetExample.source, scope));
    // A snippet the first pass found nothing free in still compiles as a
    // component, with no generated imports or declarations.
    expect(exampleFiles([snippetExample], new Map())[0]?.preamble).toBe(3);
  });

  it("reports each diagnostic at the documentation line it came from", () => {
    const files = exampleFiles(
      [moduleExample, snippetExample],
      new Map([["example-02.tsx", scope]]),
    );
    const output = [
      // Line 3 of a module is the third code line, two below the fence's
      // first code line.
      "doc-examples/example-01.tsx(3,14): error TS2322: Type 'x' is not assignable.",
      // Line 6 of the completed snippet is its own first line, after two
      // generated lines and the three that open the component.
      "doc-examples/example-02.tsx(6,18): error TS2322: Type 'y' is not assignable.",
      "doc-examples\\example-01.tsx(1,1): error TS1005: Windows separators map too.",
      "doc-examples/example-99.tsx(4,2): error TS2304: an unknown file is left alone.",
    ].join("\n");

    expect(atDocumentLines(output, files).split("\n")).toEqual([
      "README.md:214:14 (README.md:211): error TS2322: Type 'x' is not assignable.",
      "docs/migration.md:346:18 (docs/migration.md:345): error TS2322: Type 'y' is not assignable.",
      "README.md:212:1 (README.md:211): error TS1005: Windows separators map too.",
      "doc-examples/example-99.tsx(4,2): error TS2304: an unknown file is left alone.",
    ]);
  });
});
