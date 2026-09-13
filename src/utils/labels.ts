/**
 * Shared defaults for the accessible names of built-in actions, so every
 * component ships the same label with the same blank-falls-back behavior.
 */

/** Default accessible name announced while a button is loading. */
export const DEFAULT_LOADING_LABEL = "Working";

/** Default accessible name for a dismiss button. */
export const DEFAULT_DISMISS_LABEL = "Dismiss";

/** Default accessible name for the action that reveals a concealed value. */
export const DEFAULT_SHOW_LABEL = "Show";

/** Default accessible name for the action that conceals a revealed value. */
export const DEFAULT_HIDE_LABEL = "Hide";

/**
 * A caller-supplied string with its surrounding space removed, and the empty
 * string for one that was never given. Blank text reads the same as an absent
 * value everywhere in the package, so the rule is written once here.
 */
export function trimmedText(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Whether a caller-supplied string carries text of its own. */
export function hasText(value: string | undefined): boolean {
  return trimmedText(value) !== "";
}

/** Trims a caller-supplied label, falling back when it is missing or blank. */
export function resolveLabel(
  label: string | undefined,
  fallback: string,
): string {
  return trimmedText(label) || fallback;
}

/**
 * A label resolved in the order a panel expects: the caller's own prop, then
 * the panel's label bundle, then the package's English default. Blank text
 * reads as absent at each step, so one blank entry in a partial translation
 * does not blank the label.
 */
export function resolveBundledLabel(
  label: string | undefined,
  bundled: string | undefined,
  fallback: string,
): string {
  return trimmedText(label) || trimmedText(bundled) || fallback;
}
