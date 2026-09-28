/**
 * The `tsx` examples in the consumer documentation, read as code.
 *
 * The examples are the most copied text in the package, so two checks hold
 * them to the API they describe: scripts/lib/doc-example-compile.mjs compiles
 * every one against the packed declarations, from
 * scripts/check-consumer-types.mjs during validation and from
 * scripts/check-doc-examples.mjs on its own, and
 * tests/unit/doc-examples.test.tsx renders every one and fails on a console
 * warning. Both read the examples here, so they agree on what an example is
 * and where it came from.
 *
 * An example is either a module, which imports what it uses and compiles as
 * written, or a snippet: JSX that leans on names the surrounding prose
 * implies, such as `saving` or `serverError`. A snippet is completed before it
 * is compiled: a name the package exports is imported from the entry that
 * exports it, and any other free name is declared.
 */

/** The documents whose examples are checked, from the repository root. */
export const DOC_EXAMPLE_FILES = Object.freeze([
  "README.md",
  "docs/migration.md",
]);

/**
 * An opening or closing fence. A closing fence repeats the opening character
 * at least as many times and carries no info string.
 */
const FENCE = /^(?<indent>[ \t]*)(?<marker>`{3,}|~{3,})(?<info>.*)$/;

const HEADING = /^#{1,6}[ \t]+(?<text>.+?)[ \t]*#*[ \t]*$/;

/** A statement that makes the example a module: an import or an export. */
const MODULE_STATEMENT = /^(?:import|export)\s/m;

/** The lines joined, with `indent` removed from every line that starts with it. */
function removeIndent(lines, indent) {
  return lines
    .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
    .join("\n");
}

/**
 * Every `tsx` fence in a Markdown document, in order, as
 * `{ file, line, heading, source }`: the document path it was read from, the
 * one-based line of its opening fence, the text of the nearest heading above
 * it, and its code with the fence's own indentation removed.
 */
export function extractTsxExamples(markdown, file) {
  const examples = [];
  let heading = "";
  let open;

  for (const [index, text] of markdown.split(/\r?\n/).entries()) {
    const fence = FENCE.exec(text)?.groups;
    if (open === undefined) {
      if (fence !== undefined) {
        open = {
          body: [],
          indent: fence.indent,
          info: fence.info.trim().split(/\s+/)[0]?.toLowerCase() ?? "",
          line: index + 1,
          marker: fence.marker,
        };
        continue;
      }
      const title = HEADING.exec(text)?.groups?.text;
      if (title !== undefined) heading = title;
      continue;
    }

    const closes =
      fence !== undefined &&
      fence.marker[0] === open.marker[0] &&
      fence.marker.length >= open.marker.length &&
      fence.info.trim() === "";
    if (!closes) {
      open.body.push(text);
      continue;
    }
    if (open.info === "tsx") {
      examples.push({
        file,
        heading,
        line: open.line,
        source: removeIndent(open.body, open.indent),
      });
    }
    open = undefined;
  }

  if (open !== undefined) {
    throw new Error(
      `${file}:${String(open.line)} opens a fence that never closes.`,
    );
  }
  return examples;
}

/** Whether an example is a module, which compiles and runs as written. */
export function isModuleExample(source) {
  return MODULE_STATEMENT.test(source);
}

/** Where an example came from, as `file:line` of its opening fence. */
export function exampleLocation(example) {
  return `${example.file}:${String(example.line)}`;
}

/**
 * The value names an entry's declaration file exports, from its
 * `export { ... } from` statements. Type-only exports are left out, because a
 * snippet uses components and functions, and a type-only statement or
 * specifier cannot supply a value.
 */
export function entryValueExports(declarations) {
  const names = [];
  for (const [, typeOnly, list] of declarations.matchAll(
    /export\s+(type\s+)?\{([^}]*)\}/g,
  )) {
    if (typeOnly !== undefined) continue;
    for (const specifier of list.split(",")) {
      const trimmed = specifier.trim();
      if (trimmed === "" || trimmed.startsWith("type ")) continue;
      const alias = /\bas\s+(?<name>[\w$]+)$/.exec(trimmed)?.groups?.name;
      names.push(alias ?? trimmed);
    }
  }
  return names;
}

/**
 * The names a compiler run reports it could not find in one file, from
 * diagnostics such as `file.tsx(3,5): error TS2304: Cannot find name 'x'.`
 * TS2304 and TS2552 are an unknown value, and TS2503 an unknown namespace.
 */
export function missingNames(compilerOutput, fileName) {
  const names = new Set();
  for (const line of compilerOutput.split(/\r?\n/)) {
    if (!line.includes(fileName)) continue;
    const match =
      /error TS(?:2304|2552|2503): Cannot find (?:name|namespace) '(?<name>[\w$]+)'/.exec(
        line,
      );
    if (match?.groups !== undefined) names.add(match.groups.name);
  }
  return [...names].sort();
}

/**
 * Splits a snippet's free names into imports, by the entry that exports each,
 * and declarations for the rest. `exportsBySpecifier` maps an import
 * specifier, such as `signalk-nearlcrews-ui/overlays`, to its value names, in
 * the order an import should prefer them.
 */
export function snippetScope(freeNames, exportsBySpecifier) {
  const imports = new Map();
  const declarations = [];
  for (const name of freeNames) {
    // `React` is the namespace an example writes types through, such as
    // `React.CSSProperties`, and the package exports no such name.
    if (name === "React") {
      imports.set("react", ["* as React"]);
      continue;
    }
    const specifier = [...exportsBySpecifier].find(([, names]) =>
      names.includes(name),
    )?.[0];
    if (specifier === undefined) declarations.push(name);
    else imports.set(specifier, [...(imports.get(specifier) ?? []), name]);
  }
  return { declarations, imports };
}

/** Lines a completed snippet puts ahead of the snippet's own first line. */
export function snippetPreambleLines(scope) {
  return scope.imports.size + scope.declarations.length + 3;
}

/**
 * A snippet completed into a module that compiles: its imports, a declaration
 * of every other free name, and the snippet rendered by an exported component.
 * Siblings are wrapped in a fragment, so two elements side by side compile.
 */
export function snippetModule(source, scope) {
  const imports = [...scope.imports].map(([specifier, names]) =>
    names.length === 1 && names[0]?.startsWith("* as ")
      ? `import ${names[0]} from ${JSON.stringify(specifier)};`
      : `import { ${names.join(", ")} } from ${JSON.stringify(specifier)};`,
  );
  const declarations = scope.declarations.map(
    (name) => `declare const ${name}: any;`,
  );
  return [
    ...imports,
    ...declarations,
    "export function Example() {",
    "  return (",
    "    <>",
    source,
    "    </>",
    "  );",
    "}",
    "",
  ].join("\n");
}
