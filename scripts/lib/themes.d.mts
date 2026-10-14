/*
 * Types for themes.mjs, which the Playwright specs import.
 */

export type ThemeId = "light" | "dark" | "night";

/** A theme option's accessible name in the panel's theme selector. */
export type ThemeLabel = "Light" | "Dark" | "Night";

export const THEME_IDS: readonly ThemeId[];

export function themeLabel(id: ThemeId): ThemeLabel;
