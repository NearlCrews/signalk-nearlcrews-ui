/** Helpers for the specs that read the generated stylesheets as text. */

import { expect } from "vitest";

import { STYLE_MODULES } from "../src/styles/modules.js";
import type { SemanticTone } from "../src/utils/tone.js";
import { ROOT_SELECTOR } from "../src/version.js";

/** Every module's CSS, root first, for checks that span the whole delivery. */
export const ALL_MODULE_STYLES = STYLE_MODULES.map(
  (module) => module.styles,
).join("\n");

/** The `@scope` prelude that scopeStyles writes ahead of a module's scoped rules. */
export const MODULE_SCOPE_PRELUDE = `@scope (${ROOT_SELECTOR}) to ([data-snui-version])`;

/** The rules of one style module, by its id. */
export function moduleStyles(id: string): string {
  const module = STYLE_MODULES.find((candidate) => candidate.id === id);
  if (module === undefined) throw new Error(`No style module named ${id}.`);
  return module.styles;
}

/**
 * The tones that carry a meaning, written out here rather than read from the
 * source, so the specs that walk them pin the list on their own.
 */
export const SEMANTIC_TONES = [
  "info",
  "success",
  "warning",
  "danger",
] as const satisfies readonly SemanticTone[];

/** The selector of the token block an explicit theme choice turns on. */
export function themeSelector(theme: string): string {
  return `${ROOT_SELECTOR}[data-snui-theme="${theme}"]`;
}

/** A sheet with its comments removed, so a scan reads the rules alone. */
export function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The sheet with every run of whitespace collapsed, so an assertion reads the
 * rule rather than the formatter's line breaks and indentation.
 */
export function normalizedCss(css: string): string {
  return css.replace(/\s+/g, " ");
}

/** Every `snui-` class name a stylesheet mentions. */
export function classNamesIn(css: string): Set<string> {
  return new Set(
    [...css.matchAll(/\.(snui-[a-z0-9_-]+)/g)].map((match) => match[1] ?? ""),
  );
}

/**
 * The sheet from `marker` on, usually an at-rule prelude, so a rule the sheet
 * also writes earlier is read inside that block. A missing marker fails by
 * name rather than handing the next reader the wrong text.
 */
export function stylesFrom(styles: string, marker: string): string {
  const start = styles.indexOf(marker);
  expect(start, `no ${marker} block`).toBeGreaterThanOrEqual(0);
  return styles.slice(start);
}

/**
 * Extracts the body of the first block that opens with `opening`, braces
 * matched. The opening may be a selector prefix or an at-rule prelude: the
 * body starts at the first brace that follows it.
 */
export function blockAt(styles: string, opening: string): string {
  const start = styles.indexOf(opening);
  expect(start, `no block opens with ${opening}`).toBeGreaterThanOrEqual(0);
  const open = styles.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < styles.length; index += 1) {
    const char = styles[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return styles.slice(open + 1, index);
    }
  }
  throw new Error(`unterminated block ${opening}`);
}

/**
 * Extracts the body of the first rule whose selector exactly matches. The
 * opening brace is part of the search, because the base root selector is a
 * prefix of every qualified theme selector and a bare substring search would
 * read whichever of them came first.
 */
export function ruleBody(styles: string, selector: string): string {
  return blockAt(styles, `${selector} {`);
}
