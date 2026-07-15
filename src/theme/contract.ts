export const THEME_STORAGE_KEY = "signalk-nearlcrews-ui.theme.v1";

export const THEME_CHOICES = ["auto", "light", "dark", "night"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    typeof value === "string" &&
    (THEME_CHOICES as readonly string[]).includes(value)
  );
}
