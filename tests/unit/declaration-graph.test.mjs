import { describe, expect, it } from "vitest";

import {
  collectRelativeSpecifiers,
  declarationPathFor,
  entryDeclarationFiles,
  reachableDeclarations,
  renderSnapshot,
  snapshotDifferences,
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

  it("names a missing file once however many emitted files refer to it", () => {
    const sources = new Map([
      [
        "index.d.ts",
        'export * from "./a.js";\nexport * from "./b.js";\nexport * from "./gone.js";\n',
      ],
      ["a.d.ts", 'export * from "./gone.js";\nexport * from "./lost.js";\n'],
      ["b.d.ts", 'export * from "./gone.js";\nexport * from "./lost.js";\n'],
    ]);
    expect(() =>
      reachableDeclarations(["index.d.ts"], (file) => sources.get(file)),
    ).toThrow(
      "Declaration graph refers to files that were not emitted: gone.d.ts, lost.d.ts.",
    );
  });

  it("reports a referenced file that was not emitted", () => {
    const broken = new Map(files);
    broken.delete("utils/node.d.ts");
    expect(() =>
      reachableDeclarations(["index.d.ts"], (file) => broken.get(file)),
    ).toThrow("refers to files that were not emitted: utils/node.d.ts.");
  });

  it("renders sections in title order and names the ones that differ", () => {
    const before = renderSnapshot(
      new Map([
        ["utils/tone.d.ts", 'export type Tone = "info" | "danger";\n'],
        ["exports of index.d.ts", "Button: value from components/Button.d.ts"],
      ]),
    );
    expect(before).toBe(
      [
        "=== exports of index.d.ts ===",
        "Button: value from components/Button.d.ts",
        "",
        "=== utils/tone.d.ts ===",
        'export type Tone = "info" | "danger";',
        "",
      ].join("\n"),
    );
    const after = renderSnapshot(
      new Map([
        ["exports of index.d.ts", "Button: value from components/Button.d.ts"],
        ["utils/node.d.ts", "export type Node = object;"],
        ["utils/tone.d.ts", 'export type Tone = "info";'],
      ]),
    );
    expect(snapshotDifferences(before, after)).toEqual([
      { change: "added", file: "utils/node.d.ts" },
      { change: "changed", file: "utils/tone.d.ts" },
    ]);
    expect(snapshotDifferences(after, before)).toEqual([
      { change: "removed", file: "utils/node.d.ts" },
      { change: "changed", file: "utils/tone.d.ts" },
    ]);
    expect(snapshotDifferences(before, before)).toEqual([]);
  });

  it("names a section whose change sits below its first line", () => {
    // A parser that ends a section at the first line break reports no
    // difference at all, which reads as "nothing public changed".
    const render = (tone) =>
      renderSnapshot(
        new Map([
          [
            "overlays.d.ts",
            [
              'export type Placement = "top";',
              `export type Tone = "${tone}";`,
            ].join("\n"),
          ],
        ]),
      );

    expect(snapshotDifferences(render("info"), render("danger"))).toEqual([
      { change: "changed", file: "overlays.d.ts" },
    ]);
    expect(snapshotDifferences(render("info"), render("info"))).toEqual([]);
  });
});
