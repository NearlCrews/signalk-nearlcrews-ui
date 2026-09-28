/**
 * A small reader for the CSS the consumer checks inspect: the stylesheets a
 * built remote ships beside its entry, and the CSS modules a panel's source
 * imports. Both checks need the same three things out of a sheet, the style
 * rules with their selectors, the at-rules, and the declarations, so they
 * share this one reader.
 *
 * It is not a CSS parser and does not try to be one. The command ships in the
 * package tarball, so it carries no parser dependency, and what the checks ask
 * of a sheet is narrow enough to answer by walking its blocks: comments are
 * removed, string contents are blanked so a quoted brace or semicolon cannot
 * end a block, and parentheses are tracked so `url(...)` and `:is(...)` keep
 * their commas and semicolons.
 */

/**
 * The sheet with its comments removed and every string's contents replaced by
 * spaces, the quotes kept. Offsets do not survive, which none of the checks
 * need, but token boundaries do: a comment becomes one space.
 */
export function maskCss(source) {
  let masked = "";
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      masked += " ";
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (character === '"' || character === "'") {
      let end = index + 1;
      while (end < source.length && source[end] !== character) {
        // An escaped character, the quote included, stays inside the string.
        end += source[end] === "\\" ? 2 : 1;
      }
      masked += `${character}${" ".repeat(Math.max(0, Math.min(end, source.length) - index - 1))}${character}`;
      index = end + 1;
      continue;
    }
    masked += character;
    index += 1;
  }
  return masked;
}

/**
 * Splits a selector list at its top-level commas, so `:is(.a, .b)` stays one
 * selector. Empty entries are dropped.
 */
export function splitSelectorList(prelude) {
  const selectors = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < prelude.length; index += 1) {
    const character = prelude[index];
    if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) {
      selectors.push(prelude.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start));
  return selectors.map((selector) => selector.trim()).filter(Boolean);
}

/** One `property: value` statement, or undefined for anything else. */
function readDeclaration(statement) {
  const colon = statement.indexOf(":");
  if (colon <= 0) return undefined;
  const property = statement.slice(0, colon).trim();
  if (!/^-{0,2}[A-Za-z_][\w-]*$/.test(property)) return undefined;
  return { property, value: statement.slice(colon + 1).trim() };
}

/**
 * Reads a stylesheet's blocks. Returns the style rules (each with its
 * selectors, the preludes of the at-rules around it, whether it sits inside
 * another style rule, and its own declarations), every at-rule with its name
 * and prelude, and every declaration in the sheet.
 */
export function readCss(source) {
  const text = maskCss(source);
  const rules = [];
  const atRules = [];
  const declarations = [];
  const stack = [];
  let start = 0;
  let parentheses = 0;

  const addDeclaration = (statement) => {
    const declaration = readDeclaration(statement);
    if (declaration === undefined) return;
    declarations.push(declaration);
    stack.at(-1)?.rule?.declarations.push(declaration);
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    if (parentheses > 0) continue;

    if (character === "{") {
      const prelude = text.slice(start, index).trim();
      start = index + 1;
      if (prelude.startsWith("@")) {
        const name = /^@([\w-]+)/.exec(prelude)?.[1] ?? "";
        const atRule = {
          name,
          prelude: prelude.slice(name.length + 1).trim(),
        };
        atRules.push(atRule);
        stack.push({ atRule });
        continue;
      }
      const rule = {
        atRules: stack
          .filter((frame) => frame.atRule !== undefined)
          .map((frame) => `@${frame.atRule.name} ${frame.atRule.prelude}`),
        declarations: [],
        nested: stack.some((frame) => frame.rule !== undefined),
        selectors: splitSelectorList(prelude),
      };
      rules.push(rule);
      stack.push({ rule });
    } else if (character === ";") {
      const statement = text.slice(start, index).trim();
      start = index + 1;
      if (statement.startsWith("@")) {
        const name = /^@([\w-]+)/.exec(statement)?.[1] ?? "";
        atRules.push({
          name,
          prelude: statement.slice(name.length + 1).trim(),
        });
      } else {
        addDeclaration(statement);
      }
    } else if (character === "}") {
      // The last declaration of a block may omit its semicolon.
      addDeclaration(text.slice(start, index).trim());
      start = index + 1;
      stack.pop();
    }
  }
  return { atRules, declarations, rules };
}

/**
 * The class a selector names when the whole selector is that one class,
 * optionally with pseudo-elements, which add no specificity a scoped package
 * rule lacks. `.row` and `.row::after` qualify; `.row.row`, `.row:hover`, and
 * `.list .row` do not. Undefined for every other selector.
 */
export function singleClassOf(selector) {
  return /^\.(-?[_a-zA-Z][\w-]*)(?:::[\w-]+(?:\([^)]*\))?)*$/.exec(
    selector.trim(),
  )?.[1];
}
