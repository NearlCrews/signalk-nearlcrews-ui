import {
  CONTROL_LABEL_DECLARATIONS,
  FIELD_DESCRIPTION_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  FIELD_STACK_DECLARATIONS,
  NARROW_PANEL_QUERY,
  PROSE_MEASURE_DECLARATION,
  stretchedActionRules,
  TONE_DOT_DECLARATIONS,
  TONE_GLYPH_BOX_EM,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import {
  TONE_SHAPE_DECLARATIONS,
  toneBlockColorRules,
  toneDotShapeRules,
} from "./tone-rules.js";

/**
 * The panel content a focus move can scroll to, which the scroll margins below
 * keep clear of a sticky action bar. One list for all three bar placements.
 */
const STICKY_CLEARANCE_TARGETS =
  ".snui-root__content :is(button, input, select, textarea, a[href], [tabindex])";

export const COMPONENT_STYLES = scopeStyles(`
/*
 * The tone glyph ToneMark renders for every tone-badged component. Each tone
 * takes a shape of its own, because hue cannot carry tone for a reader with a
 * color deficiency, or under Night, where every tone is a red. Info, warning,
 * and danger take the shapes the status dots use, filled, with the character
 * knocked out in the surface color, a pair as strong as the tone's text on
 * the surface. Success is a heavy check cut from the same box with nothing
 * around it, where the success dot is a diamond, because an enclosing circle
 * turned the check into the slashed "not available" sign.
 * The box is an eighth larger than the text it sits in, so the counters stay
 * open. Blocks refine size or spacing with their own glyph class.
 */
.snui-tone-glyph {
  display: inline-flex;
  width: ${String(TONE_GLYPH_BOX_EM)}em;
  height: ${String(TONE_GLYPH_BOX_EM)}em;
  flex: none;
  align-items: center;
  justify-content: center;
  background: currentColor;
  -webkit-text-fill-color: var(--snui-color-surface);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1;
}

.snui-tone-glyph--info {
${TONE_SHAPE_DECLARATIONS.info}
}

/* The mark sits low, where the triangle is wide enough to hold it. */
.snui-tone-glyph--warning {
${TONE_SHAPE_DECLARATIONS.warning}
  padding-block-start: 0.2em;
}

.snui-tone-glyph--danger {
${TONE_SHAPE_DECLARATIONS.danger}
}

/*
 * Cut from the box rather than typed: the check character comes from
 * whichever fallback face has it, often a hairline one that no weight
 * thickens, and a border-drawn check took its stroke from the text size, so it
 * stayed thin in the larger banner mark. Cut from the box, the check spans the
 * extent the other shapes fill and its stroke, about a quarter of the box,
 * grows with it. The points are physical, because a check does not mirror in a
 * right-to-left panel.
 */
.snui-tone-glyph--success {
  clip-path: polygon(2% 50%, 20% 32%, 38% 50%, 80% 8%, 98% 26%, 38% 88%);
  -webkit-text-fill-color: transparent;
}

/*
 * The theme selector is a panel-level control, so it keeps the trailing edge.
 * Ending a grid item sizes it to its content, so the intrinsic minimum is
 * released and the width capped: the selector scrolls inside its own track on
 * a narrow panel instead of pushing the column wider.
 */
.snui-panel-shell__theme-toggle {
  justify-self: end;
  min-inline-size: 0;
  max-inline-size: 100%;
}

/* The PanelShell title block: the heading reset supplies the type step. */
.snui-panel-shell__header {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-panel-shell__title {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-panel-shell__description {
  min-width: 0;
${PROSE_MEASURE_DECLARATION}
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

/*
 * One inline inset for the panel-level surfaces this module paints: the two
 * section shells and the action bar, so their content keeps one edge down the
 * panel and a save bar's status and buttons line up with the section content
 * above them. A narrow panel tightens all three together, below.
 */
:is(.snui-section, .snui-collapsible, .snui-action-bar) {
  --snui-section-inset: var(--snui-space-4);
}

/*
 * The two section shells paint one surface, so sibling sections read as one
 * kit rather than two: one border, one radius, one shadow, and the shared
 * inline inset that both shells' content keeps from the edge. The collapsible
 * module removes the chrome for its embedded variant and reads the inset for
 * its header, summary, and content.
 */
.snui-section,
.snui-collapsible {
  min-width: 0;
  border: 1px solid var(--snui-color-border-subtle);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

/* One grid gap owns the rhythm between header and content. */
.snui-section {
  display: grid;
  gap: var(--snui-space-4);
  padding: var(--snui-section-inset);
}

.snui-section--compact {
  --snui-section-inset: var(--snui-space-2);
  gap: var(--snui-space-3);
}

.snui-section__header {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: flex-start;
  justify-content: space-between;
}

.snui-section__header > * {
  min-width: 0;
  max-width: 100%;
}

/*
 * Leading content shares the title's line, with the gap a collapsible
 * section's header puts between its leading slot and its heading. The
 * heading keeps the row's remaining width, so a long title wraps beside the
 * glyph rather than under it.
 */
.snui-section__title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--snui-space-2);
}

.snui-section__title-row > .snui-section__title {
  flex: 1 1 auto;
}

.snui-section__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--snui-space-2);
}

.snui-section__actions > * {
  min-width: 0;
  max-width: 100%;
}

/*
 * Bold, the package's title weight, which the collapsible toggle carries too,
 * so a title's weight no longer depends on whether its section collapses. The
 * size follows depth, in the collapsible module, where both shells' title
 * sizes are set together.
 */
.snui-section__title {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text);
  font-size: var(--snui-font-size);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.3;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-section__description {
  min-width: 0;
${PROSE_MEASURE_DECLARATION}
  margin: 0;
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-field {
${FIELD_STACK_DECLARATIONS}
}

.snui-field__label {
${CONTROL_LABEL_DECLARATIONS}
}

/* The most numerous prose in a panel, so it takes the balanced last line and
   the measure cap the other body copy takes. */
.snui-field__description {
${FIELD_DESCRIPTION_DECLARATIONS}
${PROSE_MEASURE_DECLARATION}
  text-wrap: pretty;
}

.snui-field__error {
${FIELD_ERROR_DECLARATIONS}
}

/*
 * An announcing error region stays mounted so a screen reader observes it
 * before the message arrives. While empty it is taken out of flow rather than
 * hidden, because display: none would remove it from the accessibility tree.
 */
.snui-field__error:empty,
.snui-checkbox__error:empty,
.snui-field-group__error:empty,
.snui-radio-group__error:empty,
.snui-segmented__error:empty,
.snui-switch__error:empty {
${visuallyHiddenDeclarations()}
}

.snui-required-mark {
  color: var(--snui-color-danger);
}

.snui-status {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--snui-space-2);
  color: var(--snui-color-text);
  overflow-wrap: anywhere;
}

.snui-status--size-compact {
  gap: var(--snui-space-1);
}

.snui-status__text {
  min-width: 0;
}

/*
 * An announcing indicator stays mounted for the same reason the error regions
 * above do, and leaves the flow the same way while it has no status to show.
 * A settling indicator carries its region inside, so with nothing to show it
 * holds that region alone and leaves the flow the same way.
 */
.snui-status:empty,
.snui-status:has(> .snui-status__region:only-child) {
${visuallyHiddenDeclarations()}
}

/* Large enough for the per-tone shapes to read at a glance. */
.snui-status__dot {
${TONE_DOT_DECLARATIONS}
  flex: none;
}

.snui-status--neutral { color: var(--snui-color-text-muted); }
${toneBlockColorRules("snui-status")}

/*
 * Each tone also gets a distinct dot shape, so the state does not depend on
 * color alone for a sighted user who cannot distinguish the hues.
 */
${toneDotShapeRules("snui-status", "snui-status__dot")}

.snui-action-bar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: center;
  justify-content: space-between;
  /* The block padding is the bar's own, which sets its height and so the
     docking clearance; the inline inset is the sections' own. */
  padding-block: var(--snui-space-3);
  padding-inline: var(--snui-section-inset);
  border: 1px solid var(--snui-color-border-subtle);
  border-radius: var(--snui-radius-md);
  background: var(--snui-action-bar-surface);
  box-shadow: var(--snui-shadow-raised);
  -webkit-backdrop-filter: blur(0.4rem);
  backdrop-filter: blur(0.4rem);
}

.snui-action-bar__content {
  display: flex;
  min-width: 0;
  flex: 1 1 12rem;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

/*
 * The toolbar variant is a band rather than a card: no radius, no shadow, and
 * one bottom border, so a panel-wide toolbar reads as part of the panel
 * instead of a surface floating over it. The card variant needs no rule of
 * its own, because the base rule above is the card.
 */
.snui-action-bar--toolbar {
  border-width: 0 0 1px;
  border-radius: 0;
  box-shadow: none;
}

.snui-action-bar--sticky-bottom,
.snui-action-bar--sticky-top {
  position: sticky;
  z-index: var(--snui-z-sticky);
}

.snui-action-bar--sticky-bottom {
  inset-block-end: 0;
}

.snui-action-bar--sticky-top {
  inset-block-start: 0;
}

.snui-action-bar--sticky-viewport-bottom {
  position: relative;
}

.snui-action-bar__viewport-anchor {
  min-width: 0;
}

.snui-action-bar__viewport-anchor--docked {
  block-size: var(--snui-action-bar-fixed-height);
}

/*
 * The probe resolves env() to a measurable layout coordinate. Keeping it in
 * the panel avoids a body portal while giving the positioning code the real
 * safe-area inset instead of assuming a particular device notch size.
 */
.snui-action-bar__safe-area-probe {
  position: fixed;
  inset-inline-end: 0;
  inset-block-end: env(safe-area-inset-bottom, 0px);
  width: 0;
  height: 0;
  visibility: hidden;
  pointer-events: none;
}

/*
 * Fixed positioning is measured against the bar's natural-flow anchor. The
 * anchor reserves its height, while these values keep the fixed surface in
 * the PanelRoot column and above the visual viewport or device safe area.
 * The inline offset stays physical: it is a measured client rectangle edge,
 * not a writing-mode value.
 */
.snui-action-bar--viewport-docked {
  position: fixed;
  z-index: var(--snui-z-sticky);
  inset-block-end: max(
    env(safe-area-inset-bottom, 0px),
    var(--snui-action-bar-fixed-bottom, 0px)
  );
  left: var(--snui-action-bar-fixed-left);
  width: var(--snui-action-bar-fixed-width);
}

/*
 * Keep focus-scroll targets clear of nested sticky bars. Scroll margin stays
 * with the target, so it works when the Signal K host or another ancestor,
 * rather than PanelRoot itself, owns scrolling.
 *
 * The panel root is reached through :scope, the one spelling that matches it:
 * inside the scoped sheet a bare .snui-root class matches a descendant root,
 * which the scope boundary has already excluded, so the rule would apply to
 * nothing and every target would scroll flush under the bar.
 *
 * The height is published as a custom property on the panel that has a bar, so
 * a consumer scrolling a container of its own, a row rather than a control,
 * can write scroll-margin from the same value instead of deriving a second
 * formula that drifts from this one. A panel with no sticky bar declares
 * nothing, so the same consumer rule resolves to no clearance there.
 */
:scope:has(.snui-action-bar--sticky-bottom),
:scope:has(.snui-action-bar__viewport-anchor),
:scope:has(.snui-action-bar--sticky-top) {
  --snui-sticky-clearance: calc(
    var(--snui-control-min-height) + var(--snui-space-3) * 3
  );
}

:scope:has(.snui-action-bar--sticky-bottom) ${STICKY_CLEARANCE_TARGETS},
:scope:has(.snui-action-bar__viewport-anchor) ${STICKY_CLEARANCE_TARGETS} {
  scroll-margin-block-end: var(--snui-sticky-clearance);
}

:scope:has(.snui-action-bar--sticky-top) ${STICKY_CLEARANCE_TARGETS} {
  scroll-margin-block-start: var(--snui-sticky-clearance);
}

/*
 * The status takes any content, so a bare string with a long unbroken word
 * wraps here rather than widening the bar past a narrow page.
 */
.snui-action-bar__status {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.snui-action-bar__status:focus-visible {
  border-radius: var(--snui-radius-sm);
}

.snui-action-bar__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  margin-inline-start: auto;
}

.snui-inline-confirm {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-3);
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-warning);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

/*
 * Weight, not size, sets the confirmation apart from the copy beneath it. The
 * leading is pinned as the section title's is, because the heading level, and
 * the leading the reset gives it, follows the section around it.
 */
.snui-inline-confirm__title {
  min-width: 0;
  text-wrap: balance;
  margin: 0;
  font-size: var(--snui-font-size);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.snui-inline-confirm__message {
  min-width: 0;
${PROSE_MEASURE_DECLARATION}
  margin: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-inline-confirm__actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  justify-content: flex-end;
}

${NARROW_PANEL_QUERY} {
  :is(.snui-section, .snui-collapsible, .snui-action-bar) {
    --snui-section-inset: var(--snui-space-3);
  }

  /* A compact section keeps its tighter step rather than loosening to the
     narrow one. */
  .snui-section--compact {
    --snui-section-inset: var(--snui-space-2);
  }

  .snui-inline-confirm {
    padding: var(--snui-space-3);
  }

  .snui-section__header,
  .snui-action-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .snui-action-bar__actions {
    width: 100%;
    margin-inline-start: 0;
  }

  .snui-section__actions {
    width: 100%;
    justify-content: flex-start;
  }

${stretchedActionRules(".snui-action-bar__actions")}
}

@media (prefers-reduced-transparency: reduce) {
  /* Reduced transparency request: the sticky bar goes fully opaque. */
  .snui-action-bar {
    background: var(--snui-color-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .snui-status__dot {
    border-color: CanvasText;
    background: CanvasText;
  }

  /*
   * A background-painted shape vanishes when the system repaints backgrounds,
   * so the glyph paints its shape and its knocked-out mark in system colors
   * itself. The check has no mark, so its character stays hidden.
   */
  .snui-tone-glyph {
    forced-color-adjust: none;
    background: CanvasText;
    -webkit-text-fill-color: Canvas;
    color: CanvasText;
  }

  .snui-tone-glyph--success {
    -webkit-text-fill-color: transparent;
  }

  /*
   * Forced colors flattens the warning border, which erases the
   * confirmation's caution signal. Reconstruct it with a system color.
   */
  .snui-inline-confirm {
    forced-color-adjust: none;
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }

  /*
   * forced-color-adjust inherits, so the controls in the action slot opt back
   * in or a secondary Cancel keeps the author palette under a system theme.
   */
  .snui-inline-confirm__actions {
    forced-color-adjust: auto;
  }
}
`);
