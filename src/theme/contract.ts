/**
 * The one localStorage key every copy of the library shares, so panels from
 * different versions on one Signal K Admin page agree on the theme. The
 * version suffix belongs to the stored value's shape, not to the package.
 */
export const THEME_STORAGE_KEY = "signalk-nearlcrews-ui.theme.v1";

/**
 * The themes a panel can be set to, in the order the selector offers them.
 *
 * - `"auto"` follows a host theme marker on an ancestor, and uses the Light
 *   palette in a host that sets none, which Signal K Admin currently does not.
 * - `"system"` follows the device's own light or dark preference.
 * - `"light"`, `"dark"`, and `"night"` are explicit. Night preserves dark
 *   adaptation at a helm, so it holds red and never brightens the surface.
 *
 * The themes section of the design contract records what each one resolves to.
 */
export const THEME_CHOICES = [
  "auto",
  "system",
  "light",
  "dark",
  "night",
] as const;

/** One of the five themes in {@link THEME_CHOICES}. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/**
 * Narrows a value read from shared storage, a host message, or a consumer's
 * own configuration to a theme this version offers. An unrecognized value
 * comes from another version and is not adopted.
 */
export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    typeof value === "string" &&
    (THEME_CHOICES as readonly string[]).includes(value)
  );
}
