/**
 * Regular-expression helpers for the validation scripts.
 *
 * `RegExp.escape` would do this, but it landed after the Node floor this
 * repository supports, so the escaping is written out here instead.
 */
const SPECIAL = /[\\^$.*+?()[\]{}|]/g;

/** Quotes a value so it matches literally inside a pattern. */
export function escapeRegExp(value) {
  return value.replace(SPECIAL, "\\$&");
}
