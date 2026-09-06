import {
  FIELD_ERROR_DECLARATIONS,
  toneDotShapeRules,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const COMPONENT_STYLES = scopeStyles(`
/*
 * The tone glyph ToneMark renders for every tone-badged component. Blocks
 * refine size or spacing with their own glyph class; the shape stays shared.
 */
.snui-tone-glyph {
  display: inline-flex;
  width: 1em;
  height: 1em;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1;
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
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

/* One grid gap owns the rhythm between header and content. */
.snui-section {
  display: grid;
  gap: var(--snui-space-4);
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
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

.snui-section__title {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text);
  font-size: var(--snui-font-size-lg);
  line-height: 1.3;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-section__description {
  min-width: 0;
  margin: 0;
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-field {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-field__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-field__description {
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  overflow-wrap: anywhere;
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
.snui-radio-group__error:empty {
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

/* Large enough for the per-tone shapes to read at a glance. */
.snui-status__dot {
  width: 0.75rem;
  height: 0.75rem;
  flex: none;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: currentColor;
}

.snui-status--neutral { color: var(--snui-color-text-muted); }
.snui-status--info { color: var(--snui-color-info); }
.snui-status--success { color: var(--snui-color-success); }
.snui-status--warning { color: var(--snui-color-warning); }
.snui-status--danger { color: var(--snui-color-danger); }

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
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: color-mix(in srgb, var(--snui-color-surface) 94%, transparent);
  box-shadow: var(--snui-shadow-raised);
  -webkit-backdrop-filter: blur(0.4rem);
  backdrop-filter: blur(0.4rem);
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
 */
.snui-root:has(.snui-action-bar--sticky-bottom) .snui-root__content :is(button, input, select, textarea, a[href], [tabindex]),
.snui-root:has(.snui-action-bar__viewport-anchor) .snui-root__content :is(button, input, select, textarea, a[href], [tabindex]) {
  scroll-margin-block-end: calc(
    var(--snui-control-min-height) + var(--snui-space-3) * 3
  );
}

.snui-root:has(.snui-action-bar--sticky-top) .snui-root__content :is(button, input, select, textarea, a[href], [tabindex]) {
  scroll-margin-block-start: calc(
    var(--snui-control-min-height) + var(--snui-space-3) * 3
  );
}

.snui-action-bar__status {
  min-width: 0;
  max-width: 100%;
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
  gap: var(--snui-space-3);
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-warning);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

/* Weight, not size, sets the confirmation apart from the copy beneath it. */
.snui-inline-confirm__title {
  min-width: 0;
  margin: 0;
  font-size: var(--snui-font-size);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
}

.snui-inline-confirm__message {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-inline-confirm__actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  justify-content: flex-end;
}

@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-section {
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

  .snui-action-bar__actions > .snui-button {
    flex: 1 1 auto;
  }
}

.snui-empty-state {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-6) var(--snui-space-4);
  text-align: center;
}

.snui-empty-state__icon {
  color: var(--snui-color-text-muted);
  line-height: 1;
}

.snui-empty-state__title {
  min-width: 0;
  max-width: 100%;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-empty-state__description {
  min-width: 0;
  max-width: 100%;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-empty-state__action {
  margin-block-start: var(--snui-space-2);
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
