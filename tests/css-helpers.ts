/** Helpers for the specs that read the generated stylesheets as text. */

import { expect } from "vitest";

import { STYLE_MODULES } from "../src/styles/modules.js";

/** Every module's CSS, root first, for checks that span the whole delivery. */
export const ALL_MODULE_STYLES = STYLE_MODULES.map(
  (module) => module.styles,
).join("\n");

/**
 * Extracts the body of the first rule whose selector exactly matches. The
 * opening brace is part of the search, because the base root selector is a
 * prefix of every qualified theme selector and a bare substring search would
 * read whichever of them came first.
 */
export function ruleBody(styles: string, selector: string): string {
  const opening = `${selector} {`;
  const start = styles.indexOf(opening);
  expect(start, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
  const open = start + opening.length - 1;
  let depth = 0;
  for (let index = open; index < styles.length; index += 1) {
    const char = styles[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return styles.slice(open + 1, index);
    }
  }
  throw new Error(`unterminated rule for ${selector}`);
}
