/**
 * Checks a panel's own source for CSS module classes that land on one of this
 * package's components through a single class selector.
 *
 * Every package rule sits inside a native CSS `@scope`. The cascade compares
 * scope proximity after specificity and before source order, and an unscoped
 * rule counts as infinitely distant, so a consumer rule of one class loses to
 * a package rule of one class that sets the same property, whichever sheet
 * loads last. It works only until the package starts setting that property,
 * and then it stops without a word. Doubling the class (`.row.row`) wins on
 * specificity, which the cascade settles first; the design contract names it
 * as the supported override path.
 *
 * The check reads source, not the built remote, because only the source says
 * which element a class lands on. It finds the class through the nearest
 * enclosing JSX opening tag, which is a heuristic rather than a parse, and it
 * ships without a parser dependency because the command ships in the package
 * tarball.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { PACKAGE_NAME } from "./consumer-checks.mjs";
import { readCss, singleClassOf } from "./css-source.mjs";

/** Source files a panel's components live in. */
const COMPONENT_FILE = /\.[cm]?[jt]sx?$/;

/** The CSS modules the check reads rules from. */
const CSS_MODULE_FILE = /\.module\.css$/;

/** Every file under `directory` that `pattern` matches, skipping dependencies. */
function filesUnder(directory, pattern) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, pattern));
    else if (pattern.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * Keywords after which a `/` opens a regular expression rather than dividing.
 */
const REGEX_KEYWORDS = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

/** Characters after which a `/` opens a regular expression rather than dividing. */
const REGEX_AFTER = new Set("(,=:[!&|?{;+-*%~^>");

/** Whether a `/` at `index` of `source` opens a regular expression literal. */
function opensRegex(source, index) {
  let before = index - 1;
  while (before >= 0 && /\s/.test(source[before])) before -= 1;
  if (before < 0) return true;
  if (REGEX_AFTER.has(source[before])) return true;
  let word = before;
  while (word >= 0 && /[\w$]/.test(source[word])) word -= 1;
  return REGEX_KEYWORDS.has(source.slice(word + 1, before + 1));
}

/**
 * The index just past a literal that ends at `closing`, from its first
 * character after the opening one. A backslash escapes the next character. A
 * quoted string or a regular expression cannot span lines, so it also ends at
 * a line break, which keeps an apostrophe in JSX text from reaching past its
 * own line.
 */
function skipLiteral(source, index, closing, singleLine) {
  let position = index;
  let inClass = false;
  while (position < source.length) {
    const character = source[position];
    if (character === "\\") {
      position += 2;
      continue;
    }
    if (singleLine && character === "\n") return position;
    if (closing === "/") {
      if (character === "[") inClass = true;
      else if (character === "]") inClass = false;
      else if (character === "/" && !inClass) return position + 1;
    } else if (character === closing) {
      return position + 1;
    }
    position += 1;
  }
  return position;
}

/**
 * Whether the slash at `position` opens a comment, by the comment rules in
 * the blankScriptComments doc comment. A slash glued to the text before it
 * is where JSX text and a comment look alike: a word character or a colon
 * for a `//`, and also a `*` or a `.` for a `/*`, as in a glob such as
 * `**` then `/*.ts`. Only those cases need more than the slash and the
 * character after it.
 */
function opensCommentAt(source, position) {
  const next = source[position + 1];
  const before = source[position - 1] ?? "";
  if (next === "/") {
    if (before === ":") return false;
    return !/\w/.test(before) || /\s/.test(source[position + 2] ?? " ");
  }
  if (next !== "*") return false;
  if (!/[\w:.*]/.test(before)) return true;
  if (source[position + 2] === "/") return false;
  // The first of a comment close, another comment start, or the line's end
  // decides, so the walk reads no further than it has to.
  for (let at = position + 2; at < source.length; at += 1) {
    const character = source[at];
    if (character === "\n") return false;
    if (character === "*" && source[at + 1] === "/") return true;
    if (character === "/" && source[at + 1] === "*") return false;
  }
  return false;
}

/**
 * The source with every comment replaced by spaces, its line breaks kept so
 * positions and line numbers still hold. It walks the text once and reads
 * each character by the first of these rules that applies:
 *
 * - A `//` right after a colon is text, as in a URL's `https://`.
 * - A `//` right after a word character opens a line comment only when
 *   whitespace follows it, as in `disabled// note`; `TCP//UDP` is text.
 * - Any other `//` opens a line comment, blanked to the end of its line.
 * - A `/*` right after a word character, a colon, a `*`, or a `.` and
 *   followed at once by another slash is text, as in a path such as
 *   `vessels/*` then `/nav`.
 * - Any other `/*` right after a word character, a colon, a `*`, or a `.`
 *   opens a block comment only when a comment close ends it on its own line
 *   before another `/*` starts, as in `ctx/*, rest` closed on the same line;
 *   otherwise it is text, as in a path pattern such as `vessels/*` or a glob
 *   such as `**` then `/*.ts`.
 * - Any other `/*` opens a block comment, blanked to the next comment close
 *   or the end of the file.
 * - A `'` or `"` string is skipped whole, to its closing quote or the end of
 *   its line, so an apostrophe in JSX text cannot reach past its own line.
 * - A template literal is skipped whole, and its `${}` substitutions are
 *   walked as code, comments included.
 * - A `/` where a regular expression can start (at the start of the text,
 *   or after an operator, an opening bracket, a comma, a semicolon, a `>`
 *   such as an arrow's, or a keyword such as `return`) skips the literal to
 *   its closing `/`, honoring escapes and character classes, or to the end
 *   of its line.
 * - Every other character is kept, a dividing `/` included.
 *
 * It does not know JSX text. The comment rules keep a URL, a path pattern or
 * glob with no comment close after it on its line, and glued text such as
 * `TCP//UDP` as text; what it still takes for a comment in JSX text is a
 * `//` or `/*` after a space or a bracket, a glued `//` followed by
 * whitespace, and a glued `/*` that a comment close ends on its own line,
 * as in the empty comment a glob such as `src/**` followed by `/*.ts` holds,
 * or in a path such as `vessels/*.nav.*` followed by `/x`. That is why the
 * imports, which come before any markup, are read from its output, while
 * class reads, their line numbers, and the tag of any read it blanked come
 * from the source as written; only a read it kept has its tag looked up in
 * the output first.
 *
 * Reading source with its comments gone is what lets the import patterns
 * below stay simple: a comment can neither start a match at the word
 * "import" in prose nor sit inside the braces of a real import.
 */
export function blankScriptComments(source) {
  const parts = [];
  let copied = 0;
  // One brace depth per template substitution the walk is inside; the
  // closing brace at depth zero returns to that template's text.
  const substitutions = [];
  let position = 0;

  const blank = (from, to) => {
    parts.push(
      source.slice(copied, from),
      source.slice(from, to).replaceAll(/[^\n]/g, " "),
    );
    copied = to;
  };
  // The index just past template text starting at `index`, stopping at its
  // closing backtick or at a `${`, which the walk then enters as code.
  const skipTemplate = (index) => {
    let at = index;
    while (at < source.length) {
      const character = source[at];
      if (character === "\\") {
        at += 2;
      } else if (character === "`") {
        return at + 1;
      } else if (character === "$" && source[at + 1] === "{") {
        substitutions.push(0);
        return at + 2;
      } else {
        at += 1;
      }
    }
    return at;
  };

  while (position < source.length) {
    const character = source[position];
    const next = source[position + 1];
    const opensComment = character === "/" && opensCommentAt(source, position);
    if (opensComment && next === "/") {
      const end = source.indexOf("\n", position);
      const stop = end === -1 ? source.length : end;
      blank(position, stop);
      position = stop;
    } else if (opensComment) {
      const end = source.indexOf("*/", position + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(position, stop);
      position = stop;
    } else if (character === "'" || character === '"') {
      position = skipLiteral(source, position + 1, character, true);
    } else if (character === "`") {
      position = skipTemplate(position + 1);
    } else if (character === "/" && opensRegex(source, position)) {
      position = skipLiteral(source, position + 1, "/", true);
    } else if (substitutions.length > 0 && character === "{") {
      substitutions[substitutions.length - 1] += 1;
      position += 1;
    } else if (substitutions.length > 0 && character === "}") {
      if (substitutions.at(-1) === 0) {
        substitutions.pop();
        position = skipTemplate(position + 1);
      } else {
        substitutions[substitutions.length - 1] -= 1;
        position += 1;
      }
    } else {
      position += 1;
    }
  }
  parts.push(source.slice(copied));
  return parts.join("");
}

/**
 * An import clause: the text between `import` and `from`, read from source
 * whose comments are blanked. It holds no quote, no semicolon, and no second
 * `import`, and it starts and ends on a character that is not a space. So
 * where the whitespace after `import` ends and where the whitespace before
 * `from` begins are each fixed by one character, and a blanked comment run is
 * crossed once at either end: a match that fails costs time in proportion to
 * its length and no more. The no-second-`import` rule keeps a match from
 * starting at the word in prose outside a comment, such as JSX text, and
 * running on into a real statement.
 */
const IMPORT_CLAUSE = String.raw`((?!\bimport\b)[^\s'";](?:(?:(?!\bimport\b)[^'";])*?[^\s'";])?)`;

/** An import statement, with an optional `type` and its specifier. */
const IMPORT_STATEMENT = new RegExp(
  String.raw`import\s+(type\s+)?${IMPORT_CLAUSE}\s+from\s+["']([^"']+)["']`,
  "g",
);

/** An import of a CSS module, with its clause and specifier. */
const CSS_MODULE_IMPORT = new RegExp(
  String.raw`import\s+${IMPORT_CLAUSE}\s+from\s+["']([^"']+\.module\.css)["']`,
  "g",
);

/** An import specifier from this package or one of its entry points. */
const PACKAGE_SPECIFIER = new RegExp(
  `^${PACKAGE_NAME.replaceAll("-", "\\-")}(?:/[\\w-]+)?$`,
);

/** The package imports of code whose comments are already blanked. */
function readPackageImports(code) {
  const named = new Map();
  const namespaces = new Set();
  for (const match of code.matchAll(IMPORT_STATEMENT)) {
    const [, typeOnly, clause, specifier] = match;
    if (typeOnly !== undefined || !PACKAGE_SPECIFIER.test(specifier)) continue;
    const namespace = /\*\s*as\s+([\w$]+)/.exec(clause)?.[1];
    if (namespace !== undefined) namespaces.add(namespace);
    const braces = /\{([^}]*)\}/.exec(clause)?.[1];
    for (const entry of braces?.split(",") ?? []) {
      const words = entry.trim().split(/\s+/);
      if (words[0] === "type" || words[0] === "") continue;
      const [exported, , local = exported] = words;
      named.set(local, exported);
    }
  }
  return { named, namespaces };
}

/**
 * The package components a file imports: named imports keyed by local name
 * with their exported name, and namespace imports by local name. Type-only
 * imports bring in no component and are skipped.
 */
export function packageImportsOf(source) {
  return readPackageImports(blankScriptComments(source));
}

/** The CSS module imports of code whose comments are already blanked. */
function readCssModuleImports(code, file) {
  const imports = [];
  for (const match of code.matchAll(CSS_MODULE_IMPORT)) {
    const [, clause, specifier] = match;
    const path = /^[./]/.test(specifier)
      ? resolve(dirname(file), specifier)
      : undefined;
    const module = { specifier, ...(path === undefined ? {} : { path }) };
    const object =
      /\*\s*as\s+([\w$]+)/.exec(clause)?.[1] ??
      /^([\w$]+)\s*(?:,|$)/.exec(clause.trim())?.[1];
    if (object !== undefined) imports.push({ binding: object, ...module });
    const braces = /\{([^}]*)\}/.exec(clause)?.[1];
    for (const entry of braces?.split(",") ?? []) {
      const words = entry.trim().split(/\s+/);
      if (words[0] === "") continue;
      const [key, , binding = key] = words;
      imports.push({ binding, key, ...module });
    }
  }
  return imports;
}

/**
 * The CSS module imports of a file, one per binding: a default or namespace
 * binding is the object classes are read from, and a named binding carries
 * the class `key` it stands for. `path` is the module's file, left undefined
 * for a specifier only the bundler resolves, such as an alias.
 */
export function cssModuleImportsOf(source, file) {
  return readCssModuleImports(blankScriptComments(source), file);
}

/**
 * The JSX tag whose attributes hold `index`, or undefined when the position is
 * in no opening tag. Walks back through each `<Name` before the position and
 * forward from it: the position is inside that tag's attributes when it sits
 * inside an attribute expression and no `>` closed the tag first. Explicit
 * type arguments after the name, as in `<SegmentedControl<Density>`, are
 * skipped. The walk does not know comments; the caller hands it text whose
 * comments are blanked when it has one.
 */
export function owningTagAt(source, index) {
  let candidate = source.lastIndexOf("<", index);
  while (candidate !== -1) {
    const name = /^<([A-Za-z][\w$]*(?:\.[\w$]+)*)/.exec(
      source.slice(candidate, index),
    )?.[1];
    if (name !== undefined) {
      const attributes = afterTypeArguments(
        source,
        candidate + 1 + name.length,
      );
      if (insideOpeningTag(source, attributes, index)) return name;
    }
    candidate = candidate === 0 ? -1 : source.lastIndexOf("<", candidate - 1);
  }
  return undefined;
}

/**
 * The index just past the type arguments that open at `index`, or `index`
 * when none do. An arrow's `=>` inside them is not a closing bracket.
 */
function afterTypeArguments(source, index) {
  if (source[index] !== "<") return index;
  let depth = 0;
  for (let position = index; position < source.length; position += 1) {
    const character = source[position];
    if (character === "<") depth += 1;
    else if (character === ">" && source[position - 1] !== "=") {
      depth -= 1;
      if (depth === 0) return position + 1;
    }
  }
  return index;
}

/**
 * Whether `index` lies in an attribute expression of an opening tag whose
 * attributes start at `from`: inside a `{}` that no `>` at the tag's own
 * level preceded. An attribute string at the tag's level is quoted without
 * escapes, as JSX writes it, so a backslash there is text; a string or
 * template inside an expression honors backslash escapes.
 */
function insideOpeningTag(source, from, index) {
  let depth = 0;
  let quote;
  for (let position = from; position < index; position += 1) {
    const character = source[position];
    if (quote !== undefined) {
      if (character === "\\" && depth > 0) position += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth < 0) return false;
    } else if (character === ">" && depth === 0) {
      return false;
    }
  }
  return depth > 0;
}

/** A dashed class name as a CSS modules camel-case export reads it. */
function camelCase(name) {
  return name.replaceAll(/-+([a-z0-9])/g, (_match, letter) =>
    letter.toUpperCase(),
  );
}

/** The one-based line of a position, for the report. */
function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

/** A binding as a regular expression source, `$` escaped. */
function bindingPattern(binding) {
  return `(?<![\\w$.])${binding.replaceAll("$", "\\$")}`;
}

/**
 * Where a file reads classes from one import: `binding.key` and
 * `binding["key"]` for an object binding, and the bare binding for a named
 * one. Each read carries the class key and its position.
 */
function classReads(source, { binding, key }) {
  if (key !== undefined) {
    // An object key of the same name, as in `cx({ active: on })`, is not a
    // read; the true branch of a conditional, `on ? active : idle`, is.
    return [
      ...source.matchAll(
        new RegExp(`${bindingPattern(binding)}(?![\\w$])`, "g"),
      ),
    ]
      .filter(
        (match) =>
          !(
            /[{,]\s*$/.test(source.slice(0, match.index)) &&
            /^\s*:/.test(source.slice(match.index + binding.length))
          ),
      )
      .map((match) => ({ index: match.index, key }));
  }
  return [
    ...source.matchAll(
      new RegExp(
        `${bindingPattern(binding)}(?:\\.([\\w$]+)|\\[\\s*["']([^"']+)["']\\s*\\])`,
        "g",
      ),
    ),
  ].map((match) => ({ index: match.index, key: match[1] ?? match[2] }));
}

/**
 * Every class a component file reads from a CSS module and places on a
 * package component, as `{ component, cssPath, file, key, line, specifier }`.
 * `cssPath` is undefined when only the bundler can resolve the import.
 */
export function findClassesOnPackageComponents(file, source) {
  // The source is blanked once. Imports are read from the blanked text only.
  // Class reads are found in the source as written, so a class in
  // commented-out markup is reported too; deleting the dead markup clears it.
  // A read the blanker kept takes its tag from the blanked text first, so a
  // comment inside an opening tag cannot end the tag or open a quote, and
  // from the source as written when that finds none. A read the blanker
  // blanked sits in a comment, or after JSX text the blanker took for one
  // (see blankScriptComments), where the blanked text would hand it to
  // whatever tag was still open before the blanking began; its tag comes
  // from the source as written. A URL, and a path pattern or glob with no
  // comment close after it on its line, open no comment, so they blank
  // nothing.
  const code = blankScriptComments(source);
  const { named, namespaces } = readPackageImports(code);
  if (named.size === 0 && namespaces.size === 0) return [];
  const placements = [];
  for (const cssImport of readCssModuleImports(code, file)) {
    for (const read of classReads(source, cssImport)) {
      const blanked = code[read.index] !== source[read.index];
      const tag = blanked
        ? owningTagAt(source, read.index)
        : (owningTagAt(code, read.index) ?? owningTagAt(source, read.index));
      if (tag === undefined) continue;
      const [head, ...rest] = tag.split(".");
      const component =
        rest.length === 0
          ? named.get(head)
          : namespaces.has(head) && rest.length === 1
            ? rest[0]
            : undefined;
      if (component === undefined) continue;
      placements.push({
        component,
        cssPath: cssImport.path,
        file,
        key: read.key,
        line: lineOf(source, read.index),
        specifier: cssImport.specifier,
      });
    }
  }
  return placements;
}

/**
 * The single class selectors a CSS module declares, by class name. Nested
 * rules are skipped: a rule inside another style rule is a descendant or
 * compound selector, whose specificity already exceeds one class.
 */
export function singleClassSelectorsOf(source) {
  const classes = new Set();
  for (const { nested, selectors } of readCss(source).rules) {
    if (nested) continue;
    for (const selector of selectors) {
      const name = singleClassOf(selector);
      if (name !== undefined) classes.add(name);
    }
  }
  return classes;
}

/**
 * Checks every component file and CSS module under `directory`. Returns the
 * findings as sentences and the number of CSS modules read.
 */
export function findSingleClassOverrides(directory, root = directory) {
  const cssModules = filesUnder(directory, CSS_MODULE_FILE);
  const singleClasses = new Map();
  // A component may import a module from outside the directory, so modules
  // are read as their importers name them rather than only from the listing.
  const singleClassesOf = (path) => {
    if (!singleClasses.has(path)) {
      singleClasses.set(
        path,
        existsSync(path)
          ? singleClassSelectorsOf(readFileSync(path, "utf8"))
          : undefined,
      );
    }
    return singleClasses.get(path);
  };
  const findings = new Set();
  for (const file of filesUnder(directory, COMPONENT_FILE)) {
    const source = readFileSync(file, "utf8");
    for (const placement of findClassesOnPackageComponents(file, source)) {
      const declared =
        placement.cssPath === undefined
          ? undefined
          : singleClassesOf(placement.cssPath);
      if (declared === undefined) {
        // A class the check cannot read is reported, never passed: the
        // module may declare it with a single class selector.
        const reason =
          placement.cssPath === undefined
            ? "only the bundler resolves an alias or package path"
            : "no such file";
        findings.add(
          `${relative(root, placement.file)}:${placement.line}: .${placement.key} lands on the package ${placement.component} through ${placement.specifier}, which the check cannot read: ${reason}. Import CSS modules by a path relative to the component, so the check can tell whether the class is doubled.`,
        );
        continue;
      }
      for (const name of declared) {
        if (name !== placement.key && camelCase(name) !== placement.key) {
          continue;
        }
        findings.add(
          `${relative(root, placement.cssPath)}: .${name} lands on the package ${placement.component} (${relative(root, placement.file)}:${placement.line}) through a single class selector, which loses to a scoped package rule setting the same property. Declare it as .${name}.${name}.`,
        );
      }
    }
  }
  return { cssModules: cssModules.length, findings: [...findings] };
}

/**
 * Asserts no CSS module class lands on a package component through a single
 * class selector. Returns the number of CSS modules read, for the summary.
 */
export function assertDoubledOverrides(directory, root = directory) {
  const { cssModules, findings } = findSingleClassOverrides(directory, root);
  if (cssModules === 0) {
    throw new Error(
      `--styles found no *.module.css under ${relative(root, directory) || "."}, so there is nothing to check. Point it at the directory that holds the panel's components and their CSS modules.`,
    );
  }
  if (findings.length > 0) {
    throw new Error(
      `A panel class overrides a package component without doubling:\n${findings.join("\n")}`,
    );
  }
  return cssModules;
}
