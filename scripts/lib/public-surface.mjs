/**
 * The public type surface: what a consumer can name through the exports map.
 *
 * A declaration file reachable from an entry point also carries doc comment
 * prose, destructured parameter lists, and exported helpers the exports map
 * never lets anyone import. None of that is something a consumer can observe
 * in a type check, so none of it is compared. What is compared is each entry
 * point's list of exported names, and every declaration those names reach
 * through the types they use, printed without comments, with each destructured
 * parameter renamed to a plain one, and with the two JSDoc tags that change
 * what a consumer's tools do kept: `@deprecated`, which strikes the name
 * through and fails a consumer's `no-deprecated` lint, and `@default`. A file
 * that augments a global or another module changes consumer types without an
 * export, so any such file is compared whole.
 */
import { relative, sep } from "node:path";

import ts from "typescript";

import { packageOf } from "../../bin/lib/module-graph.mjs";
import { DECLARATION_FILE, distPath, fileKey } from "./declaration-graph.mjs";

/** JSDoc tags whose presence changes what a consumer's editor or lint does. */
const BEHAVIORAL_TAGS = new Set(["default", "deprecated"]);

function isDistDeclaration(distDirectory, fileName) {
  const key = relative(distDirectory, fileName);
  return (
    !key.startsWith("..") &&
    !key.split(sep).includes("node_modules") &&
    DECLARATION_FILE.test(fileName)
  );
}

/** The statement of its source file that holds a declaration. */
function topLevelStatement(node) {
  let current = node;
  while (current.parent !== undefined && !ts.isSourceFile(current.parent)) {
    current = current.parent;
  }
  return current;
}

/** A module or global augmentation, which reaches consumers without an export. */
function isAugmentation(statement) {
  return (
    ts.isModuleDeclaration(statement) &&
    ((statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0 ||
      ts.isStringLiteral(statement.name))
  );
}

/** The symbol an import or re-export stands for; an unresolved one has no declarations. */
function resolveAlias(checker, symbol) {
  return (symbol.flags & ts.SymbolFlags.Alias) === 0
    ? symbol
    : checker.getAliasedSymbol(symbol);
}

/** The npm package a declaration outside dist comes from. */
function externalPackageOf(fileName) {
  return packageOf(fileName)?.name ?? "";
}

/** Whether an exported name can be used as a type, a value, or both. */
function meaningOf(symbol) {
  const meanings = [];
  if ((symbol.flags & ts.SymbolFlags.Type) !== 0) meanings.push("type");
  if ((symbol.flags & ts.SymbolFlags.Value) !== 0) meanings.push("value");
  return meanings.length === 0 ? "namespace" : meanings.join(", ");
}

/** Renames a destructured parameter to a plain name; a parameter's name is not part of its type. */
function normalizeParameters(context) {
  const { factory } = context;
  const visit = (node) => {
    if (
      ts.isParameter(node) &&
      (ts.isObjectBindingPattern(node.name) ||
        ts.isArrayBindingPattern(node.name))
    ) {
      const index = node.parent.parameters.indexOf(node);
      return factory.updateParameterDeclaration(
        node,
        node.modifiers,
        node.dotDotDotToken,
        factory.createIdentifier(index === 0 ? "props" : `arg${String(index)}`),
        node.questionToken,
        ts.visitNode(node.type, visit),
        node.initializer,
      );
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (root) => ts.visitNode(root, visit);
}

/** The kept tags a node's own doc comments carry, as one comment body. */
function behavioralTagComment(node) {
  const tags = (node.jsDoc ?? []).flatMap((doc) => doc.tags ?? []);
  const kept = tags
    .filter((tag) => BEHAVIORAL_TAGS.has(tag.tagName.text))
    .map((tag) => {
      // A deprecation's reason is prose; a default's value is the contract.
      if (tag.tagName.text !== "default") return `@${tag.tagName.text}`;
      const value = ts.getTextOfJSDocComment(tag.comment) ?? "";
      return `@default ${value.replace(/\s+/g, " ").trim()}`.trimEnd();
    });
  return kept.length === 0 ? undefined : `* ${kept.join(" ")} `;
}

/** Suppresses every comment the printer would copy from the source text. */
function stripComments(node) {
  ts.setEmitFlags(node, ts.EmitFlags.NoComments);
  ts.forEachChild(node, stripComments);
}

/** Puts each kept tag back in front of the node that carried it. */
function restoreBehavioralTags(node) {
  const comment = behavioralTagComment(ts.getOriginalNode(node));
  if (comment !== undefined) {
    ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      comment,
      true,
    );
  }
  ts.forEachChild(node, restoreBehavioralTags);
}

const printer = ts.createPrinter({ removeComments: false });

/** One statement as the snapshot compares it. */
export function printPublicStatement(statement) {
  const { transformed } = ts.transform(statement, [normalizeParameters]);
  const [normalized] = transformed;
  stripComments(normalized);
  restoreBehavioralTags(normalized);
  return printer.printNode(
    ts.EmitHint.Unspecified,
    normalized,
    statement.getSourceFile(),
  );
}

/**
 * The compiler options the emitted declarations are read with. Library
 * checking stays on, so a declaration that refers to a name the build never
 * emitted is an error here rather than a silent `any` for a consumer.
 */
const PROGRAM_OPTIONS = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
  skipLibCheck: false,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  types: [],
};

/** Diagnostic codes for a name an import or a reference cannot find. */
const MISSING_NAME_CODES = new Set([2304, 2305, 2552, 2614, 2724]);

/**
 * Every error the compiler reports in the reachable declaration files, one
 * line each. A missing name, what an `@internal` tag on a publicly used type
 * leaves behind once the build strips it, says so in words.
 */
function declarationErrorsOf(program, distDirectory, files) {
  return files.flatMap((sourceFile) =>
    [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ].map((diagnostic) => {
      const where = fileKey(distDirectory, sourceFile.fileName);
      const line =
        diagnostic.start === undefined
          ? 0
          : sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      if (
        MISSING_NAME_CODES.has(diagnostic.code) &&
        diagnostic.start !== undefined
      ) {
        const name = sourceFile.text.slice(
          diagnostic.start,
          diagnostic.start + (diagnostic.length ?? 0),
        );
        return `${where}:${String(line)} refers to ${name}, which the emitted declarations do not declare (an @internal tag on a public type?)`;
      }
      return `${where}:${String(line)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
    }),
  );
}

/**
 * Reads the public surface from the emitted declarations. `entryFiles` are
 * dist-relative declaration paths, one per exports-map entry, and
 * `reachableFiles` every declaration file those entries reach through their
 * imports, which the companion check reads.
 *
 * Returns the snapshot `sections` (a Map of section title to body), the
 * `augmentations` (files compared whole), `unaccountedExports`: names a
 * reachable file exports that no entry exports and no public declaration
 * refers to, and `declarationErrors`: every compiler error in a reachable
 * file, such as a reference to a type the build stripped.
 */
export function readPublicSurface(distDirectory, entryFiles, reachableFiles) {
  const absolute = (file) => distPath(distDirectory, file);
  const program = ts.createProgram({
    options: PROGRAM_OPTIONS,
    rootNames: [...new Set([...entryFiles, ...reachableFiles])].map(absolute),
  });
  const checker = program.getTypeChecker();

  const sourceFileOf = (file) => {
    const sourceFile = program.getSourceFile(absolute(file));
    if (sourceFile === undefined) {
      throw new Error(`The declaration program could not read ${file}.`);
    }
    return sourceFile;
  };

  const exportsOf = (sourceFile) => {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    return moduleSymbol === undefined
      ? []
      : checker.getExportsOfModule(moduleSymbol);
  };

  const publicStatements = new Set();
  const entryTargets = new Set();
  const queue = [];
  const enqueueSymbol = (symbol) => {
    const target = resolveAlias(checker, symbol);
    for (const declaration of target.declarations ?? []) {
      const fileName = declaration.getSourceFile().fileName;
      if (isDistDeclaration(distDirectory, fileName)) {
        queue.push(topLevelStatement(declaration));
      }
    }
    return target;
  };

  const sections = new Map();
  for (const entry of [...entryFiles].sort()) {
    const lines = exportsOf(sourceFileOf(entry))
      .map((symbol) => {
        const target = enqueueSymbol(symbol);
        entryTargets.add(target);
        const home = target.declarations?.[0]?.getSourceFile().fileName;
        if (home === undefined) return `${symbol.name}: unresolved`;
        // A name re-exported from a dependency keeps its package in view:
        // that package's own release changes this name's type with no diff
        // in any file here.
        const from = isDistDeclaration(distDirectory, home)
          ? fileKey(distDirectory, home)
          : externalPackageOf(home);
        return `${symbol.name}: ${meaningOf(target)} from ${from}`;
      })
      .sort();
    sections.set(`exports of ${entry}`, lines.join("\n"));
  }

  const visitReferences = (node) => {
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol !== undefined) enqueueSymbol(symbol);
    }
    ts.forEachChild(node, visitReferences);
  };
  while (queue.length > 0) {
    const statement = queue.pop();
    if (publicStatements.has(statement)) continue;
    publicStatements.add(statement);
    visitReferences(statement);
  }

  // Each reachable file with its source, read once for the three passes
  // below.
  const reachableSources = [...reachableFiles]
    .sort()
    .map((file) => ({ file, sourceFile: sourceFileOf(file) }));

  const augmentations = [];
  for (const { file, sourceFile } of reachableSources) {
    if (sourceFile.statements.some(isAugmentation)) {
      augmentations.push(file);
      sections.set(file, sourceFile.text.trimEnd());
      continue;
    }
    const printed = sourceFile.statements
      .filter((statement) => publicStatements.has(statement))
      .map(printPublicStatement);
    if (printed.length > 0) sections.set(file, printed.join("\n"));
  }

  const unaccountedExports = [];
  for (const { file, sourceFile } of reachableSources) {
    if (entryFiles.includes(file) || augmentations.includes(file)) continue;
    for (const symbol of exportsOf(sourceFile)) {
      const target = resolveAlias(checker, symbol);
      if (entryTargets.has(target)) continue;
      const statements = (target.declarations ?? []).map(topLevelStatement);
      if (statements.some((statement) => publicStatements.has(statement))) {
        continue;
      }
      unaccountedExports.push(`${file}: ${symbol.name}`);
    }
  }

  const declarationErrors = declarationErrorsOf(
    program,
    distDirectory,
    reachableSources.map(({ sourceFile }) => sourceFile),
  );

  return { augmentations, declarationErrors, sections, unaccountedExports };
}
