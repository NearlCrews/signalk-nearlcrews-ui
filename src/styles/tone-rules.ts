/**
 * Tone rule generators. Every block that paints itself from a tone token does
 * it through `toneColorRules`, so the tone list is stated once and adding a
 * tone reaches every surface at the same time. Fragments rather than a style
 * module: each result is interpolated where that block's rules live, so module
 * order is unchanged.
 */

import type { SemanticTone } from "../utils/tone.js";
import { TONE_BAR_WIDTH } from "./fragments.js";

/**
 * The semantic tones in the order every rule set lists them. Checked against
 * the tone union rather than restating it, so a typo cannot compile.
 */
const SEMANTIC_TONES = [
  "info",
  "success",
  "warning",
  "danger",
] as const satisfies readonly SemanticTone[];

/**
 * The modifier class a block carries for one tone. Every generator below
 * builds its selectors from this, so a block's tone classes are spelled once.
 */
function toneModifier(
  block: string,
  tone: SemanticTone,
  modifierPrefix: string,
): string {
  return `.${block}--${modifierPrefix}${tone}`;
}

/**
 * The comma-joined selector group for one block, so a rule shared by every
 * tone lists them from the same source the per-tone rules come from.
 * `modifierPrefix` matches {@link toneAccentBarRules}, so a block can name its
 * decorative variant.
 */
export function toneSelectorList(block: string, modifierPrefix = ""): string {
  return SEMANTIC_TONES.map((tone) =>
    toneModifier(block, tone, modifierPrefix),
  ).join(",\n");
}

/**
 * One rule per semantic tone setting `property` to that tone's color token.
 * `selector` builds the full selector for a tone, so a block can paint itself
 * or a descendant.
 */
function toneColorRules(
  selector: (tone: SemanticTone) => string,
  property: string,
): string {
  return SEMANTIC_TONES.map(
    (tone) => `${selector(tone)} { ${property}: var(--snui-color-${tone}); }`,
  ).join("\n");
}

/**
 * One rule per semantic tone painting the toned block itself, the shape a
 * badge or a line of text takes when the tone colors the whole element. The
 * prefix lets a block offer a decorative variant (`accent-`) beside its
 * semantic one.
 */
export function toneBlockColorRules(
  block: string,
  property = "color",
  modifierPrefix = "",
): string {
  return toneColorRules(
    (tone) => toneModifier(block, tone, modifierPrefix),
    property,
  );
}

/**
 * The leading tone bar Banner introduced, shared with every surface that marks
 * itself with a tone (Card, Toast). The prefix lets a block offer a decorative
 * variant (`accent-`) beside its semantic one.
 */
export function toneAccentBarRules(block: string, modifierPrefix = ""): string {
  return toneBlockColorRules(
    block,
    "border-inline-start-color",
    modifierPrefix,
  );
}

/** Declarations for the bar itself, applied to the block. */
export const TONE_ACCENT_BAR_DECLARATIONS = [
  "  border: 1px solid var(--snui-color-border);",
  `  border-inline-start-width: ${TONE_BAR_WIDTH};`,
].join("\n");

/**
 * The whole tone bar for one block: the bar declarations on every toned
 * modifier, then one color rule per tone. `modifierPrefix` names a decorative
 * variant, as it does for {@link toneAccentBarRules}.
 */
export function toneAccentBar(block: string, modifierPrefix = ""): string {
  return `${toneSelectorList(block, modifierPrefix)} {
${TONE_ACCENT_BAR_DECLARATIONS}
}

${toneAccentBarRules(block, modifierPrefix)}`;
}

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
    (tone) =>
      `${toneModifier(block, tone, "")} .${dotClass} {\n${TONE_DOT_SHAPES[tone]}\n}`,
  ).join("\n");
}

/**
 * One rule per semantic tone painting a descendant of a toned block, the shape
 * a surface uses when the tone colors a glyph, a mark, or a fill inside it
 * rather than the block itself. `modifierPrefix` is the part of the tone
 * modifier ahead of the tone name, for a block whose modifiers carry one.
 */
export function toneDescendantColorRules(
  block: string,
  descendant: string,
  property = "color",
  modifierPrefix = "",
): string {
  return toneColorRules(
    (tone) => `${toneModifier(block, tone, modifierPrefix)} ${descendant}`,
    property,
  );
}
