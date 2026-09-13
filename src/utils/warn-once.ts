import { isDevelopment } from "./environment.js";

/**
 * Keys already reported, so a mis-wired value warns once rather than once per
 * render. The dedupe is best effort: the set is capped and cleared when it
 * fills, because it exists only to keep a development console readable, not
 * to promise one warning per value for the life of the page.
 */
const REPORTED_KEYS = new Set<string>();

/** How many distinct keys the dedupe remembers before starting again. */
const REPORTED_KEY_LIMIT = 100;

/**
 * Writes a development-only warning the first time a key produces one.
 *
 * A production build reports nothing and never records a key, so the set
 * stays empty there. Pass a key that identifies the offending value, such as
 * the rejected href or the control's own label, so two different mistakes are
 * both reported.
 */
export function warnOnce(key: string, message: string): void {
  if (!isDevelopment() || REPORTED_KEYS.has(key)) return;
  if (REPORTED_KEYS.size >= REPORTED_KEY_LIMIT) REPORTED_KEYS.clear();
  REPORTED_KEYS.add(key);
  console.warn(message);
}
