import {
  DISABLED_DECLARATIONS,
  FORCED_COLORS_OUTLINE_DECLARATIONS,
  focusRingDeclarations,
  OVERLAY_TRANSITION_DECLARATIONS,
  PRESSED_FILL_DECLARATION,
  RAISED_OVERLAY_DECLARATIONS,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

export const MENU_STYLES = scopeStyles(`
/* ==== Menu (Menu, MenuItem, MenuSeparator, MenuSection) ==== */

.snui-menu-popover {
  z-index: var(--snui-z-overlay);
${RAISED_OVERLAY_DECLARATIONS}
}

.snui-menu-popover[data-entering],
.snui-menu-popover[data-exiting] {
${OVERLAY_TRANSITION_DECLARATIONS}
}

.snui-menu {
  min-width: 10rem;
  max-width: min(20rem, 100%);
  max-height: inherit;
  padding: var(--snui-space-1);
  overflow-y: auto;
}

.snui-menu__item {
  display: flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-1) var(--snui-space-3);
  border-radius: var(--snui-radius-sm);
  color: var(--snui-color-text);
  cursor: default;
  outline: none;
}

.snui-menu__item[data-hovered],
.snui-menu__item[data-focused] {
  background: var(--snui-color-interactive-hover);
}

.snui-menu__item[data-focus-visible] {
${focusRingDeclarations("-2px", false)}
}

.snui-menu__item[data-pressed] {
${PRESSED_FILL_DECLARATION}
}

.snui-menu__item[data-disabled] {
${DISABLED_DECLARATIONS}
}

.snui-menu__item--destructive {
  color: var(--snui-color-danger);
  font-weight: var(--snui-font-weight-bold);
}

.snui-menu__separator {
  margin: var(--snui-space-1) var(--snui-space-2);
  border-top: 1px solid var(--snui-color-border);
}

.snui-menu__section + .snui-menu__section {
  border-top: 1px solid var(--snui-color-border);
  margin-top: var(--snui-space-1);
  padding-top: var(--snui-space-1);
}

.snui-menu__section-header {
  padding: var(--snui-space-2) var(--snui-space-3) var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: 0.8125em;
  font-weight: var(--snui-font-weight-bold);
}

@media (forced-colors: active) {
  .snui-menu-popover {
${FORCED_COLORS_OUTLINE_DECLARATIONS}
  }

  /*
   * Forced colors flattens the hover fill, which erases the focused item.
   * Reconstruct the focused state with a system highlight.
   */
  .snui-menu__item[data-focused],
  .snui-menu__item[data-hovered],
  .snui-menu__item[data-pressed] {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}
`);
