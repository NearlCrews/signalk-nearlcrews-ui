import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  assertDoubledOverrides,
  blankScriptComments,
  cssModuleImportsOf,
  findClassesOnPackageComponents,
  findSingleClassOverrides,
  owningTagAt,
  packageImportsOf,
  singleClassSelectorsOf,
} from "../../bin/lib/style-overrides.mjs";
import { repositoryPath } from "../../scripts/lib/paths.mjs";
import { removeTemporaryTrees, temporaryTree } from "./lib/temporary-tree.mjs";

const STYLE_OVERRIDES = pathToFileURL(
  repositoryPath("bin", "lib", "style-overrides.mjs"),
).href;

/**
 * Runs findClassesOnPackageComponents on `source` in a child process with a
 * hard time limit, so a parse that backtracks without end fails the test
 * instead of stopping the whole run. Returns the placements as
 * `Component:key@line` and the milliseconds the call took.
 */
function placeInChild(source) {
  const script = `
    const { findClassesOnPackageComponents } = await import(${JSON.stringify(STYLE_OVERRIDES)});
    const started = performance.now();
    const placements = findClassesOnPackageComponents("/panel/Panel.tsx", process.env.SNUI_SOURCE);
    const elapsed = performance.now() - started;
    process.stdout.write(JSON.stringify({
      elapsed,
      placements: placements.map(({ component, key, line }) => component + ":" + key + "@" + line),
    }));
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    {
      encoding: "utf8",
      env: { ...process.env, SNUI_SOURCE: source },
      timeout: 10_000,
    },
  );
  if (result.error?.code === "ETIMEDOUT" || result.signal !== null) {
    throw new Error("The parse did not finish within 10 s.");
  }
  if (result.error !== undefined) {
    throw new Error(`The parse child did not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `The parse child exited with status ${String(result.status)}: ${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

/** The placements a component source yields, each as `Component:key@line`. */
function placementsOf(source, file = "/panel/Panel.tsx") {
  return findClassesOnPackageComponents(file, source).map(
    ({ component, key, line }) => `${component}:${key}@${String(line)}`,
  );
}

/**
 * A panel source: the package import of `names`, the default import of the
 * panel's CSS module, then `body`, which starts on line 3.
 */
function panelSource(names, body) {
  return `import { ${names} } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
${body}`;
}

/** Writes a panel source tree and returns its root. */
function panelTree(files) {
  return temporaryTree("snui-styles-", files);
}

afterAll(removeTemporaryTrees);

describe("blanking comments", () => {
  it("blanks line and block comments and keeps every line break", () => {
    const source = "a; // note\n/* one\ntwo */ b;\n/** open";
    const blanked = blankScriptComments(source);

    expect(blanked).toBe("a;        \n      \n       b;\n        ");
    expect(blanked.length).toBe(source.length);
  });

  it("leaves strings, templates, and regular expressions alone", () => {
    const source = [
      'const url = "http://x/*y*/";',
      "const quote = 'it\\'s // fine';",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "const tick = `a ${b /* gone */} // kept ${`n${c}`} `; // gone",
      "const re = /[\"'/]*\\/\\//g; // gone",
      "const ratio = total / count; // gone",
      "return /x/.test(y) // gone",
      "const isNote = (line) => /^\\s*\\/\\//.test(line); // gone",
      "const isFence = (line) => /^```/.test(line); // gone",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "{ nested: `${{ a: 1 }.a}` } // gone",
    ].join("\n");

    expect(blankScriptComments(source).split("\n")).toEqual([
      'const url = "http://x/*y*/";',
      "const quote = 'it\\'s // fine';",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "const tick = `a ${b           } // kept ${`n${c}`} `;        ",
      "const re = /[\"'/]*\\/\\//g;        ",
      "const ratio = total / count;        ",
      "return /x/.test(y)        ",
      "const isNote = (line) => /^\\s*\\/\\//.test(line);        ",
      "const isFence = (line) => /^```/.test(line);        ",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "{ nested: `${{ a: 1 }.a}` }        ",
    ]);
  });

  it("leaves a URL and a path pattern in JSX text as text", () => {
    // A "//" after a colon is a URL, a "//" glued to a word with no
    // whitespace after it is text, and a "/*" glued to a word is a path
    // pattern unless a comment close ends it on its own line before another
    // "/*" starts: JSX text often holds all three. A comment is rarely written
    // glued to a word, and one that is still counts: a glued line comment
    // followed by whitespace, and a glued block comment that closes on its own
    // line.
    const source = [
      "<Section description={<p>See https://signalk.org</p>}>",
      "<Text>Paths such as vessels/* apply</Text>",
      "<Text>Paths such as vessels/*/nav and aton/*/x apply</Text>",
      "a; // note",
      "<Checkbox /* it's */ />",
      "function asPromise(fn, ctx/*, varargs */) {",
      "disabled// it's locked",
    ].join("\n");

    expect(blankScriptComments(source).split("\n")).toEqual([
      "<Section description={<p>See https://signalk.org</p>}>",
      "<Text>Paths such as vessels/* apply</Text>",
      "<Text>Paths such as vessels/*/nav and aton/*/x apply</Text>",
      "a;        ",
      "<Checkbox            />",
      "function asPromise(fn, ctx              ) {",
      "disabled              ",
    ]);
  });

  // One case or more per rule in the blankScriptComments doc comment, in the
  // doc's order, so a rule and its spec change together.
  it.each([
    [
      "a // after a colon is text",
      "See https://signalk.org",
      "See https://signalk.org",
    ],
    [
      "a // after a word opens a comment when whitespace follows",
      "disabled// it's locked",
      "disabled              ",
    ],
    [
      "a // after a word with no whitespace after is text",
      "<Text>TCP//UDP</Text>",
      "<Text>TCP//UDP</Text>",
    ],
    ["any other // opens a line comment", "a; // note", "a;        "],
    [
      "a glued /* followed by a slash is text",
      "<Text>vessels/*/nav and aton/*/x</Text>",
      "<Text>vessels/*/nav and aton/*/x</Text>",
    ],
    [
      "a glob with two wildcard directories is text",
      "<Text>src/*/*/index.ts</Text>",
      "<Text>src/*/*/index.ts</Text>",
    ],
    [
      "a glued /* closed on its line opens a comment",
      "function asPromise(fn, ctx/*, varargs */) {",
      "function asPromise(fn, ctx              ) {",
    ],
    [
      "a /* glued to a path closed on its line opens a comment",
      "<Text>vessels/*.nav.*/x</Text>",
      "<Text>vessels         x</Text>",
    ],
    [
      "a /* glued to a glob closed on its line opens a comment",
      "<Text>src/**/*.ts</Text>",
      "<Text>src    *.ts</Text>",
    ],
    [
      "a glued /* with no close on its line is text",
      "<Text>vessels/* apply</Text>",
      "<Text>vessels/* apply</Text>",
    ],
    [
      "a /* glued to a * with no close on its line is text",
      "<Text>Matches **/*.ts</Text>",
      "<Text>Matches **/*.ts</Text>",
    ],
    [
      "a /* glued to a . with no close on its line is text",
      "<Text>Import ./*.css</Text>",
      "<Text>Import ./*.css</Text>",
    ],
    [
      "a glued /* whose close comes after another /* is text",
      "<Text>vessels/* and aton/*/nav</Text>",
      "<Text>vessels/* and aton/*/nav</Text>",
    ],
    [
      "a glued /* followed by a later spaced comment leaves the path as text",
      "<Section description={<>vessels/* apply</>} /* it's the intro */>",
      "<Section description={<>vessels/* apply</>}                     >",
    ],
    [
      "any other /* opens a block comment to its close or the end of the file",
      "a /* one\ntwo */ b\n/** open",
      "a       \n       b\n        ",
    ],
    ["a quoted string is skipped", "x = 'a // b'; // c", "x = 'a // b';     "],
    [
      "a double-quoted string is skipped",
      'x = "a /* b */";',
      'x = "a /* b */";',
    ],
    [
      "a quote ends at its line",
      "<p>Don't // stay</p>\n// gone",
      "<p>Don't // stay</p>\n       ",
    ],
    [
      "a template is skipped, its substitutions are code",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "`a ${b /* c */} // d`",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the source under test holds template syntax as text
      "`a ${b        } // d`",
    ],
    [
      "a regular expression is skipped at the start of the text",
      "/a\\/\\//.test(s) // gone",
      "/a\\/\\//.test(s)        ",
    ],
    [
      "a regular expression is skipped after a semicolon",
      "x();\n/a\\/\\//.test(s) // gone",
      "x();\n/a\\/\\//.test(s)        ",
    ],
    [
      "a regular expression is skipped after a keyword",
      "return /x\\/\\//.test(y) // gone",
      "return /x\\/\\//.test(y)        ",
    ],
    [
      "a regular expression after an arrow is skipped",
      "f = (s) => /a\\/\\//.test(s); // gone",
      "f = (s) => /a\\/\\//.test(s);        ",
    ],
    [
      "a regular expression ends at its line",
      "x = (/abc\n// gone",
      "x = (/abc\n       ",
    ],
    ["a slash that divides is kept", "a = b / c // gone", "a = b / c        "],
  ])("%s", (_rule, source, blanked) => {
    expect(blankScriptComments(source)).toBe(blanked);
  });

  it("ends an unclosed quote at its line, as JSX text can leave one", () => {
    expect(
      blankScriptComments("<p>Don't save</p>\n// note\n<Badge />").split("\n"),
    ).toEqual(["<p>Don't save</p>", "       ", "<Badge />"]);
  });
});

describe("reading a component file", () => {
  it("finds named and namespace package imports, skipping types", () => {
    const { named, namespaces } = packageImportsOf(`
      import type { Density } from "signalk-nearlcrews-ui";
      import {
        Badge,
        Checkbox as Tick,
        type ThemeChoice,
      } from 'signalk-nearlcrews-ui';
      import * as Forms from "signalk-nearlcrews-ui/forms";
      import { useState } from "react";
      import { Other } from "signalk-nearlcrews-ui-extra";
    `);

    expect([...named]).toEqual([
      ["Badge", "Badge"],
      ["Tick", "Checkbox"],
    ]);
    expect([...namespaces]).toEqual(["Forms"]);
  });

  it("finds default, namespace, and named CSS module imports", () => {
    const imports = cssModuleImportsOf(
      `import styles from "./Panel.module.css";
      import * as rows from '../rows.module.css';
      import cells, { cell, wide as spread } from "./cells.module.css";
      import aliased from "@/styles/alias.module.css";
      import "./global.css";`,
      "/panel/src/Panel.tsx",
    );

    expect(imports).toEqual([
      {
        binding: "styles",
        path: "/panel/src/Panel.module.css",
        specifier: "./Panel.module.css",
      },
      {
        binding: "rows",
        path: "/panel/rows.module.css",
        specifier: "../rows.module.css",
      },
      {
        binding: "cells",
        path: "/panel/src/cells.module.css",
        specifier: "./cells.module.css",
      },
      {
        binding: "cell",
        key: "cell",
        path: "/panel/src/cells.module.css",
        specifier: "./cells.module.css",
      },
      {
        binding: "spread",
        key: "wide",
        path: "/panel/src/cells.module.css",
        specifier: "./cells.module.css",
      },
      { binding: "aliased", specifier: "@/styles/alias.module.css" },
    ]);
  });

  it("reads a default import that follows a comment mentioning import", () => {
    for (const comment of [
      "// Keep the module import last so its rules load after the package\n",
      "/* style import */ ",
    ]) {
      expect(
        findClassesOnPackageComponents(
          "/panel/Panel.tsx",
          `import { Checkbox } from "signalk-nearlcrews-ui";
${comment}import styles from "./Panel.module.css";
<Checkbox className={styles.row} />;`,
        ).map(({ key }) => key),
        comment,
      ).toEqual(["row"]);
    }
    // The package import is read the same way, so a comment above it cannot
    // make it look type-only either.
    expect([
      ...packageImportsOf(`// We import type definitions below
import { Badge } from "signalk-nearlcrews-ui";`).named.keys(),
    ]).toEqual(["Badge"]);
  });

  it("reads an import whose braces hold comments, the word import included", () => {
    // A line comment with "import" inside a package import's braces, and one
    // without it, which must not bind the next name to "//".
    expect(
      placementsOf(`import {
  Checkbox, // import this one for rows
  Badge, // rows
  Text,
} from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
<Checkbox className={styles.row} />;
<Badge className={styles.tag} />;
<Text className={styles.note} />;`),
    ).toEqual(["Checkbox:row@7", "Badge:tag@8", "Text:note@9"]);
    // A block comment with "import" inside the braces.
    expect(
      placementsOf(`import { /* import note */ Button } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
<Button className={styles.action} />;`),
    ).toEqual(["Button:action@3"]);
    // The same inside a CSS module's named import.
    expect(
      placementsOf(`import { Checkbox } from "signalk-nearlcrews-ui";
import {
  row, // import for the checkbox row
  /* import */ tag,
} from "./Panel.module.css";
<Checkbox className={row} />;
<Checkbox className={tag} />;`),
    ).toEqual(["Checkbox:row@6", "Checkbox:tag@7"]);
  });

  it("parses a long comment header in linear time", () => {
    // A prose comment that mentions import, then many line comments and JSDoc
    // blocks with no quote or semicolon: the shape that made a comment-aware
    // clause backtrack without end.
    const header = [
      "// Styles: import order matters for the panel",
      ...Array.from(
        { length: 24 },
        (_, index) => `// keep the tokens first, line ${String(index)}`,
      ),
      ...Array.from(
        { length: 6 },
        (_, index) =>
          `/**\n * Block ${String(index)} explains the row layout\n * with no punctuation that ends a clause\n */\ninterface Row${String(index)} { id: string }`,
      ),
    ].join("\n");
    const source = `${header}
import { Checkbox } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
<Checkbox className={styles.row} />;`;

    const { elapsed, placements } = placeInChild(source);

    expect(placements).toEqual([
      `Checkbox:row@${String(source.split("\n").length)}`,
    ]);
    expect(elapsed, "milliseconds for one file").toBeLessThan(1000);
  });

  it("parses long comment runs inside braces, after prose, and after a bare import in linear time", () => {
    const inBraces = `import {
${Array.from({ length: 2400 }, (_, index) => `  // Button${String(index)},`).join("\n")}
  Text,
} from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
<Text className={styles.row} />;`;
    const afterProse = `import { Text } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
<p>We import data here</p>
/**
${Array.from({ length: 2400 }, (_, index) => ` * line ${String(index)}`).join("\n")}
 */
<Text className={styles.row} />;`;

    const afterBareWord = `import { Text } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
const handler = options.import
/**
${Array.from({ length: 2400 }, (_, index) => ` * line ${String(index)}`).join("\n")}
 */
<Text className={styles.row} />;`;

    for (const source of [inBraces, afterProse, afterBareWord]) {
      const { elapsed, placements } = placeInChild(source);
      expect(placements).toEqual([
        `Text:row@${String(source.split("\n").length)}`,
      ]);
      expect(elapsed, "milliseconds for one file").toBeLessThan(1000);
    }
  });

  it("finds no import in prose that runs into a re-export", () => {
    // The shape of a module that explains its re-exports in a comment: a match
    // starting at the word import in the prose must not reach the export.
    const source = `// The vocabulary is defined in core and re-exported here, so a panel can
// import everything it needs from one module. Core modules import from
// core/triggerContext.js directly
export type { Badge } from "signalk-nearlcrews-ui";
export { row } from "./Panel.module.css";
`;

    const { named, namespaces } = packageImportsOf(source);
    expect([...named]).toEqual([]);
    expect([...namespaces]).toEqual([]);
    expect(cssModuleImportsOf(source, "/panel/Panel.tsx")).toEqual([]);
  });

  it("reads placements from the source as written, whatever JSX text holds", () => {
    // A path pattern in JSX text holds a "/*" after a letter, and a URL holds
    // a "//" after a colon. Neither is a comment there, so the blanker leaves
    // both as text, and neither may hide the markup after it.
    expect(
      placementsOf(
        `import { Checkbox, Text } from "signalk-nearlcrews-ui";
import styles from "./Paths.module.css";
export const Paths = () => (
  <>
    <Text>Paths such as vessels/* also apply to aircraft/* and aton/*.</Text>
    <Checkbox className={styles.row} />
    <p>See https://signalk.org <Checkbox className={styles.link} /></p>
  </>
);`,
        "/panel/Paths.tsx",
      ),
    ).toEqual(["Checkbox:row@6", "Checkbox:link@7"]);
  });

  it("reports a class in commented-out markup, which the consumer clears by deleting it", () => {
    expect(
      placementsOf(
        panelSource(
          "Checkbox",
          `export const P = () => (
  <>
    {/* <Checkbox className={styles.old} /> */}
    <Checkbox className={styles.row} />
  </>
);`,
        ),
      ),
    ).toEqual(["Checkbox:old@5", "Checkbox:row@6"]);
  });

  it("places a class beside a regular expression in an attribute", () => {
    expect(
      placementsOf(
        panelSource(
          "TextInput",
          "<TextInput validate={(u) => /^https?:\\/\\//.test(u)} className={styles.url} />;",
        ),
      ),
    ).toEqual(["TextInput:url@3"]);
  });

  it("places a class after a comment inside the opening tag", () => {
    const placed = (tag) =>
      placementsOf(panelSource("Checkbox, TextInput", tag));

    // A line comment holding an apostrophe and a backtick, as a consumer
    // writes one to explain an attribute.
    expect(
      placed(`<TextInput
  // A credential the operator enters on the vessel's behalf. \`username\`
  // would opt it into autofill.
  autoComplete="off"
  className={styles.user}
/>;`),
    ).toEqual(["TextInput:user@7"]);
    expect(
      placed(`<Checkbox
  // shown only when count > 0
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@5"]);
    expect(
      placed("<Checkbox /* it's the row toggle */ className={styles.row} />;"),
    ).toEqual(["Checkbox:row@3"]);
    // The same comments glued to the word before them.
    expect(
      placed("<Checkbox/* it's the row toggle */ className={styles.row} />;"),
    ).toEqual(["Checkbox:row@3"]);
    expect(
      placed(`<Checkbox
  disabled/* it's locked */
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@5"]);
    expect(
      placed(`<Checkbox
  disabled// it's locked
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@5"]);
    // A comment that names another tag cannot become the owner.
    expect(
      placed(`<Checkbox
  // pairs with the <Badge> beside it
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@5"]);
    // A comment inside an attribute expression, before the class.
    expect(
      placed(`<Checkbox
  onChange={() => {
    // don't save while the row is locked
  }}
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@7"]);
  });

  it("keeps placements after JSX text in an attribute that looks like a comment", () => {
    const placed = (markup) =>
      placementsOf(panelSource("Checkbox, Section, Text", markup));

    // A path pattern in a local tag's attribute, then a package component.
    expect(
      placed(`<Tooltip content={<>Paths such as vessels/* apply</>}>
  <Checkbox className={styles.row} />
</Tooltip>;`),
    ).toEqual(["Checkbox:row@4"]);
    // The same in a package component's attribute: its children are not its
    // attributes, so neither the plain div nor the Checkbox is credited to it.
    expect(
      placed(`<Section description={<>Paths such as vessels/* apply</>}>
  <div className={styles.plain} />
  <Checkbox className={styles.row} />
</Section>;`),
    ).toEqual(["Checkbox:row@5"]);
    // A URL in JSX text inside a render prop.
    expect(
      placed(
        "<Row render={() => <p>See https://signalk.org <Checkbox className={styles.link} /></p>} />;",
      ),
    ).toEqual(["Checkbox:link@3"]);
    // Commented-out markup inside a render prop is still reported.
    expect(
      placed(`<Local
  render={() => (
    <>
      {/* <Checkbox className={styles.old} /> */}
      <Text>Kept</Text>
    </>
  )}
/>;`),
    ).toEqual(["Checkbox:old@6"]);
  });

  it("keeps the right tag on the lines after a URL in JSX text", () => {
    const placed = (markup) =>
      placementsOf(panelSource("Checkbox, Section, Text", markup));

    // A render prop whose Checkbox wraps its attributes onto the next line.
    expect(
      placed(`<Row
  render={() => (
    <p>
      See https://signalk.org <Checkbox
        className={styles.link}
      />
    </p>
  )}
/>;`),
    ).toEqual(["Checkbox:link@7"]);
    // A local Hint inside a label, then the Checkbox's own class.
    expect(
      placed(`<Checkbox
  label={<Hint text={<>Docs at https://signalk.org</>} />}
  className={styles.row}
/>;`),
    ).toEqual(["Checkbox:row@5"]);
    // Glued text that is not a comment in a Section's description, and a
    // path pattern followed by a real comment in the tag, credit nothing
    // later to the Section.
    for (const description of [
      "<Section description={<>TCP//UDP both</>}>",
      "<Section description={<>Paths such as vessels/* apply</>} /* it's the intro */>",
    ]) {
      expect(
        placed(`${description}
  {styles.caption}
  <Checkbox className={styles.row} />
</Section>;`),
        description,
      ).toEqual(["Checkbox:row@5"]);
    }
    // A glob in a Section's description, before a real comment among the
    // children, credits nothing later to the Section.
    for (const text of ["Matches **/*.ts files", "Import ./*.css"]) {
      expect(
        placed(`<Section description={<>${text}</>}>
  {/* rows */}
  {styles.caption}
  <Checkbox className={styles.row} />
</Section>;`),
        text,
      ).toEqual(["Checkbox:row@6"]);
    }
    // A URL in a Section's description credits nothing later to the Section.
    expect(
      placed(`<Section description={<p>See https://signalk.org</p>}>
  {styles.caption}
  <Checkbox className={styles.row} />
</Section>;
const rowClass = styles.plain;`),
    ).toEqual(["Checkbox:row@5"]);
    // A path pattern earlier in the file leaves a comment inside a later tag
    // unable to end it.
    for (const comment of [
      "// it's the row toggle",
      "// shown only when count > 0",
    ]) {
      expect(
        placed(`<Text>Paths such as vessels/* apply</Text>;
<Checkbox
  ${comment}
  className={styles.row}
/>;`),
        comment,
      ).toEqual(["Checkbox:row@6"]);
    }
  });

  it("places a class after attribute values that hold quotes, braces, or >", () => {
    const placed = (tag) =>
      placementsOf(panelSource("Checkbox, SegmentedControl", tag));

    expect(
      placed(
        `<Checkbox label="depth > 3 m, it's {deep}" className={styles.a} />;`,
      ),
    ).toEqual(["Checkbox:a@3"]);
    expect(
      placed(`<Checkbox label='say "stop" > go' className={styles.b} />;`),
    ).toEqual(["Checkbox:b@3"]);
    // A JSX attribute string has no escapes, so a trailing backslash is text.
    expect(
      placed(String.raw`<Checkbox title="C:\" className={styles.c} />;`),
    ).toEqual(["Checkbox:c@3"]);
    expect(
      placed("<Checkbox disabled={count > 0} className={styles.d} />;"),
    ).toEqual(["Checkbox:d@3"]);
    expect(
      placed(
        "<Checkbox label={<>Don't <b>stop</b></>} className={styles.e} />;",
      ),
    ).toEqual(["Checkbox:e@3"]);
    // Explicit type arguments on a generic component.
    expect(
      placed(
        '<SegmentedControl<Density> label="Density" className={styles.f} />;',
      ),
    ).toEqual(["SegmentedControl:f@3"]);
  });

  it("places named classes in both branches of a conditional, but not an object key", () => {
    expect(
      placementsOf(`import { Checkbox } from "signalk-nearlcrews-ui";
import { active, idle, flag } from "./Panel.module.css";
<Checkbox className={on ? active : idle} />;
<Checkbox className={cx({ flag: on })} />;`),
    ).toEqual(["Checkbox:active@3", "Checkbox:idle@3"]);
  });

  it("places a class a named import brings in", () => {
    expect(
      findClassesOnPackageComponents(
        "/panel/Panel.tsx",
        `import { Checkbox } from "signalk-nearlcrews-ui";
import { row, wide as spread } from "./Panel.module.css";
<div className={row} />;
<Checkbox className={spread} />;`,
      ),
    ).toEqual([
      {
        component: "Checkbox",
        cssPath: "/panel/Panel.module.css",
        file: "/panel/Panel.tsx",
        key: "wide",
        line: 4,
        specifier: "./Panel.module.css",
      },
    ]);
  });

  it("attributes a position to the opening tag whose attributes hold it", () => {
    const source = `const n = useState<number>(0);
<div className={styles.row} key={id}>
  <Checkbox
    onChange={(event) => a > b && set(event)}
    className={cx(styles.checkbox, \`\${styles.wide}\`)}
  />
  <Text>{styles.caption}</Text>
</div>`;
    const at = (text) => owningTagAt(source, source.indexOf(text));

    expect(at("styles.row")).toBe("div");
    expect(at("styles.checkbox")).toBe("Checkbox");
    expect(at("styles.wide")).toBe("Checkbox");
    expect(at("styles.caption"), "a child is not an attribute").toBeUndefined();
    expect(owningTagAt("styles.row", 0)).toBeUndefined();
  });

  it("places classes on package components only", () => {
    const placements = findClassesOnPackageComponents(
      "/panel/Panel.tsx",
      `import { Badge } from "signalk-nearlcrews-ui";
import * as UI from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
export const Panel = () => (
  <div className={styles.row}>
    <Badge className={styles["badge-tone"]} />
    <UI.Text className={styles.caption} />
    <Local.Text className={styles.local} />
  </div>
);`,
    );

    expect(placements).toEqual([
      {
        component: "Badge",
        cssPath: "/panel/Panel.module.css",
        file: "/panel/Panel.tsx",
        key: "badge-tone",
        line: 6,
        specifier: "./Panel.module.css",
      },
      {
        component: "Text",
        cssPath: "/panel/Panel.module.css",
        file: "/panel/Panel.tsx",
        key: "caption",
        line: 7,
        specifier: "./Panel.module.css",
      },
    ]);
    expect(
      findClassesOnPackageComponents(
        "/panel/Plain.tsx",
        'import styles from "./Plain.module.css";\n<Badge className={styles.x} />',
      ),
      "a file that imports nothing from the package",
    ).toEqual([]);
  });

  it("reads the single class selectors of a module, skipping nested rules", () => {
    expect([
      ...singleClassSelectorsOf(
        ".row{} .row.row{} .badge::after{} .list .item{} .wrap{ .inner{} } @container snui-panel (width<=32rem){ .cell{} }",
      ),
    ]).toEqual(["row", "badge", "wrap", "cell"]);
  });
});

describe("checking a panel source tree", () => {
  const PANEL = `import { Badge, Checkbox, Text } from "signalk-nearlcrews-ui";
import styles from "./MergeProviderList.module.css";
export function Row() {
  return (
    <div className={styles.row}>
      <Checkbox
        className={styles.checkbox}
        label={<Badge className={styles.badge}>primary</Badge>}
      />
      <Text className={styles.providerNote}>Note</Text>
    </div>
  );
}
`;

  it("names every single class that lands on a package component", () => {
    const root = panelTree({
      "src/MergeProviderList.module.css":
        ".row{display:flex}.checkbox{flex:1 1 auto}.badge.badge{margin:0}.provider-note{margin-block-start:0}",
      "src/MergeProviderList.tsx": PANEL,
    });

    const { cssModules, findings } = findSingleClassOverrides(
      join(root, "src"),
      root,
    );

    expect(cssModules).toBe(1);
    expect(findings).toEqual([
      "src/MergeProviderList.module.css: .checkbox lands on the package Checkbox (src/MergeProviderList.tsx:7) through a single class selector, which loses to a scoped package rule setting the same property. Declare it as .checkbox.checkbox.",
      "src/MergeProviderList.module.css: .provider-note lands on the package Text (src/MergeProviderList.tsx:10) through a single class selector, which loses to a scoped package rule setting the same property. Declare it as .provider-note.provider-note.",
    ]);
    expect(() => assertDoubledOverrides(join(root, "src"), root)).toThrow(
      "A panel class overrides a package component without doubling:\nsrc/MergeProviderList.module.css: .checkbox",
    );
  });

  it("passes doubled overrides and reads a module outside the directory", () => {
    const root = panelTree({
      "shared/rows.module.css": ".note.note{margin:0}",
      "src/Panel.module.css": ".checkbox.checkbox{flex:1}",
      "src/Panel.tsx": `import { Checkbox, Text } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
import rows from "../shared/rows.module.css";
<Checkbox className={styles.checkbox} />;
<Text className={rows.note} />;
`,
    });

    expect(assertDoubledOverrides(join(root, "src"), root)).toBe(1);
  });

  it("finds a single class in a module outside the directory", () => {
    const root = panelTree({
      "shared/rows.module.css": ".note{margin:0}",
      "src/Panel.tsx": `import { Text } from "signalk-nearlcrews-ui";
import rows from "../shared/rows.module.css";
<Text className={rows.note} />;
`,
    });

    expect(findSingleClassOverrides(join(root, "src"), root)).toEqual({
      cssModules: 0,
      findings: [
        "shared/rows.module.css: .note lands on the package Text (src/Panel.tsx:3) through a single class selector, which loses to a scoped package rule setting the same property. Declare it as .note.note.",
      ],
    });
  });

  it("reports a CSS module it cannot read rather than skipping it", () => {
    const root = panelTree({
      "src/Panel.module.css": ".row{display:flex}",
      "src/Panel.tsx": `import { Checkbox } from "signalk-nearlcrews-ui";
import aliased from "@/styles/alias.module.css";
import missing from "./Missing.module.css";
import styles from "./Panel.module.css";
<Checkbox className={aliased.box} />;
<Checkbox className={missing.gone} />;
<div className={styles.row} />;
`,
    });

    expect(findSingleClassOverrides(join(root, "src"), root).findings).toEqual([
      "src/Panel.tsx:5: .box lands on the package Checkbox through @/styles/alias.module.css, which the check cannot read: only the bundler resolves an alias or package path. Import CSS modules by a path relative to the component, so the check can tell whether the class is doubled.",
      "src/Panel.tsx:6: .gone lands on the package Checkbox through ./Missing.module.css, which the check cannot read: no such file. Import CSS modules by a path relative to the component, so the check can tell whether the class is doubled.",
    ]);
  });

  it("fails a tree with no CSS module", () => {
    const root = panelTree({ "src/Panel.tsx": PANEL });

    expect(() => assertDoubledOverrides(join(root, "src"), root)).toThrow(
      "--styles found no *.module.css under src",
    );
  });
});
