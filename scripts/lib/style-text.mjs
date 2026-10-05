/**
 * Compacts the CSS text the compiled style modules carry.
 *
 * The style sources are written for people: indented rules, one declaration
 * per line, and comments that say why a rule exists. Every byte of that
 * layout ships inside the JavaScript a consumer bundles, and gzip recovers
 * only part of it. The build therefore rewrites the CSS text inside
 * `dist/styles/*.js` after the compiler has run: each run of CSS whitespace
 * becomes one space, and each CSS comment becomes one space rather than
 * nothing, so no two tokens can join where a comment sat between them.
 *
 * Only CSS text is touched, and it is found with the TypeScript parser rather
 * than a pattern: string literals and the text parts of template literals.
 * Text inside a CSS string is copied as written, and so is the whitespace a
 * CSS hex escape consumes. Anything this cannot rewrite with certainty, such
 * as an interpolation inside a CSS comment, stops the build instead of being
 * guessed at, and scripts/check-style-text.mjs holds the result to the source
 * after every build.
 */
import ts from "typescript";

/**
 * Compiled modules under dist/styles whose template literals are messages,
 * not CSS, and which are therefore never rewritten.
 */
export const NON_STYLE_MODULES = new Set([
  "install.js",
  "use-module-styles.js",
]);

const HEX_DIGIT = /[0-9a-fA-F]/;
const CSS_WHITESPACE = /[ \t\n\r\f]/;

/** Lexer state carried across the text parts of one template literal. */
export function createCssState() {
  return { comment: false, quote: undefined };
}

/**
 * Copies a CSS escape starting at `index` (the backslash) and returns the
 * index after it. A hex escape consumes up to six digits and then one
 * whitespace character, which belongs to the escape and must survive.
 */
function copyEscape(text, index, output) {
  output.push(text[index]);
  let next = index + 1;
  if (next >= text.length) return next;
  if (!HEX_DIGIT.test(text[next])) {
    output.push(text[next]);
    return next + 1;
  }
  const end = Math.min(next + 6, text.length);
  while (next < end && HEX_DIGIT.test(text[next])) {
    output.push(text[next]);
    next += 1;
  }
  if (next < text.length && CSS_WHITESPACE.test(text[next])) {
    // CRLF is one whitespace character to the CSS tokenizer.
    const width = text.startsWith("\r\n", next) ? 2 : 1;
    output.push(text.slice(next, next + width));
    next += width;
  }
  return next;
}

/**
 * Collapses CSS whitespace and comments in one piece of CSS text. `state`
 * carries an open comment or string from the previous text part of the same
 * template literal and is left describing where this part ends.
 */
export function compactCss(text, state = createCssState()) {
  const output = [];
  let pendingSpace = false;
  let index = 0;

  const flushSpace = () => {
    if (pendingSpace) output.push(" ");
    pendingSpace = false;
  };

  while (index < text.length) {
    if (state.comment) {
      const close = text.indexOf("*/", index);
      // The comment runs on into the next part of the template literal.
      if (close === -1) break;
      state.comment = false;
      index = close + 2;
      continue;
    }

    const character = text[index];
    if (state.quote !== undefined) {
      if (character === "\\") {
        index = copyEscape(text, index, output);
        continue;
      }
      output.push(character);
      if (character === state.quote) state.quote = undefined;
      index += 1;
      continue;
    }

    if (character === "/" && text[index + 1] === "*") {
      state.comment = true;
      pendingSpace = true;
      index += 2;
      continue;
    }
    if (CSS_WHITESPACE.test(character)) {
      pendingSpace = true;
      index += 1;
      continue;
    }

    flushSpace();
    if (character === "\\") {
      index = copyEscape(text, index, output);
      continue;
    }
    if (character === '"' || character === "'") state.quote = character;
    output.push(character);
    index += 1;
  }

  // The text that follows this part is not visible here, so trailing
  // whitespace keeps its single space rather than being dropped.
  flushSpace();
  return output.join("");
}

/** Escapes cooked text for the body of a template literal. */
function templateText(cooked) {
  return cooked
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}

function locationOf(sourceFile, position) {
  const { line, character } =
    sourceFile.getLineAndCharacterOfPosition(position);
  return `${sourceFile.fileName}:${String(line + 1)}:${String(character + 1)}`;
}

/** Fails when a CSS literal ends where the next text part cannot continue it. */
function assertClosed(sourceFile, node, state, what) {
  const inside = state.comment
    ? "comment"
    : state.quote === undefined
      ? undefined
      : "string";
  if (inside !== undefined) {
    throw new Error(
      `${locationOf(sourceFile, node.getStart(sourceFile))}: ${what} ends inside a CSS ${inside}, so its style text cannot be compacted safely.`,
    );
  }
}

function isModuleSpecifier(node) {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return parent.moduleSpecifier === node;
  }
  return (
    ts.isCallExpression(parent) &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword
  );
}

/**
 * The edits that compact every CSS literal in one compiled style module, in
 * source order. Each edit replaces `source.slice(start, end)` with `text`.
 * Literals whose text does not change produce no edit, so an already compact
 * module is left byte for byte as it was.
 */
export function styleTextEdits(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const edits = [];

  const replace = (node, text) => {
    const start = node.getStart(sourceFile);
    if (source.slice(start, node.end) !== text) {
      edits.push({ end: node.end, start, text });
    }
  };

  /** Compacts a literal that is one whole piece of CSS, written back by `quote`. */
  const compactWhole = (node, what, quote) => {
    const state = createCssState();
    const compacted = compactCss(node.text, state);
    assertClosed(sourceFile, node, state, what);
    if (compacted !== node.text) replace(node, quote(compacted));
  };

  const visit = (node) => {
    if (ts.isTaggedTemplateExpression(node)) {
      // A tag reads the raw text, which a rewrite of the cooked text changes.
      return;
    }
    if (ts.isStringLiteral(node)) {
      if (isModuleSpecifier(node)) return;
      compactWhole(node, "A string literal", JSON.stringify);
      return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      compactWhole(
        node,
        "A template literal",
        (text) => `\`${templateText(text)}\``,
      );
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const state = createCssState();
      const parts = [
        node.head,
        ...node.templateSpans.map((span) => span.literal),
      ];
      const texts = parts.map((part, index) => {
        if (index > 0 && state.comment) {
          throw new Error(
            `${locationOf(sourceFile, part.getStart(sourceFile))}: an interpolation sits inside a CSS comment, so its style text cannot be compacted safely.`,
          );
        }
        return compactCss(part.text, state);
      });
      assertClosed(sourceFile, node, state, "A template literal");
      parts.forEach((part, index) => {
        if (texts[index] === part.text) return;
        const open = index === 0 ? "`" : "}";
        const close = index === parts.length - 1 ? "`" : "${";
        replace(part, `${open}${templateText(texts[index])}${close}`);
      });
      for (const span of node.templateSpans) visit(span.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  // A template literal's parts are queued before the literals nested in its
  // interpolations, so the edits are put back into source order here.
  return edits.sort((left, right) => left.start - right.start);
}

/** Applies edits produced for `source`, which must not overlap. */
export function applyEdits(source, edits) {
  const parts = [];
  let position = 0;
  for (const edit of edits) {
    parts.push(source.slice(position, edit.start), edit.text);
    position = edit.end;
  }
  parts.push(source.slice(position));
  return parts.join("");
}

/**
 * Maps an offset in the original text to the rewritten one. An offset inside a
 * replaced range maps to the start of its replacement; source-map positions
 * never fall inside a literal, so that case exists only as a fallback.
 */
export function createOffsetMapper(edits) {
  return (offset) => {
    let shift = 0;
    for (const edit of edits) {
      if (offset < edit.start) break;
      if (offset < edit.end) return edit.start + shift;
      shift += edit.text.length - (edit.end - edit.start);
    }
    return offset + shift;
  };
}

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_VALUE = new Map([...BASE64].map((digit, value) => [digit, value]));
const VLQ_CONTINUATION = 32;
const VLQ_MASK = 31;
const VLQ_SHIFT = 5;

/** Decodes one source-map segment into its Base64 VLQ numbers. */
export function decodeVlq(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const digit of segment) {
    const decoded = BASE64_VALUE.get(digit);
    if (decoded === undefined) {
      throw new Error(`Invalid Base64 VLQ digit "${digit}" in "${segment}".`);
    }
    value += (decoded & VLQ_MASK) << shift;
    if (decoded & VLQ_CONTINUATION) {
      shift += VLQ_SHIFT;
      continue;
    }
    // The lowest bit carries the sign.
    values.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }
  if (shift !== 0) {
    throw new Error(`Truncated Base64 VLQ segment "${segment}".`);
  }
  return values;
}

/** Encodes numbers as one source-map segment. */
export function encodeVlq(values) {
  let segment = "";
  for (const number of values) {
    let value = number < 0 ? (-number << 1) | 1 : number << 1;
    do {
      let digit = value & VLQ_MASK;
      value >>>= VLQ_SHIFT;
      if (value > 0) digit |= VLQ_CONTINUATION;
      segment += BASE64[digit];
    } while (value > 0);
  }
  return segment;
}

function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

/** The zero-based line and column of an offset, from a line start table. */
function positionOf(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return { column: offset - starts[low], line: low };
}

/**
 * Rewrites a version 3 source map for `edits` applied to `source`. Every
 * generated position moves with the text around it; the original positions it
 * points at are unchanged, because the source files are unchanged.
 */
export function remapSourceMap(map, source, edits) {
  const oldStarts = lineStarts(source);
  const newStarts = lineStarts(applyEdits(source, edits));
  const mapOffset = createOffsetMapper(edits);

  // Absolute segments on their new lines. The source, line, column, and name
  // fields are deltas across the whole map, so they are decoded in order.
  const lines = Array.from({ length: newStarts.length }, () => []);
  const absolute = [0, 0, 0, 0];
  map.mappings.split(";").forEach((line, lineIndex) => {
    let column = 0;
    for (const segment of line.split(",")) {
      if (segment.length === 0) continue;
      const [columnDelta, ...rest] = decodeVlq(segment);
      column += columnDelta;
      const fields = rest.map((delta, index) => {
        absolute[index] += delta;
        return absolute[index];
      });
      const moved = positionOf(
        newStarts,
        mapOffset(oldStarts[lineIndex] + column),
      );
      lines[moved.line].push([moved.column, ...fields]);
    }
  });

  const previous = [0, 0, 0, 0];
  const mappings = lines
    .map((segments) => {
      let previousColumn = 0;
      return segments
        .sort((left, right) => left[0] - right[0])
        .map(([column, ...fields]) => {
          const deltas = [column - previousColumn];
          previousColumn = column;
          fields.forEach((value, index) => {
            deltas.push(value - previous[index]);
            previous[index] = value;
          });
          return encodeVlq(deltas);
        })
        .join(",");
    })
    .join(";")
    // Lines after the last segment carry nothing.
    .replace(/;+$/, "");
  return { ...map, mappings };
}

/**
 * The CSS token stream of a sheet, for comparing two sheets that should differ
 * only in layout. Comments produce no token, as in CSS itself; each run of
 * whitespace is one token; a string or an escape is one token; and every
 * other run of characters is one token, split wherever one of those sits.
 */
export function cssTokens(text) {
  const tokens = [];
  let run = "";
  const endRun = () => {
    if (run.length > 0) tokens.push(run);
    run = "";
  };

  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "/" && text[index + 1] === "*") {
      endRun();
      const close = text.indexOf("*/", index + 2);
      index = close === -1 ? text.length : close + 2;
      continue;
    }
    if (CSS_WHITESPACE.test(character)) {
      endRun();
      while (index < text.length && CSS_WHITESPACE.test(text[index])) {
        index += 1;
      }
      if (tokens.at(-1) !== " ") tokens.push(" ");
      continue;
    }
    if (character === '"' || character === "'") {
      endRun();
      let end = index + 1;
      while (end < text.length && text[end] !== character) {
        end += text[end] === "\\" ? 2 : 1;
      }
      tokens.push(text.slice(index, end + 1));
      index = end + 1;
      continue;
    }
    if (character === "\\") {
      endRun();
      const escaped = [];
      index = copyEscape(text, index, escaped);
      tokens.push(escaped.join(""));
      continue;
    }
    run += character;
    index += 1;
  }
  endRun();
  return tokens;
}

/** A line break or a comment left in compacted style text. */
const LAYOUT_LEFT_IN_TEXT = /[\n\r\f]|\/\*/;

/**
 * What separates the built style modules from the ones compiled from source,
 * one message per problem. The built text must be compact, and it must equal
 * the source text twice over: as a CSS token stream, which sees any change in
 * where whitespace falls, and after `normalize` (a CSS minifier), which sees a
 * change in meaning that token streams could miss.
 */
export function styleTextDifferences(sourceModules, builtModules, normalize) {
  const failures = [];
  const sourceIds = sourceModules.map(({ id }) => id);
  const builtIds = builtModules.map(({ id }) => id);
  if (sourceIds.join() !== builtIds.join()) {
    return [
      `The built style modules are ${builtIds.join(", ")}, but the source declares ${sourceIds.join(", ")}.`,
    ];
  }

  sourceModules.forEach((sourceModule, index) => {
    const { id } = sourceModule;
    const built = builtModules[index].styles;
    if (LAYOUT_LEFT_IN_TEXT.test(built)) {
      failures.push(
        `${id}: the built text still holds a line break or a comment, so the compaction step did not run.`,
      );
    }
    const expectedTokens = cssTokens(sourceModule.styles);
    const builtTokens = cssTokens(built);
    const firstDifference = expectedTokens.findIndex(
      (token, position) => token !== builtTokens[position],
    );
    if (
      firstDifference !== -1 ||
      expectedTokens.length !== builtTokens.length
    ) {
      const position =
        firstDifference === -1 ? expectedTokens.length : firstDifference;
      failures.push(
        `${id}: the built CSS tokens differ from the source at token ${String(position)} (${JSON.stringify(expectedTokens[position])} in the source, ${JSON.stringify(builtTokens[position])} built).`,
      );
    }
    if (normalize(sourceModule.styles) !== normalize(built)) {
      failures.push(
        `${id}: the built CSS normalizes to different rules than the source.`,
      );
    }
  });
  return failures;
}
