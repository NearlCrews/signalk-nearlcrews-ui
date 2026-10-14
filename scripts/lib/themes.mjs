/**
 * The explicit themes the showcase is captured and tested in, in the order the
 * README shows them. The screenshot script, the package contract, and the
 * browser specs all read this list and derive the theme selector's label with
 * {@link themeLabel}, so a theme is added in one place.
 */
export const THEME_IDS = Object.freeze(["light", "dark", "night"]);

/** The accessible name of a theme's option in the panel's theme selector. */
export function themeLabel(id) {
  return id[0].toUpperCase() + id.slice(1);
}
