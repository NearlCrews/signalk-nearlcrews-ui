/**
 * Wording helpers for the short phrases a panel builds at runtime.
 *
 * They are English house rules rather than locale rules: the plural and the
 * serial comma read the way this package's own copy reads, so a plugin panel
 * and the components it renders never disagree about either. Only the digits
 * of a count follow a locale.
 */

import { createFormatterCache, type PanelLocale } from "./intl.js";

export interface FormatCountOptions {
  /**
   * BCP 47 locale or list for the digits, usually the panel's own from
   * `usePanelLocale()`. Left unset, the runtime default locale groups them. An
   * unsupported or malformed value falls back to that default instead of
   * throwing.
   */
  readonly locale?: PanelLocale | undefined;
}

const numberFormatters = createFormatterCache<Intl.NumberFormat>();

function buildNumberFormat(
  locales: readonly string[] | undefined,
): Intl.NumberFormat {
  return new Intl.NumberFormat(locales);
}

/**
 * Counts a noun: "1 error", "3 errors", "1,234 charts". A noun the trailing
 * "s" does not pluralize passes its own plural, for example
 * `formatCount(2, "match", "matches")`. The noun stays English; the digits are
 * grouped the way `options.locale` groups them.
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string,
  options?: FormatCountOptions,
): string {
  const noun = count === 1 ? singular : (plural ?? `${singular}s`);
  const formatter = numberFormatters(options?.locale, "", buildNumberFormat);
  // Negative zero reads as zero: Intl prints its sign, which no count has.
  return `${formatter.format(count === 0 ? 0 : count)} ${noun}`;
}

/**
 * Sentence punctuation a phrase may already end with. A stop is added to text
 * that ends in none of these, so a caller whose own wording ends in one is
 * never announced as "Caution!.".
 */
const SENTENCE_ENDINGS = new Set([".", "!", "?", "…"]);

/** Whether text already closes a sentence. */
function endsSentence(text: string): boolean {
  return SENTENCE_ENDINGS.has(text.slice(-1));
}

/**
 * Text as one sentence, with a full stop added unless it closes itself. Used
 * for anything read straight into the words after it, where two sentences run
 * together without one.
 *
 * @internal
 */
export function asSentence(text: string): string {
  return endsSentence(text) ? text : `${text}.`;
}

/**
 * Parts read one after another, each closing its own sentence and blank parts
 * dropped, so a title and the description under it are announced as two
 * sentences however either one is punctuated.
 *
 * @internal
 */
export function joinSentences(parts: readonly string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(asSentence)
    .join(" ");
}

/**
 * Joins words into a phrase with a serial comma: "a", "a and b", and
 * "a, b, and c". `Intl.ListFormat` is deliberately not used: the serial comma
 * and the English conjunction are this package's house rule, and a locale's
 * list punctuation around English words would mix two languages in one
 * phrase.
 */
export function joinList(
  items: readonly string[],
  conjunction = "and",
): string {
  if (items.length <= 1) return items[0] ?? "";
  const last = items[items.length - 1] ?? "";
  const leading = items.slice(0, -1);
  return leading.length === 1
    ? `${leading[0] ?? ""} ${conjunction} ${last}`
    : `${leading.join(", ")}, ${conjunction} ${last}`;
}
