import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const FEEDBACK_STYLES = scopeStyles(`
.snui-banner {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--snui-space-3);
  padding: var(--snui-space-3) var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-inline-start-width: 0.3rem;
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
}

.snui-banner--info { border-inline-start-color: var(--snui-color-info); }
.snui-banner--success { border-inline-start-color: var(--snui-color-success); }
.snui-banner--warning { border-inline-start-color: var(--snui-color-warning); }
.snui-banner--danger { border-inline-start-color: var(--snui-color-danger); }

.snui-banner__title {
  margin: 0 0 var(--snui-space-1);
  font-weight: var(--snui-font-weight-bold);
}

.snui-banner__tone-icon {
  display: inline-grid;
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  color: var(--snui-color-info);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-heavy);
  line-height: 1;
}

.snui-banner--success .snui-banner__tone-icon { color: var(--snui-color-success); }
.snui-banner--warning .snui-banner__tone-icon { color: var(--snui-color-warning); }
.snui-banner--danger .snui-banner__tone-icon { color: var(--snui-color-danger); }

.snui-banner__body > :first-child { margin-top: 0; }
.snui-banner__body > :last-child { margin-bottom: 0; }

.snui-banner__content,
.snui-banner__text,
.snui-banner__body {
  min-width: 0;
  overflow-wrap: anywhere;
}

.snui-banner__content {
  display: flex;
  align-items: flex-start;
  gap: var(--snui-space-2);
}

.snui-banner__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-banner {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tone bar to the same system color as the
   * rest of the border, which weakens the severity signal. Reconstruct the
   * leading bar with ButtonText against CanvasText so it stays distinct.
   */
  .snui-banner {
    forced-color-adjust: none;
    border-color: CanvasText;
    border-inline-start-color: ButtonText;
    background: Canvas;
    color: CanvasText;
  }
}
`);
