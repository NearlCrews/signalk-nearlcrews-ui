/**
 * Compiles the consumer documentation's `tsx` examples against the PACKED
 * declarations, inside a workspace scripts/lib/packed-workspace.mjs created.
 *
 * scripts/check-consumer-types.mjs runs this in the workspace it already
 * packed for the consumer fixture, so a validation run packs the package
 * once for both compiles. scripts/check-doc-examples.mjs runs it on its own,
 * for trying the check against a document written to fail.
 *
 * A module example compiles as written. A snippet is completed first (see
 * doc-examples.mjs): the compiler names what the snippet leaves free, every
 * name the package exports is imported from its entry, and the rest are
 * declared, so what is checked is the package API the snippet uses. Errors
 * are reported at the documentation line they come from.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { exportSpecifier } from "./bundle-contract.mjs";
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
} from "./doc-examples.mjs";
import { repositoryPath } from "./paths.mjs";
import { typescriptCompilerEntry } from "./typescript-compiler.mjs";

/** The workspace directory the examples are written to. */
const EXAMPLES_DIRECTORY = "doc-examples";

/**
 * Its own project file, so the examples compile beside the consumer fixture
 * without either project picking up the other's files.
 */
const EXAMPLES_PROJECT = "tsconfig.doc-examples.json";

/** A compiled example's file name, and the diagnostic path that names it. */
const EXAMPLE_DIAGNOSTIC = new RegExp(
  `${EXAMPLES_DIRECTORY}[\\\\/](example-\\d+\\.tsx)\\((\\d+),(\\d+)\\)`,
  "g",
);

/** Reads every example from the documents, refusing a set with none. */
export function readDocExamples(documents = DOC_EXAMPLE_FILES) {
  const examples = documents.flatMap((file) =>
    extractTsxExamples(readFileSync(repositoryPath(file), "utf8"), file),
  );
  if (examples.length === 0) {
    throw new Error(
      `No tsx example found in ${documents.join(" or ")}; the extraction no longer matches the documents.`,
    );
  }
  return examples;
}

/**
 * Each example as the file it is compiled from, with how many generated lines
 * precede its own first line, so a diagnostic maps back to the document.
 * `scopes` maps a snippet's file name to the imports and declarations that
 * complete it; a snippet without one is written with an empty preamble.
 */
export function exampleFiles(examples, scopes) {
  return examples.map((example, index) => {
    const name = `example-${String(index + 1).padStart(2, "0")}.tsx`;
    if (isModuleExample(example.source)) {
      return { example, name, preamble: 0, source: example.source };
    }
    const scope = scopes.get(name) ?? { declarations: [], imports: new Map() };
    return {
      example,
      name,
      preamble: snippetPreambleLines(scope),
      source: snippetModule(example.source, scope),
    };
  });
}

/**
 * Rewrites each `doc-examples/example-01.tsx(12,5)` in compiler output as the
 * documentation line it came from: the fence's line, plus the line in the
 * compiled file, less the lines a completed snippet put ahead of its own.
 * A file name no example owns is left as it is.
 */
export function atDocumentLines(output, files) {
  return output.replace(EXAMPLE_DIAGNOSTIC, (whole, name, line, column) => {
    const file = files.find((candidate) => candidate.name === name);
    if (file === undefined) return whole;
    const documentLine = file.example.line + Number(line) - file.preamble;
    return `${file.example.file}:${String(documentLine)}:${column} (${exampleLocation(file.example)})`;
  });
}

/**
 * Compiles `examples` inside a packed workspace and returns a one-line
 * summary. Throws, after writing the diagnostics at their documentation
 * lines to stderr, when any example fails to compile.
 */
export function compileDocExamples(packed, examples) {
  const { packageDirectory, packageJson, workspace } = packed;

  // The value names each entry exports, in exports-map order, read from the
  // packed declarations so a snippet imports what a consumer could import.
  const exportsBySpecifier = new Map();
  for (const [subpath, declaration] of Object.entries(packageJson.exports)) {
    const types =
      typeof declaration === "object" ? declaration.types : undefined;
    if (typeof types !== "string" || !types.endsWith(".d.ts")) continue;
    exportsBySpecifier.set(
      exportSpecifier(packageJson.name, subpath),
      entryValueExports(readFileSync(join(packageDirectory, types), "utf8")),
    );
  }

  // The consumer fixture's compiler options are the ones a consumer panel is
  // held to, so the examples are compiled under the same ones.
  const consumerConfig = JSON.parse(
    readFileSync(
      repositoryPath("fixtures", "consumer", "tsconfig.json"),
      "utf8",
    ),
  );
  writeFileSync(
    join(workspace, EXAMPLES_PROJECT),
    JSON.stringify(
      { ...consumerConfig, include: [`${EXAMPLES_DIRECTORY}/*.tsx`] },
      null,
      2,
    ),
  );
  // Emptied first: the project compiles every file in the directory, so an
  // example left by an earlier call in the same workspace would be compiled
  // and reported again.
  rmSync(join(workspace, EXAMPLES_DIRECTORY), { force: true, recursive: true });
  mkdirSync(join(workspace, EXAMPLES_DIRECTORY));

  const compile = (files) => {
    for (const file of files) {
      writeFileSync(
        join(workspace, EXAMPLES_DIRECTORY, file.name),
        file.source,
      );
    }
    const result = spawnSync(
      process.execPath,
      [
        typescriptCompilerEntry(),
        "--noEmit",
        "--pretty",
        "false",
        "--project",
        EXAMPLES_PROJECT,
      ],
      { cwd: workspace, encoding: "utf8" },
    );
    return {
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
      status: result.status,
    };
  };

  // First pass: the compiler names what each snippet leaves free. Second
  // pass: the completed snippets and the modules, which must be clean.
  const firstFiles = exampleFiles(examples, new Map());
  const first = compile(firstFiles);
  const scopes = new Map();
  for (const file of firstFiles) {
    if (isModuleExample(file.example.source)) continue;
    const names = missingNames(first.output, file.name);
    if (names.length > 0) {
      scopes.set(file.name, snippetScope(names, exportsBySpecifier));
    }
  }
  const files = exampleFiles(examples, scopes);
  const second = scopes.size === 0 ? first : compile(files);

  if (second.status !== 0) {
    process.stderr.write(atDocumentLines(second.output, files));
    throw new Error(
      "A documentation example does not compile against the packed declarations.",
    );
  }

  const snippets = files.filter((file) => file.preamble > 0).length;
  return `Compiled ${String(files.length)} documentation examples (${String(files.length - snippets)} modules, ${String(snippets)} completed snippets) against the packed declarations.`;
}
