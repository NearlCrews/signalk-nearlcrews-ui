/**
 * Regular-expression helpers for the shipped CLI and this repository's own
 * check scripts. They live beside the CLI rather than in `scripts/lib` because
 * the published package ships `bin` and not `scripts`.
 *
 * `RegExp.escape` would do this, but it landed after the Node floor this
 * package supports, so the escaping is written out here instead.
 */
const SPECIAL = /[\\^$.*+?()[\]{}|]/g;

/** Quotes a value so it matches literally inside a pattern. */
export function escapeRegExp(value) {
  return value.replace(SPECIAL, "\\$&");
}
