import { SPINNER_ANIMATION_NAME } from "../version.js";
import { owned, scopeStyles } from "./scope.js";

export const CONTROL_STYLES = `
@keyframes ${SPINNER_ANIMATION_NAME} {
  to { transform: rotate(1turn); }
}

${scopeStyles(`
${owned(".snui-button")} {
  display: inline-flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  justify-content: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-4);
  border: 1px solid transparent;
  border-radius: var(--snui-radius-sm);
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast),
    color var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

${owned(".snui-button:not(:disabled):active")} {
  transform: translateY(1px);
}

${owned(".snui-button--primary")} {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

${owned(".snui-button--primary:not(:disabled):hover")} {
  background: var(--snui-color-accent-fill-hover);
}

${owned(".snui-button--secondary")} {
  border-color: var(--snui-color-border);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
}

${owned(".snui-button--secondary:not(:disabled):hover")},
${owned(".snui-button--ghost:not(:disabled):hover")} {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-surface-raised);
}

${owned(".snui-button--ghost")} {
  border-color: transparent;
  background: transparent;
  color: var(--snui-color-text);
}

${owned(".snui-button--danger")} {
  border-color: var(--snui-color-danger);
  background: transparent;
  color: var(--snui-color-danger);
}

${owned(".snui-button--danger:not(:disabled):hover")} {
  background: transparent;
  background: color-mix(in srgb, var(--snui-color-danger) 14%, transparent);
}

${owned(".snui-button__spinner")} {
  width: 1em;
  height: 1em;
  flex: none;
  border: 0.125em solid currentColor;
  border-inline-end-color: transparent;
  border-radius: 50%;
  animation: ${SPINNER_ANIMATION_NAME} 0.8s linear infinite;
}

${owned(".snui-input")} {
  width: 100%;
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-sm);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
  accent-color: var(--snui-color-accent-fill);
}

${owned(".snui-input::placeholder")} {
  color: var(--snui-color-text-muted);
  opacity: 1;
}

${owned('.snui-input[aria-invalid="true"]')} {
  border-color: var(--snui-color-danger);
}

${owned(".snui-range")} {
  appearance: none;
  width: 100%;
  min-height: var(--snui-control-min-height);
  margin: 0;
  background: transparent;
  accent-color: var(--snui-color-accent-fill);
  cursor: pointer;
}

${owned(".snui-range::-webkit-slider-runnable-track")} {
  height: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: var(--snui-color-border);
}

${owned(".snui-range::-webkit-slider-thumb")} {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: -0.4375rem;
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

${owned(".snui-range::-moz-range-track")} {
  height: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: var(--snui-color-border);
}

${owned(".snui-range::-moz-range-progress")} {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--snui-color-accent-fill);
}

${owned(".snui-range::-moz-range-thumb")} {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

${owned(".snui-checkbox")} {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--snui-space-1) var(--snui-space-3);
  align-items: start;
  min-height: var(--snui-control-min-height);
  padding-block: var(--snui-space-2);
  cursor: pointer;
}

${owned(".snui-checkbox__input")} {
  appearance: none;
  display: grid;
  place-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0.125rem 0 0;
  border: 2px solid var(--snui-color-border);
  border-radius: 0.25rem;
  background: var(--snui-color-surface);
  accent-color: var(--snui-color-accent-fill);
  cursor: pointer;
}

${owned(".snui-checkbox__input::before")} {
  width: 0.65rem;
  height: 0.36rem;
  border-color: var(--snui-color-on-accent);
  border-style: solid;
  border-width: 0 0 0.15rem 0.15rem;
  content: "";
  opacity: 0;
  transform: translateY(-0.08rem) rotate(-45deg);
}

${owned(".snui-checkbox__input:checked")},
${owned(".snui-checkbox__input:indeterminate")} {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

${owned(".snui-checkbox__input:checked::before")} {
  opacity: 1;
}

${owned(".snui-checkbox__input:indeterminate::before")} {
  width: 0.65rem;
  height: 0;
  border-width: 0 0 0.15rem;
  opacity: 1;
  transform: none;
}

${owned(".snui-checkbox__label")} {
  color: var(--snui-color-text);
  font-weight: 600;
}

${owned(".snui-checkbox__description")} {
  grid-column: 2;
  color: var(--snui-color-text-muted);
  font-size: 0.875rem;
}

${owned(".snui-segmented")} {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

${owned(".snui-segmented__group")} {
  display: inline-flex;
  max-width: 100%;
  padding: 0.375rem;
  overflow-x: auto;
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

${owned(".snui-segmented__option")} {
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-1) var(--snui-space-3);
  border: 0;
  border-radius: calc(var(--snui-radius-md) - 3px);
  background: transparent;
  color: var(--snui-color-text-muted);
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}

${owned('.snui-segmented__option[aria-checked="true"]')} {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

${owned(".snui-button:disabled")},
${owned(".snui-input:disabled")},
${owned(".snui-range:disabled")},
${owned(".snui-segmented:not(:disabled) .snui-segmented__option:disabled")} {
  cursor: not-allowed;
  opacity: 0.58;
}

${owned(".snui-checkbox:has(.snui-checkbox__input:disabled)")},
${owned(".snui-segmented:disabled")} {
  cursor: not-allowed;
  opacity: 0.58;
}

${owned(".snui-checkbox:has(.snui-checkbox__input:disabled) .snui-checkbox__input")},
${owned(".snui-segmented:disabled .snui-segmented__option")} {
  cursor: not-allowed;
  opacity: 1;
}

@media (forced-colors: active) {
  ${owned(".snui-checkbox__input")} {
    appearance: auto;
    border: 0;
    background: Canvas;
  }

  ${owned(".snui-checkbox__input::before")} {
    content: none;
  }

  ${owned(".snui-range::-webkit-slider-runnable-track")} {
    forced-color-adjust: none;
    background: ButtonText;
  }

  ${owned(".snui-range::-webkit-slider-thumb")} {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }

  ${owned(".snui-range::-moz-range-track")} {
    forced-color-adjust: none;
    background: ButtonText;
  }

  ${owned(".snui-range::-moz-range-thumb")} {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }
}
`)}
`;
