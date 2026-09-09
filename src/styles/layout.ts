import { scopeStyles } from "./scope.js";
import {
  TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
  toneColorRules,
} from "./tone-rules.js";

const GAP_RULES = [1, 2, 3, 4, 5, 6]
  .map((space) => {
    const scale = String(space);
    return `
.snui-stack--gap-${scale},
.snui-cluster--gap-${scale} {
  gap: var(--snui-space-${scale});
}`;
  })
  .join("\n");

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

.snui-layout--align-start { align-items: flex-start; }
.snui-layout--align-center { align-items: center; }
.snui-layout--align-end { align-items: flex-end; }
.snui-layout--align-stretch { align-items: stretch; }
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
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

.snui-card--compact {
  gap: var(--snui-space-2);
  padding: var(--snui-space-3);
}

.snui-card--flush {
  padding: 0;
}

.snui-card__header {
  min-width: 0;
  padding-block-end: var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
}

.snui-card__footer {
  min-width: 0;
  padding-block-start: var(--snui-space-3);
  border-block-start: 1px solid var(--snui-color-border);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
}

.snui-card--compact > .snui-card__header {
  padding-block-end: var(--snui-space-2);
}

.snui-card--compact > .snui-card__footer {
  padding-block-start: var(--snui-space-2);
}

/* A toned card paints the Banner accent bar and carries the tone glyph. */
.snui-card--info,
.snui-card--success,
.snui-card--warning,
.snui-card--danger {
${TONE_ACCENT_BAR_DECLARATIONS}
}

${toneAccentBarRules("snui-card")}

/*
 * A card with a decorative accent paints the same bar without a glyph or an
 * announcement, for a row whose meaning another element already announces.
 */
.snui-card--accent-info,
.snui-card--accent-success,
.snui-card--accent-warning,
.snui-card--accent-danger {
${TONE_ACCENT_BAR_DECLARATIONS}
}

${toneAccentBarRules("snui-card", "accent-")}

.snui-card__tone-glyph {
  margin-inline-end: 0.375em;
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
  margin-block-start: 0.125rem;
}

.snui-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  gap: var(--snui-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.snui-metric {
  min-width: 0;
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
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

.snui-metric__unit {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-variant-numeric: tabular-nums;
  font-weight: var(--snui-font-weight-semibold);
}

.snui-metric__detail {
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
}

${toneColorRules((tone) => `.snui-metric--${tone} .snui-metric__value`, "color")}

.snui-metric__tone-glyph,
.snui-badge__tone-glyph {
  margin-inline-end: 0.375em;
}

.snui-badge {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  max-width: 100%;
  padding: 0.125rem var(--snui-space-2);
  border: 1px solid currentColor;
  border-radius: var(--snui-radius-pill);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

${toneColorRules((tone) => `.snui-badge--${tone}`, "color")}

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
${toneColorRules((tone) => `.snui-text--${tone}`, "color")}
.snui-text--size-base { font-size: var(--snui-font-size); }
.snui-text--size-sm { font-size: var(--snui-font-size-sm); }
.snui-text--size-xs { font-size: var(--snui-font-size-xs); }

.snui-code {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--snui-font-family-mono);
  font-size: var(--snui-font-size-sm);
}

.snui-code--inline {
  overflow-wrap: anywhere;
}

/* A block keeps the author's line breaks and scrolls rather than wrapping. */
.snui-code--block {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-sm);
  background: var(--snui-color-surface-raised);
  line-height: var(--snui-line-height);
  white-space: pre;
}

.snui-relative-age {
  font-variant-numeric: tabular-nums;
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

  .snui-card--info,
  .snui-card--success,
  .snui-card--warning,
  .snui-card--danger,
  .snui-card--accent-info,
  .snui-card--accent-success,
  .snui-card--accent-warning,
  .snui-card--accent-danger {
    border-inline-start-color: ButtonText;
  }
}
`);
