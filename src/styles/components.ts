import {
  FIELD_ERROR_DECLARATIONS,
  toneDotShapeRules,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const COMPONENT_STYLES = scopeStyles(`
.snui-section {
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
  margin-bottom: var(--snui-space-4);
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
  font-size: 1.125rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.snui-section__description {
  min-width: 0;
  margin: var(--snui-space-1) 0 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-section > :not(.snui-section__header) + :not(.snui-section__header) {
  margin-top: var(--snui-space-3);
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

.snui-status__dot {
  width: 0.7rem;
  height: 0.7rem;
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
  bottom: 0;
}

.snui-action-bar--sticky-top {
  top: 0;
}

/*
 * Keep focused content clear of a sticky bar: the bar is one control height
 * plus its vertical padding, and one more gap keeps focus rings visible.
 */
.snui-root:has(> .snui-action-bar--sticky-bottom) {
  scroll-padding-block-end: calc(
    var(--snui-control-min-height) + var(--snui-space-3) * 3
  );
}

.snui-root:has(> .snui-action-bar--sticky-top) {
  scroll-padding-block-start: calc(
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

.snui-inline-confirm__title {
  min-width: 0;
  margin: 0;
  font-size: 1rem;
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
}

.snui-empty-state__description {
  min-width: 0;
  max-width: 100%;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-empty-state__action {
  margin-top: var(--snui-space-2);
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
}
`);
