import { DISABLED_DECLARATIONS, focusRingDeclarations } from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Switch styles. Installed by `Switch` through `useOptionalModuleStyles`, so
 * a panel without a switch never injects them.
 */
export const SWITCH_STYLES: StyleModule = {
  id: "switch",
  styles: scopeStyles(`
.snui-switch__button {
  display: flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-3);
  padding-block: var(--snui-space-2);
  cursor: pointer;
}

.snui-switch__track {
  position: relative;
  width: 2.25rem;
  height: 1.25rem;
  flex: none;
  border: 2px solid var(--snui-color-border);
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-surface);
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast);
}

.snui-switch__thumb {
  position: absolute;
  inset-inline-start: 0.125rem;
  inset-block-start: 50%;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  background: var(--snui-color-text-muted);
  transform: translateY(-50%);
  transition:
    inset-inline-start var(--snui-transition-fast),
    background-color var(--snui-transition-fast);
}

.snui-switch__button[data-hovered]:not([data-disabled]) .snui-switch__track {
  border-color: var(--snui-color-accent-fill);
}

.snui-switch__button[data-selected] .snui-switch__track {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

.snui-switch__button[data-selected] .snui-switch__thumb {
  inset-inline-start: calc(100% - 0.875rem - 0.125rem);
  background: var(--snui-color-on-accent);
}

.snui-switch__button[data-focus-visible] .snui-switch__track {
${focusRingDeclarations("2px", true)}
}

.snui-switch__button[data-disabled] {
${DISABLED_DECLARATIONS}
}

.snui-switch__button[data-disabled] .snui-switch__track {
  border-color: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled] .snui-switch__thumb {
  background: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled][data-selected] .snui-switch__track {
  background: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled][data-selected] .snui-switch__thumb {
  background: var(--snui-color-surface);
}

.snui-switch__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

@media (forced-colors: active) {
  .snui-switch__track {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
  }

  .snui-switch__thumb {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-switch__button[data-selected] .snui-switch__track {
    forced-color-adjust: none;
    border-color: Highlight;
    background: Highlight;
  }

  .snui-switch__button[data-selected] .snui-switch__thumb {
    forced-color-adjust: none;
    background: HighlightText;
  }

  .snui-switch__button[data-focus-visible] .snui-switch__track {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }

  .snui-switch__button[data-hovered]:not([data-disabled]) .snui-switch__track {
    border-color: Highlight;
  }
}
`),
};
