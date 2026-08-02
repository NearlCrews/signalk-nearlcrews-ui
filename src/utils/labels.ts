/**
 * Shared defaults for the accessible names of built-in actions, so every
 * component ships the same label with the same blank-falls-back behavior.
 */

/** Default accessible name announced while a button is loading. */
export const DEFAULT_LOADING_LABEL = "Working";

/** Default accessible name for a dismiss button. */
export const DEFAULT_DISMISS_LABEL = "Dismiss";

/** Trims a caller-supplied label, falling back when it is missing or blank. */
export function resolveLabel(
  label: string | undefined,
  fallback: string,
): string {
  return (label?.trim() ?? "") || fallback;
}
