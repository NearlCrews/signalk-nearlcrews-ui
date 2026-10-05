import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  compileDocExamples,
  readDocExamples,
} from "../../scripts/lib/doc-example-compile.mjs";
import { linkInstalledDependencies } from "../../scripts/lib/packed-workspace.mjs";
import { removeTemporaryTrees, temporaryTree } from "./lib/temporary-tree.mjs";

/*
 * The compile runs in the workspace check-consumer-types.mjs packs, a child
 * process in-process coverage cannot see, so these specs call it directly
 * against a small stand-in for that workspace: a package with two entries
 * whose declarations use the `export { ... } from` form the packed build
 * emits, beside the repository's own installed dependencies.
 */

/** The stand-in package, named so no installed package can shadow it. */
const PACKAGE = "snui-doc-compile-fixture";

/** Each compile spawns the TypeScript 7 compiler twice on a small board. */
const COMPILE_TIMEOUT_MS = 120_000;

const DECLARATIONS = {
  "button.d.ts": [
    'import type { ReactNode } from "react";',
    'export type ButtonVariant = "primary" | "secondary";',
    "export interface ButtonProps {",
    "  readonly children?: ReactNode;",
    "  readonly onClick?: () => void;",
    "  readonly variant?: ButtonVariant;",
    "}",
    "export declare function Button(props: ButtonProps): ReactNode;",
  ].join("\n"),
  "dialog.d.ts": [
    'import type { ReactNode } from "react";',
    "export interface DialogProps {",
    "  readonly children?: ReactNode;",
    "  readonly open?: boolean;",
    "  readonly title: string;",
    "}",
    "export declare function Dialog(props: DialogProps): ReactNode;",
  ].join("\n"),
  "index.d.ts":
    'export { Button, type ButtonProps, type ButtonVariant, } from "./button.js";',
  "overlays.d.ts": 'export { Dialog, type DialogProps, } from "./dialog.js";',
};

const PACKAGE_JSON = {
  exports: {
    ".": { import: "./index.js", types: "./index.d.ts" },
    // Entries without an ESM declaration are not a place to import from.
    "./federation": {
      require: "./federation.cjs",
      types: "./federation.d.cts",
    },
    "./overlays": { import: "./overlays.js", types: "./overlays.d.ts" },
    "./package.json": "./package.json",
  },
  name: PACKAGE,
};

let packed;

beforeAll(() => {
  const packageRoot = `node_modules/${PACKAGE}`;
  const workspace = temporaryTree("snui-doc-compile-", {
    [`${packageRoot}/package.json`]: JSON.stringify(PACKAGE_JSON),
    ...Object.fromEntries(
      Object.entries(DECLARATIONS).map(([file, text]) => [
        `${packageRoot}/${file}`,
        text,
      ]),
    ),
  });
  const modules = join(workspace, "node_modules");
  // The declarations reach into React's types the way the packed ones do.
  linkInstalledDependencies(modules, PACKAGE);
  packed = {
    packageDirectory: join(modules, PACKAGE),
    packageJson: PACKAGE_JSON,
    workspace,
  };
});

afterAll(removeTemporaryTrees);

/** An example as the extraction hands it over. */
function example(line, source) {
  return { file: "README.md", heading: "Examples", line, source };
}

/** Compiles and returns what the failure wrote to stderr, or throws. */
function failureOutput(examples) {
  const written = [];
  const stderr = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
  try {
    expect(() => compileDocExamples(packed, examples)).toThrow(
      "A documentation example does not compile against the packed declarations.",
    );
  } finally {
    stderr.mockRestore();
  }
  return written.join("");
}

describe("documentation example compile", () => {
  it(
    "compiles a module as written and completes a snippet from every entry",
    () => {
      const summary = compileDocExamples(packed, [
        example(
          10,
          [
            `import { Button } from "${PACKAGE}";`,
            "",
            "export function Save() {",
            '  return <Button variant="primary">Save</Button>;',
            "}",
          ].join("\n"),
        ),
        // Button comes from the root entry and Dialog from the overlays
        // entry; `save` and `detailsOpen` are left to the prose around it.
        example(
          20,
          [
            '<Dialog title="Details" open={detailsOpen}>',
            "  <Button onClick={save}>Save</Button>",
            "</Dialog>",
          ].join("\n"),
        ),
        // A snippet that names only ambient values still compiles as a
        // component with no generated imports.
        example(30, "<p>{String(1)}</p>"),
      ]);

      expect(summary).toBe(
        "Compiled 3 documentation examples (1 modules, 2 completed snippets) against the packed declarations.",
      );
    },
    COMPILE_TIMEOUT_MS,
  );

  it(
    "reports each failure at the documentation line it came from",
    () => {
      const output = failureOutput([
        example(
          40,
          [
            `import { Button } from "${PACKAGE}";`,
            "",
            'export const loud = <Button variant="loud">Save</Button>;',
          ].join("\n"),
        ),
        example(
          50,
          ["<Button>", "  <Dialog title={3} />", "</Button>"].join("\n"),
        ),
      ]);

      // The module's third code line sits three below its fence at 40, and
      // the snippet's second line two below its fence at 50, whatever the
      // completion put ahead of it.
      expect(output).toMatch(
        /README\.md:43:\d+ \(README\.md:40\): error TS2322: Type '"loud"'/,
      );
      expect(output).toMatch(
        /README\.md:52:\d+ \(README\.md:50\): error TS2322: Type 'number' is not assignable to type 'string'/,
      );
      expect(output).not.toMatch(/doc-examples[\\/]example-/);
    },
    COMPILE_TIMEOUT_MS,
  );

  it(
    "fails a module that uses a name it never imported",
    () => {
      // An earlier call in the same workspace leaves two failing examples
      // behind, so the call under test, which writes one, would compile the
      // second of them again if the directory were not emptied first. Made
      // here rather than borrowed from the spec before, so this holds run
      // alone or in any order.
      failureOutput([
        example(70, "export const first = <p title={1}>First</p>;\n"),
        example(80, "export const second = <p title={2}>Second</p>;\n"),
      ]);

      // Only a snippet is completed; a module that leans on an unimported
      // name is a broken example a consumer would copy as it stands.
      const output = failureOutput([
        example(60, "export const panel = <Button>Save</Button>;\n"),
      ]);

      expect(output).toMatch(
        /README\.md:61:\d+ \(README\.md:60\): error TS2304: Cannot find name 'Button'/,
      );
      // Nothing from the earlier call: no file this call did not write, and
      // no line of its examples.
      expect(output).not.toMatch(/doc-examples[\\/]example-/);
      expect(output).not.toMatch(/README\.md:(?:7|8)\d/);
    },
    COMPILE_TIMEOUT_MS,
  );
});

describe("reading the documentation examples", () => {
  it("reads the consumer documents by default", () => {
    const examples = readDocExamples();

    expect(examples.length).toBeGreaterThan(0);
    expect(new Set(examples.map((read) => read.file))).toEqual(
      new Set(["README.md", "docs/migration.md"]),
    );
  });

  it("refuses a set of documents with no tsx example", () => {
    expect(() => readDocExamples(["LICENSE"])).toThrow(
      "No tsx example found in LICENSE; the extraction no longer matches the documents.",
    );
  });
});
