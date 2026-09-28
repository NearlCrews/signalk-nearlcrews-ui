import { SPACE_SCALE } from "../utils/variants.js";
import {
  GLYPH_BASELINE_NUDGE,
  NARROW_PANEL_QUERY,
  PROSE_MEASURE_DECLARATION,
  SURFACE_DECLARATIONS,
  TONE_GLYPH_GAP_EM,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import {
  toneAccentBar,
  toneBlockColorRules,
  toneDescendantColorRules,
  toneSelectorList,
} from "./tone-rules.js";

/*
 * Internal geometry rather than tokens: the pill's own height and vertical
 * padding are what this shape needs rather than values a consumer themes.
 */
const BADGE_MIN_HEIGHT = "1.75rem";
const BADGE_PADDING_BLOCK = "0.125rem";

/*
 * A stack item that takes up room. Hidden items and the package's out-of-flow
 * shells are left out: the visually hidden class, and the announcing banner
 * and status that wait empty, which leave the flow by their own rules rather
 * than the class. A bare :empty is not used, because it would also drop an
 * image or any other void item. The shells sit inside :where(), because
 * :not() takes the weight of its heaviest argument, and the exclusions should
 * add matches rather than make the divider rule harder to override.
 */
const SHOWN_ITEM =
  ":not([hidden], .snui-visually-hidden):not(:where(.snui-banner:empty, .snui-status:empty, .snui-status:has(> .snui-status__region:only-child)))";

// The prop type and the rules come from one scale, so a new step reaches both.
const GAP_RULES = SPACE_SCALE.map((space) => {
  const scale = String(space);
  return `
.snui-stack--gap-${scale},
.snui-cluster--gap-${scale} {
  gap: var(--snui-space-${scale});
}

.snui-stack--divided.snui-stack--gap-${scale} {
  --snui-stack-divider-space: calc(var(--snui-space-${scale}) / 2);
}`;
}).join("\n");

export const LAYOUT_STYLES = scopeStyles(`
/* Stacks, clusters, and metric grids may render as lists; strip list chrome. */
.snui-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.snui-cluster {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

${GAP_RULES}

/*
 * A divided stack rules off each item from the one before it. The step is
 * split around the rule, half as the row gap above and half as the item's own
 * padding below, so the rhythm matches an undivided stack of the same step.
 * An item the page hides, or one taken out of the flow like a live region or
 * an announcing component waiting empty, draws no rule and does not count as
 * the item a rule follows.
 */
.snui-stack.snui-stack--divided {
  row-gap: var(--snui-stack-divider-space);
}

.snui-stack--divided > ${SHOWN_ITEM} ~ ${SHOWN_ITEM} {
  padding-block-start: var(--snui-stack-divider-space);
  border-block-start: 1px solid var(--snui-color-border-subtle);
}

/*
 * A closed disclosure panel spread onto one of these carries the hidden
 * attribute, whose user-agent rule loses to a class rule of the same
 * specificity, so the panel would stay on screen and in the tab order.
 */
.snui-stack[hidden],
.snui-cluster[hidden],
.snui-card[hidden],
.snui-metric-grid[hidden] {
  display: none;
}

.snui-layout--align-start { align-items: flex-start; }
.snui-layout--align-center { align-items: center; }
.snui-layout--align-end { align-items: flex-end; }
.snui-layout--align-stretch { align-items: stretch; }

/*
 * A stack is a single-column grid, where each row is already its item's
 * height, so align-items has nothing to do: the axis a caller means on a
 * vertical stack is the inline one, which justify-items owns.
 */
.snui-stack.snui-layout--align-start { justify-items: start; }
.snui-stack.snui-layout--align-center { justify-items: center; }
.snui-stack.snui-layout--align-end { justify-items: end; }
.snui-stack.snui-layout--align-stretch { justify-items: stretch; }
.snui-layout--justify-start { justify-content: flex-start; }
.snui-layout--justify-center { justify-content: center; }
.snui-layout--justify-end { justify-content: flex-end; }
.snui-layout--justify-between { justify-content: space-between; }
.snui-layout--justify-around { justify-content: space-around; }
.snui-layout--justify-evenly { justify-content: space-evenly; }

/*
 * The card is a grid so one gap owns the rhythm between header, body, and
 * footer; the slots carry padding and a rule, never a sibling margin.
 */
.snui-card {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-3);
  padding: var(--snui-space-4);
${SURFACE_DECLARATIONS}
  box-shadow: var(--snui-shadow-raised);
}

.snui-card--compact {
  gap: var(--snui-space-2);
  padding: var(--snui-space-3);
}

/*
 * Flush draws no chrome of its own, so it drops the row gap with the padding.
 * A consumer reaching for it is placing its own surface in the card, and a gap
 * it never asked for offsets that surface from the edge it was aligned to. One
 * is still available to a card that wants it.
 */
.snui-card--flush {
  gap: 0;
  padding: 0;
}

.snui-card__header {
  min-width: 0;
  text-wrap: balance;
  padding-block-end: var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border-subtle);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
}

/*
 * The rule spans the card like the header's; only the text inside keeps to
 * the prose measure, since a measure on the ruled box cut the rule off partway
 * across a wide card. The measure also caps the width a long footnote asks of
 * a card that sizes to its content.
 */
.snui-card__footer {
  min-width: 0;
  padding-block-start: var(--snui-space-3);
  border-block-start: 1px solid var(--snui-color-border-subtle);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-card__footer-content {
${PROSE_MEASURE_DECLARATION}
}

.snui-card--compact > .snui-card__header {
  padding-block-end: var(--snui-space-2);
}

.snui-card--compact > .snui-card__footer {
  padding-block-start: var(--snui-space-2);
}

/* A toned card paints the Banner accent bar and carries the tone glyph. */
${toneAccentBar("snui-card")}

/*
 * A card with a decorative accent paints the same bar without a glyph or an
 * announcement, for a row whose meaning another element already announces.
 */
${toneAccentBar("snui-card", "accent-")}

.snui-card__tone-glyph {
  vertical-align: middle;
}

/*
 * The body of a headerless toned card. Flow root rather than a grid row, so
 * the floated glyph sits on the first line of the content it marks and stays
 * contained even when that content is shorter than the glyph.
 */
.snui-card__body {
  display: flow-root;
  min-width: 0;
}

.snui-card__body > .snui-card__tone-glyph {
  float: inline-start;
  /* The same optical nudge the checkbox box takes onto a line of text. */
  margin-block-start: ${GLYPH_BASELINE_NUDGE};
}

.snui-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(var(--snui-grid-track-min), 100%), 1fr));
  gap: var(--snui-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.snui-metric {
  min-width: 0;
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border-subtle);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

.snui-metric__label {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

/* Live values tick over; tabular digits keep the layout from shifting. */
.snui-metric__value {
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text);
  font-size: var(--snui-font-size-lg);
  font-variant-numeric: tabular-nums;
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/*
 * An announcing value stays mounted so a screen reader observes it before the
 * first reading arrives. With no reading it leaves the flow rather than the
 * accessibility tree, so it adds no margin under the label. A settling value
 * carries its region inside, so with no reading it holds that region alone.
 */
.snui-metric__value:empty,
.snui-metric__value:has(> .snui-metric__region:only-child) {
${visuallyHiddenDeclarations()}
}

/*
 * One step below the body rather than two below the value: a reading taken
 * without its unit is a reading misread, and the unit has to survive a glance
 * from a metre away.
 */
.snui-metric__unit {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  font-variant-numeric: tabular-nums;
  font-weight: var(--snui-font-weight-semibold);
}

.snui-metric__detail {
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
}

${toneDescendantColorRules("snui-metric", ".snui-metric__value")}

/* One spacing decision for these glyphs, each set in front of its own text. */
.snui-card__tone-glyph,
.snui-metric__tone-glyph,
.snui-badge__tone-glyph,
.snui-field-error__tone-glyph,
.snui-freshness__tone-glyph {
  margin-inline-end: ${String(TONE_GLYPH_GAP_EM)}em;
}

/* A badge usually holds a count, and tabular digits keep the pill from
   resizing as that count ticks over. */
.snui-badge {
  display: inline-flex;
  min-height: ${BADGE_MIN_HEIGHT};
  align-items: center;
  max-width: 100%;
  padding: ${BADGE_PADDING_BLOCK} var(--snui-space-2);
  border: 1px solid currentColor;
  border-radius: var(--snui-radius-pill);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-variant-numeric: tabular-nums;
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

${toneBlockColorRules("snui-badge")}

/*
 * Text and code primitives: the hint, caption, identifier, and hidden-text
 * roles every panel needs, so consumers stop restating the tokens by hand.
 */
.snui-text {
  min-width: 0;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-text--neutral { color: var(--snui-color-text); }
.snui-text--muted { color: var(--snui-color-text-muted); }
${toneBlockColorRules("snui-text")}
.snui-text--size-base { font-size: var(--snui-font-size); }
.snui-text--size-sm { font-size: var(--snui-font-size-sm); }
.snui-text--size-xs { font-size: var(--snui-font-size-xs); }
.snui-text--wrap-nowrap { white-space: nowrap; }
.snui-text--wrap-preserve { white-space: pre-wrap; }

/*
 * Relative to the surrounding text rather than pinned to the small step: a
 * monospace face already reads optically smaller than the sans stack at the
 * same nominal size, so a fixed step down shrinks an identifier twice.
 */
.snui-code {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--snui-font-family-mono);
  font-size: 0.9375em;
}

.snui-code--inline {
  overflow-wrap: anywhere;
}

/*
 * A block keeps the author's line breaks and scrolls rather than wrapping. The
 * scroll stops at the block: a sideways swipe that reached the end would
 * otherwise chain to the page, and a slip like that on a moving boat navigates
 * away from the panel being configured. Tabs at two columns rather than the
 * user-agent eight, so a tab-indented log line does not need scrolling to read.
 */
.snui-code--block {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-sm);
  background: var(--snui-color-surface-raised);
  line-height: var(--snui-line-height);
  tab-size: 2;
  white-space: pre;
}

.snui-relative-age {
  font-variant-numeric: tabular-nums;
}

${NARROW_PANEL_QUERY} {
  /*
   * The card tightens with the surfaces around it. A card left at the wider
   * step inside a narrowed Section pads more than the surface holding it, and
   * both spend width the panel no longer has.
   */
  .snui-card {
    padding: var(--snui-space-3);
  }
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tone hue; keep the badge border and text
   * pinned to system colors so the outline survives alongside the glyph.
   */
  .snui-badge {
    forced-color-adjust: none;
    border-color: CanvasText;
    color: CanvasText;
  }

${toneSelectorList("snui-card")},
${toneSelectorList("snui-card", "accent-")} {
    border-inline-start-color: ButtonText;
  }
}
`);
