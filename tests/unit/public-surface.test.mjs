import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  printPublicStatement,
  readPublicSurface,
} from "../../scripts/lib/public-surface.mjs";

/** A small emitted declaration tree: two entries, shared files, and private ones. */
const FILES = {
  "index.d.ts": [
    'export { Button, type ButtonProps } from "./components/Button.js";',
    'export { formatAge } from "./utils/format.js";',
    'export type { Tone } from "./utils/tone.js";',
  ].join("\n"),
  "extra.d.ts": [
    'export { formatAge as formatLater } from "./utils/format.js";',
    'export type { Key } from "@scope/keys";',
    'export type { Plain } from "plain-types";',
    'export type { Missing } from "./utils/missing.js";',
    "export declare namespace Names {",
    "    type Name = string;",
    "}",
    "",
  ].join("\n"),
  "components/Button.d.ts": [
    'import type { Tone } from "../utils/tone.js";',
    'import type { Shape } from "../utils/shape.js";',
    "/**",
    " * Prose that is not compared.",
    " * @deprecated Use Link instead.",
    " */",
    "export interface ButtonProps {",
    "    /**",
    "     * Which tone the button takes.",
    '     * @default "info"',
    "     */",
    "    readonly tone?: Tone | undefined;",
    "    readonly shape?: Shape | undefined;",
    "}",
    "/** Prose again. */",
    "export declare function Button({ tone, shape }: ButtonProps, [first]: string[], label: string): string;",
    "/** Not exported from an entry, and not used by a public type. */",
    "export declare function buttonClassName(tone: Tone): string;",
    "",
  ].join("\n"),
  "utils/tone.d.ts":
    'export type Tone = "info" | "danger";\nexport declare const TONES: readonly Tone[];\n',
  "utils/shape.d.ts": [
    "interface Corner {",
    "    readonly radius: number;",
    "}",
    "export interface Shape {",
    "    readonly corner: Corner;",
    "}",
    "",
  ].join("\n"),
  "utils/format.d.ts":
    "export declare function formatAge(ms: number): string;\n",
  "augment.d.ts": [
    "declare global {",
    "    /** Kept whole, prose included. */",
    "    interface Window {",
    "        readonly snui?: string;",
    "    }",
    "}",
    "export {};",
    "",
  ].join("\n"),
};

let distDirectory;

beforeAll(() => {
  distDirectory = mkdtempSync(join(tmpdir(), "snui-surface-"));
  // Two dependencies a re-export can come from, scoped and not.
  for (const [name, text] of [
    ["@scope/keys", "export type Key = string | number;\n"],
    [
      "plain-types",
      "export interface Plain {\n    readonly value: string;\n}\n",
    ],
  ]) {
    const directory = join(distDirectory, "node_modules", ...name.split("/"));
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ name, types: "index.d.ts", version: "1.0.0" }),
    );
    writeFileSync(join(directory, "index.d.ts"), text);
  }
  for (const [file, text] of Object.entries(FILES)) {
    const path = join(distDirectory, ...file.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
});

afterAll(() => {
  rmSync(distDirectory, { force: true, recursive: true });
});

function read(
  reachable = Object.keys(FILES).filter((file) => file !== "extra.d.ts"),
) {
  return readPublicSurface(
    distDirectory,
    ["extra.d.ts", "index.d.ts"],
    [...reachable, "extra.d.ts"],
  );
}

/** One program over the whole tree, which every read-only case shares. */
let surface;
const readAll = () => {
  surface ??= read();
  return surface;
};

describe("public surface", () => {
  it("lists each entry's exports with their meaning and home", () => {
    const { sections } = readAll();
    expect(sections.get("exports of index.d.ts")).toBe(
      [
        "Button: value from components/Button.d.ts",
        "ButtonProps: type from components/Button.d.ts",
        "Tone: type from utils/tone.d.ts",
        "formatAge: value from utils/format.d.ts",
      ].join("\n"),
    );
    expect(sections.get("exports of extra.d.ts")).toBe(
      [
        "Key: type from @scope/keys",
        "Missing: unresolved",
        "Names: namespace from extra.d.ts",
        "Plain: type from plain-types",
        "formatLater: value from utils/format.d.ts",
      ].join("\n"),
    );
  });

  it("prints the reached declarations without prose, keeping behavioral tags", () => {
    const { sections } = readAll();
    expect(sections.get("components/Button.d.ts")).toBe(
      [
        "/** @deprecated */",
        "export interface ButtonProps {",
        '    /** @default "info" */',
        "    readonly tone?: Tone | undefined;",
        "    readonly shape?: Shape | undefined;",
        "}",
        "export declare function Button(props: ButtonProps, arg1: string[], label: string): string;",
      ].join("\n"),
    );
  });

  it("follows the types a public declaration uses, unexported ones included", () => {
    const { sections } = readAll();
    expect(sections.get("utils/shape.d.ts")).toBe(
      [
        "interface Corner {",
        "    readonly radius: number;",
        "}",
        "export interface Shape {",
        "    readonly corner: Corner;",
        "}",
      ].join("\n"),
    );
    expect(sections.get("utils/tone.d.ts")).toBe(
      'export type Tone = "info" | "danger";',
    );
  });

  it("compares a file that augments a global whole", () => {
    const { augmentations, sections } = readAll();
    expect(augmentations).toEqual(["augment.d.ts"]);
    expect(sections.get("augment.d.ts")).toBe(FILES["augment.d.ts"].trimEnd());
  });

  it("names every export no entry exports and no public type uses", () => {
    expect(readAll().unaccountedExports).toEqual([
      "components/Button.d.ts: buttonClassName",
      "utils/tone.d.ts: TONES",
    ]);
  });

  it("fails on a file the program cannot read", () => {
    expect(() => read(["missing.d.ts"])).toThrow(
      "The declaration program could not read missing.d.ts.",
    );
  });
});

describe("declarations that refer to what was never emitted", () => {
  it("names a public type an @internal strip left dangling", () => {
    const directory = mkdtempSync(join(tmpdir(), "snui-dangling-"));
    try {
      const files = {
        "index.d.ts": 'export { Button } from "./components/Button.js";\n',
        "components/Button.d.ts": [
          'import type { Tone } from "../utils/tone.js";',
          "export declare function Button(props: {",
          "    readonly tone?: Tone;",
          "}): string;",
          "",
        ].join("\n"),
        // Tone was tagged @internal, so the build stripped its export.
        "utils/tone.d.ts": "export declare const TONES: readonly string[];\n",
      };
      for (const [file, text] of Object.entries(files)) {
        const path = join(directory, ...file.split("/"));
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      }

      const { declarationErrors } = readPublicSurface(
        directory,
        ["index.d.ts"],
        ["components/Button.d.ts", "index.d.ts", "utils/tone.d.ts"],
      );

      expect(declarationErrors).toEqual([
        "components/Button.d.ts:1 refers to Tone, which the emitted declarations do not declare (an @internal tag on a public type?)",
      ]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("reports any other declaration error by its location", () => {
    // The shared tree re-exports from a file that was never emitted.
    expect(readAll().declarationErrors).toEqual([
      "extra.d.ts:4: Cannot find module './utils/missing.js' or its corresponding type declarations.",
    ]);
  });
});

describe("printPublicStatement", () => {
  it("prints a statement the same way whatever its comments say", async () => {
    const ts = (await import("typescript")).default;
    const print = (text) =>
      printPublicStatement(
        ts.createSourceFile("x.d.ts", text, ts.ScriptTarget.Latest, true)
          .statements[0],
      );
    expect(
      print(
        "/** One. */\nexport declare function f({ a }: { a: string }): void;",
      ),
    ).toBe(
      print(
        "/** Two. */\nexport declare function f({ a, b }: { a: string }): void;",
      ),
    );
    expect(
      print("/** @deprecated Because. */\nexport declare const x: 1;"),
    ).toBe("/** @deprecated */\nexport declare const x: 1;");
  });
});
