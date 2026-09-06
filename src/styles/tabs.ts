import {
  DISABLED_DECLARATIONS,
  FORCED_COLORS_OUTLINE_DECLARATIONS,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

export const TABS_STYLES = scopeStyles(`
.snui-tabs {
  min-width: 0;
}

.snui-tablist {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-1);
  border-block-end: 1px solid var(--snui-color-border);
}

.snui-tabs--vertical .snui-tablist {
  flex-direction: column;
  border-block-end: 0;
  border-inline-end: 1px solid var(--snui-color-border);
}

.snui-tab {
  display: inline-flex;
  min-height: var(--snui-control-min-height);
  min-width: 0;
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 0;
  border-block-end: 2px solid transparent;
  margin-block-end: -1px;
  border-radius: var(--snui-radius-sm) var(--snui-radius-sm) 0 0;
  background: transparent;
  color: var(--snui-color-text-muted);
  font: inherit;
  font-weight: var(--snui-font-weight-semibold);
  cursor: pointer;
  overflow-wrap: anywhere;
  transition:
    background-color var(--snui-transition-fast),
    color var(--snui-transition-fast);
}

.snui-tabs--vertical .snui-tab {
  border-block-end: 0;
  border-inline-end: 2px solid transparent;
  margin-block-end: 0;
  margin-inline-end: -1px;
  border-radius: var(--snui-radius-sm) 0 0 var(--snui-radius-sm);
  text-align: start;
}

/* The selected tab is marked by color and by the bar, never by color alone. */
.snui-tab[aria-selected="true"] {
  border-color: var(--snui-color-accent-fill);
  color: var(--snui-color-text);
}

@media (hover: hover) {
  .snui-tab:not(:disabled):not([aria-selected="true"]):hover {
    background: var(--snui-color-interactive-hover);
    color: var(--snui-color-text);
  }
}

.snui-tab:disabled {
${DISABLED_DECLARATIONS}
}

.snui-tab__label {
  min-width: 0;
}

.snui-tab__badge {
  display: inline-flex;
  flex: none;
  align-items: center;
}

.snui-tabpanel {
  min-width: 0;
  padding-block-start: var(--snui-space-3);
}

.snui-tabs--vertical {
  display: flex;
  gap: var(--snui-space-3);
}

.snui-tabs--vertical .snui-tabpanel {
  flex: 1 1 auto;
  padding-block-start: 0;
}

@media (forced-colors: active) {
  .snui-tab[aria-selected="true"] {
    forced-color-adjust: none;
    border-color: Highlight;
    background: Canvas;
    color: CanvasText;
  }

  .snui-tab:focus-visible {
${FORCED_COLORS_OUTLINE_DECLARATIONS}
  }
}
`);
