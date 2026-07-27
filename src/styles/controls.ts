import { SPINNER_ANIMATION_NAME } from "../version.js";
import { scopeStyles } from "./scope.js";

export const CONTROL_STYLES = `
@keyframes ${SPINNER_ANIMATION_NAME} {
  to { transform: rotate(1turn); }
}

${scopeStyles(`
.snui-button {
  display: inline-flex;
  min-width: 0;
  min-height: var(--snui-control-min-height);
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-4);
  border: 1px solid transparent;
  border-radius: var(--snui-radius-sm);
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast),
    color var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

.snui-button__content {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: var(--snui-space-2);
  overflow-wrap: anywhere;
}

.snui-button:not(:disabled):not([aria-disabled="true"]):active {
  transform: translateY(1px);
}

.snui-button--primary {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

.snui-button--primary:not(:disabled):not([aria-disabled="true"]):hover {
  background: var(--snui-color-accent-fill-hover);
}

.snui-button--secondary {
  border-color: var(--snui-color-border);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
}

.snui-button--secondary:not(:disabled):not([aria-disabled="true"]):hover,
.snui-button--ghost:not(:disabled):not([aria-disabled="true"]):hover {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-interactive-hover);
}

.snui-button--ghost {
  background: transparent;
  color: var(--snui-color-text);
}

.snui-button--danger {
  border-color: var(--snui-color-danger);
  background: transparent;
  color: var(--snui-color-danger);
}

.snui-button--danger:not(:disabled):not([aria-disabled="true"]):hover {
  background: color-mix(in srgb, var(--snui-color-danger) 14%, transparent);
}

.snui-button__spinner {
  width: 1em;
  height: 1em;
  flex: none;
  border: 0.125em solid currentColor;
  border-inline-end-color: transparent;
  border-radius: 50%;
  animation: ${SPINNER_ANIMATION_NAME} 0.8s linear infinite;
}

.snui-button--size-compact {
  padding-inline: var(--snui-space-3);
}

.snui-button--shape-pill {
  border-radius: 999px;
}

.snui-input {
  width: 100%;
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-sm);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
  accent-color: var(--snui-color-accent-fill);
}

.snui-input::placeholder {
  color: var(--snui-color-text-muted);
  opacity: 1;
}

.snui-input[aria-invalid="true"] {
  border-color: var(--snui-color-danger);
}

.snui-select {
  appearance: none;
  padding-inline-end: 2.5rem;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 1rem) 50%,
    calc(100% - 0.7rem) 50%;
  background-repeat: no-repeat;
  background-size: 0.35rem 0.35rem;
}

.snui-select:dir(rtl) {
  background-position:
    0.7rem 50%,
    1rem 50%;
}

.snui-textarea {
  min-height: 6rem;
  resize: vertical;
}

.snui-range {
  --snui-range-progress-color: var(--snui-color-accent-fill);
  --snui-range-track-color: var(--snui-color-border);

  appearance: none;
  width: 100%;
  min-height: var(--snui-control-min-height);
  margin: 0;
  background: transparent;
  accent-color: var(--snui-color-accent-fill);
  cursor: pointer;
}

.snui-range::-webkit-slider-runnable-track {
  height: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--snui-range-progress-color) 0 var(--snui-range-progress, 0%),
    var(--snui-range-track-color) var(--snui-range-progress, 0%)
  );
}

.snui-range:dir(rtl)::-webkit-slider-runnable-track {
  background: linear-gradient(
    to left,
    var(--snui-range-progress-color) 0 var(--snui-range-progress, 0%),
    var(--snui-range-track-color) var(--snui-range-progress, 0%)
  );
}

.snui-range::-webkit-slider-thumb {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: -0.4375rem;
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

.snui-range::-moz-range-track {
  height: 0.375rem;
  border: 0;
  border-radius: 999px;
  background: var(--snui-range-track-color);
}

.snui-range::-moz-range-progress {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--snui-range-progress-color);
}

.snui-range::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

.snui-range[aria-invalid="true"] {
  --snui-range-progress-color: var(--snui-color-danger);
  --snui-range-track-color: var(--snui-color-danger);
}

.snui-checkbox {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--snui-space-1) var(--snui-space-3);
  align-items: start;
  min-height: var(--snui-control-min-height);
  padding-block: var(--snui-space-2);
  cursor: pointer;
}

.snui-checkbox__input {
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
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast);
}

.snui-checkbox:hover .snui-checkbox__input:not(:disabled):not([aria-invalid="true"]) {
  border-color: var(--snui-color-accent-fill);
}

.snui-checkbox__input::before {
  width: 0.65rem;
  height: 0.36rem;
  border-color: var(--snui-color-on-accent);
  border-style: solid;
  border-width: 0 0 0.15rem 0.15rem;
  content: "";
  opacity: 0;
  transform: translateY(-0.08rem) rotate(-45deg);
}

.snui-checkbox__input:checked,
.snui-checkbox__input:indeterminate {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

.snui-checkbox__input:checked::before {
  opacity: 1;
}

.snui-checkbox__input:indeterminate::before {
  height: 0;
  border-width: 0 0 0.15rem;
  opacity: 1;
  transform: none;
}

.snui-checkbox__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: 650;
  overflow-wrap: anywhere;
}

.snui-checkbox__description {
  grid-column: 2;
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.snui-checkbox__error {
  grid-column: 2;
  min-width: 0;
  color: var(--snui-color-danger);
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.snui-checkbox__input[aria-invalid="true"] {
  border-color: var(--snui-color-danger);
}

.snui-segmented {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.snui-segmented__group {
  display: inline-flex;
  max-width: 100%;
  padding: 0.375rem;
  overflow-x: auto;
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

.snui-segmented__option {
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-1) var(--snui-space-3);
  border: 0;
  border-radius: calc(var(--snui-radius-md) - 0.375rem - 1px);
  background: transparent;
  color: var(--snui-color-text-muted);
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--snui-transition-fast),
    color var(--snui-transition-fast);
}

.snui-segmented__option:not(:disabled):not([aria-checked="true"]):hover {
  background: var(--snui-color-interactive-hover);
  color: var(--snui-color-text);
}

.snui-segmented__option:not(:disabled):not([aria-checked="true"]):active {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-interactive-hover)
  );
}

.snui-segmented__option[aria-checked="true"] {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

.snui-segmented__option[aria-checked="true"]:not(:disabled):hover,
.snui-segmented__option[aria-checked="true"]:not(:disabled):active {
  background: var(--snui-color-accent-fill-hover);
}

.snui-button:disabled,
.snui-input:disabled,
.snui-range:disabled,
.snui-segmented:not([aria-disabled="true"]) .snui-segmented__option:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.snui-button[aria-disabled="true"] {
  cursor: not-allowed;
}

.snui-button[aria-disabled="true"]:not(:disabled):not([aria-busy="true"]) .snui-button__content,
.snui-button[aria-disabled="true"]:not(:disabled):not([aria-busy="true"]) .snui-button__spinner {
  opacity: 0.58;
}

.snui-checkbox:has(.snui-checkbox__input:disabled),
.snui-segmented[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.58;
}

.snui-checkbox:has(.snui-checkbox__input:disabled) .snui-checkbox__input,
.snui-segmented[aria-disabled="true"] .snui-segmented__option {
  cursor: not-allowed;
  opacity: 1;
}

@media (forced-colors: active) {
  .snui-button__spinner {
    forced-color-adjust: none;
    border-color: CanvasText;
    border-inline-end-color: Canvas;
  }

  .snui-select {
    appearance: auto;
    background-image: none;
  }

  .snui-checkbox__input {
    appearance: auto;
    border: 0;
    background: Canvas;
  }

  .snui-checkbox__input::before {
    content: none;
  }

  .snui-range::-webkit-slider-runnable-track,
  .snui-range:dir(rtl)::-webkit-slider-runnable-track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-range::-webkit-slider-thumb {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }

  .snui-range::-moz-range-track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-range::-moz-range-thumb {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }

  .snui-segmented__option[aria-checked="true"],
  .snui-segmented__option[aria-checked="true"]:not(:disabled):hover,
  .snui-segmented__option[aria-checked="true"]:not(:disabled):active {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}
`)}
`;
