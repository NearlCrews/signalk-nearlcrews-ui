/**
 * Shared defaults for the accessible names of built-in actions, so every
 * component ships the same label with the same blank-falls-back behavior.
 */

import type { ReactNode } from "react";

import { hasReactContent } from "./react-node.js";

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

/**
 * The same order for a slot whose override is rendered content rather than a
 * string. An override carrying no rendered content reads as absent, which is
 * the content-shaped spelling of the blank rule above, and the bundle and the
 * fallback resolve exactly as they do for a label.
 */
export function resolveBundledContent(
  content: ReactNode,
  bundled: string | undefined,
  fallback: ReactNode,
): ReactNode {
  if (hasReactContent(content)) return content;
  return trimmedText(bundled) || fallback;
}

/**
 * A whole group of labels resolved at once, so a component that ships several
 * defaults states the order once rather than per key. A key added to the
 * defaults is resolved without a matching line to remember, which is what
 * keeps a new status from silently losing its translation.
 */
export function resolveBundledLabels<K extends string>(
  defaults: Readonly<Record<K, string>>,
  overrides: Readonly<Partial<Record<K, string | undefined>>> | undefined,
  bundled: Readonly<Partial<Record<K, string | undefined>>> | undefined,
): Record<K, string> {
  const resolved = {} as Record<K, string>;
  for (const key of Object.keys(defaults) as K[]) {
    resolved[key] = resolveBundledLabel(
      overrides?.[key],
      bundled?.[key],
      defaults[key],
    );
  }
  return resolved;
}
