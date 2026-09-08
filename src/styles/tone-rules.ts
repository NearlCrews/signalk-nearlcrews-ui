/**
 * Tone rule generators. Every block that paints itself from a tone token does
 * it through `toneColorRules`, so the tone list is stated once and adding a
 * tone reaches every surface at the same time. Fragments rather than a style
 * module: each result is interpolated where that block's rules live, so module
 * order is unchanged.
 */

import { SEMANTIC_TONES, type SemanticTone } from "../utils/tone.js";

/**
 * One rule per semantic tone setting `property` to that tone's color token.
 * `selector` builds the full selector for a tone, so a block can paint itself
 * or a descendant.
 */
export function toneColorRules(
  selector: (tone: SemanticTone) => string,
  property: string,
): string {
  return SEMANTIC_TONES.map(
    (tone) => `${selector(tone)} { ${property}: var(--snui-color-${tone}); }`,
  ).join("\n");
}

/**
 * The leading tone bar Banner introduced, shared with every surface that marks
 * itself with a tone (Card, Toast). The prefix lets a block offer a decorative
 * variant (`accent-`) beside its semantic one.
 */
export function toneAccentBarRules(block: string, modifierPrefix = ""): string {
  return toneColorRules(
    (tone) => `.${block}--${modifierPrefix}${tone}`,
    "border-inline-start-color",
  );
}

/** Declarations for the bar itself, applied to the block. */
export const TONE_ACCENT_BAR_DECLARATIONS = [
  "  border: 1px solid var(--snui-color-border);",
  "  border-inline-start-width: 0.3rem;",
].join("\n");

/**
 * Dot shape per semantic tone. The info radius is proportional so the rounded
 * square never clamps to a circle at small dot sizes, which would make info
 * and neutral identical without color.
 */
const TONE_DOT_SHAPES: Readonly<Record<SemanticTone, string>> = {
  info: "  border-radius: 20%;",
  success:
    "  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);\n  border-radius: 0;",
  warning:
    "  clip-path: polygon(50% 0, 100% 100%, 0 100%);\n  border-radius: 0;",
  danger:
    "  clip-path: polygon(\n    50% 0,\n    100% 25%,\n    100% 75%,\n    50% 100%,\n    0 75%,\n    0 25%\n  );\n  border-radius: 0;",
};

/**
 * Gives each tone a distinct dot shape, so a state never depends on color
 * alone for someone who cannot distinguish the hues. The block owns the tone
 * modifier and the dot element, so indicators and toasts share one set of
 * shapes.
 */
export function toneDotShapeRules(block: string, dotClass: string): string {
  return SEMANTIC_TONES.map(
    (tone) => `.${block}--${tone} .${dotClass} {\n${TONE_DOT_SHAPES[tone]}\n}`,
  ).join("\n\n");
}
