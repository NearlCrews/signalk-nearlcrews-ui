/**
 * The leading tone bar Banner introduced, shared with every surface that
 * marks itself with a tone (Card). A fragment rather than a style module: it
 * is interpolated where each block's rules live, so module order is unchanged.
 */

const SEMANTIC_TONES = ["info", "success", "warning", "danger"] as const;

/** Rules painting `.${block}--<tone>` with a leading bar in the tone color. */
export function toneAccentBarRules(block: string): string {
  return SEMANTIC_TONES.map(
    (tone) =>
      `.${block}--${tone} { border-inline-start-color: var(--snui-color-${tone}); }`,
  ).join("\n");
}

/** Declarations for the bar itself, applied to the block. */
export const TONE_ACCENT_BAR_DECLARATIONS = [
  "  border: 1px solid var(--snui-color-border);",
  "  border-inline-start-width: 0.3rem;",
].join("\n");
