/**
 * Wording helpers for the short phrases a panel builds at runtime.
 *
 * They are house rules rather than locale rules: the count and the list read
 * the way this package's own copy reads, so a plugin panel and the components
 * it renders never disagree about a plural or a serial comma.
 */

/**
 * Counts a noun: "1 error", "3 errors". A noun the trailing "s" does not
 * pluralize passes its own plural, for example
 * `formatCount(2, "match", "matches")`.
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string,
): string {
  const noun = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${String(count)} ${noun}`;
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
 */
export function asSentence(text: string): string {
  return endsSentence(text) ? text : `${text}.`;
}

/**
 * Parts read one after another, each closing its own sentence and blank parts
 * dropped, so a title and the description under it are announced as two
 * sentences however either one is punctuated.
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
 * "a, b, and c". `Intl.ListFormat` is deliberately not used, because the
 * serial comma is this package's rule rather than a locale's preference and
 * because a locale argument would have to come from somewhere a panel does
 * not have.
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
