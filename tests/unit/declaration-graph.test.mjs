import { describe, expect, it } from "vitest";

import {
  collectRelativeSpecifiers,
  declarationPathFor,
  describeSnapshotDifference,
  entryDeclarationFiles,
  reachableDeclarations,
  renderDeclarationSnapshot,
} from "../../scripts/lib/declaration-graph.mjs";

const files = new Map([
  [
    "index.d.ts",
    'export { Button } from "./components/Button.js";\nexport type { Tone } from "./utils/tone.js";\nimport "./side-effect.js";\n',
  ],
  [
    "components/Button.d.ts",
    'import type { Tone } from "../utils/tone.js";\nexport declare function Button(props: { tone: Tone; ref?: import("react").Ref<HTMLButtonElement> }): import("../utils/node.js").Node;\n',
  ],
  ["utils/tone.d.ts", 'export type Tone = "info" | "danger";\n'],
  ["utils/node.d.ts", "export type Node = object;\n"],
  ["side-effect.d.ts", "export {};\n"],
  ["utils/private.d.ts", "export declare const secret: string;\n"],
  ["styles/tokens.d.ts", "export declare const TOKENS: string;\n"],
]);
const readSource = (file) => files.get(file);

describe("declaration graph", () => {
  it("collects relative specifiers from every import form and skips packages", () => {
    expect(
      collectRelativeSpecifiers(files.get("components/Button.d.ts")),
    ).toEqual(["../utils/tone.js", "../utils/node.js"]);
    expect(collectRelativeSpecifiers(files.get("index.d.ts"))).toEqual([
      "./components/Button.js",
      "./utils/tone.js",
      "./side-effect.js",
    ]);
    expect(
      collectRelativeSpecifiers('/// <reference path="./globals.d.ts" />\n'),
    ).toEqual(["./globals.d.ts"]);
  });

  it("maps emitted JavaScript specifiers onto declaration files", () => {
    expect(declarationPathFor("index.d.ts", "./components/Button.js")).toBe(
      "components/Button.d.ts",
    );
    expect(
      declarationPathFor("components/Button.d.ts", "../utils/tone.js"),
    ).toBe("utils/tone.d.ts");
    expect(declarationPathFor("index.d.ts", "./federation.cjs")).toBe(
      "federation.d.cts",
    );
    expect(declarationPathFor("index.d.ts", "./entry.mjs")).toBe("entry.d.mts");
    expect(declarationPathFor("index.d.ts", "./globals.d.ts")).toBe(
      "globals.d.ts",
    );
    expect(declarationPathFor("index.d.ts", "./bare")).toBe("bare.d.ts");
  });

  it("reads entry declarations from the exports map types conditions", () => {
    expect(
      entryDeclarationFiles({
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./forms": { types: "./dist/forms.d.ts", import: "./dist/forms.js" },
        "./federation": {
          types: "./dist/federation.d.cts",
          require: "./dist/federation.cjs",
        },
        "./tokens.css": "./dist/tokens.css",
        "./package.json": "./package.json",
      }),
    ).toEqual(["federation.d.cts", "forms.d.ts", "index.d.ts"]);
    expect(() =>
      entryDeclarationFiles({ ".": { types: "./types/index.d.ts" } }),
    ).toThrow("is not under ./dist/");
  });

  it("walks only what the entries reach", () => {
    expect(reachableDeclarations(["index.d.ts"], readSource)).toEqual([
      "components/Button.d.ts",
      "index.d.ts",
      "side-effect.d.ts",
      "utils/node.d.ts",
      "utils/tone.d.ts",
    ]);
  });

  it("reports a referenced file that was not emitted", () => {
    const broken = new Map(files);
    broken.delete("utils/node.d.ts");
    expect(() =>
      reachableDeclarations(["index.d.ts"], (file) => broken.get(file)),
    ).toThrow("refers to files that were not emitted: utils/node.d.ts.");
  });

  it("renders a snapshot and names the files that differ", () => {
    const before = renderDeclarationSnapshot(
      ["index.d.ts", "utils/tone.d.ts"],
      readSource,
    );
    expect(before).toBe(
      `=== index.d.ts ===\n${files.get("index.d.ts").trimEnd()}\n\n=== utils/tone.d.ts ===\n${files.get("utils/tone.d.ts").trimEnd()}\n`,
    );
    const after = renderDeclarationSnapshot(
      ["index.d.ts", "utils/node.d.ts", "utils/tone.d.ts"],
      (file) =>
        file === "utils/tone.d.ts"
          ? 'export type Tone = "info";\n'
          : readSource(file),
    );
    expect(describeSnapshotDifference(before, after)).toEqual([
      "utils/node.d.ts (added)",
      "utils/tone.d.ts (changed)",
    ]);
    expect(describeSnapshotDifference(after, before)).toEqual([
      "utils/node.d.ts (removed)",
      "utils/tone.d.ts (changed)",
    ]);
    expect(describeSnapshotDifference(before, before)).toEqual([]);
  });

  it("names a file whose change sits below its first line", () => {
    // Declarations carry doc comments, so most real changes land well below
    // line one. A parser that ends a section at the first line break reports
    // no difference at all, which reads as "nothing public changed".
    const render = (tone) =>
      renderDeclarationSnapshot(["overlays.d.ts"], () =>
        [
          "/**",
          " * Overlay surfaces.",
          " */",
          `export type Tone = "${tone}";`,
          "",
        ].join("\n"),
      );

    expect(
      describeSnapshotDifference(render("info"), render("danger")),
    ).toEqual(["overlays.d.ts (changed)"]);
    expect(describeSnapshotDifference(render("info"), render("info"))).toEqual(
      [],
    );
  });
});
