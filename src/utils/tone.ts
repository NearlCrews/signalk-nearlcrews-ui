export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Tones that carry a meaning a neutral presentation cannot convey. */
export type SemanticTone = Exclude<StatusTone, "neutral">;

/**
 * A glyph per semantic tone, so tone is never the only visual signal. Rendered
 * decoratively, because the adjacent visually hidden label carries the meaning.
 */
export const TONE_GLYPHS: Readonly<Record<SemanticTone, string>> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "×",
};

/** Default accessible names for each semantic tone. Callers may override them. */
export const TONE_LABELS: Readonly<Record<SemanticTone, string>> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

export function isSemanticTone(tone: StatusTone): tone is SemanticTone {
  return tone !== "neutral";
}

/**
 * Resolves the accessible name announced for a semantic tone. A caller label
 * wins when it carries text; anything blank falls back to the default name so
 * the tone is never announced as nothing.
 */
export function resolveToneLabel(
  tone: SemanticTone,
  toneLabel: string | undefined,
): string {
  return (toneLabel?.trim() ?? "") || TONE_LABELS[tone];
}
