import { SPINNER_ANIMATION_NAME, versionedAnimationName } from "../version.js";
import {
  DISABLED_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  focusRingDeclarations,
  PRESSED_FILL_DECLARATION,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

const PROGRESS_INDETERMINATE_ANIMATION =
  versionedAnimationName("progress-slide");

export const CONTROL_STYLES = `
@keyframes ${SPINNER_ANIMATION_NAME} {
  to { transform: rotate(1turn); }
}

@keyframes ${PROGRESS_INDETERMINATE_ANIMATION} {
  from { inset-inline-start: -40%; }
  to { inset-inline-start: 100%; }
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
  font-weight: var(--snui-font-weight-semibold);
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
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

.snui-button--secondary:not(:disabled):not([aria-disabled="true"]):active,
.snui-button--ghost:not(:disabled):not([aria-disabled="true"]):active {
${PRESSED_FILL_DECLARATION}
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
  animation: ${SPINNER_ANIMATION_NAME} var(--snui-motion-spin) linear infinite;
}

.snui-button--size-compact {
  padding-inline: var(--snui-space-3);
}

.snui-button--shape-pill {
  border-radius: var(--snui-radius-pill);
}

.snui-button--full-width {
  width: 100%;
}

.snui-button--icon-only {
  width: var(--snui-control-min-height);
  height: var(--snui-control-min-height);
  padding: 0;
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
  border-radius: var(--snui-radius-pill);
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

/*
 * The thumb opts out of native rendering, so the user-agent target-size
 * exception no longer applies to it. It scales with the density contract
 * instead of staying fixed while every other control grows.
 */
.snui-range::-webkit-slider-thumb {
  appearance: none;
  width: var(--snui-range-thumb-size);
  height: var(--snui-range-thumb-size);
  margin-top: calc((0.375rem - var(--snui-range-thumb-size)) / 2);
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

.snui-range::-moz-range-track {
  height: 0.375rem;
  border: 0;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-track-color);
}

.snui-range::-moz-range-progress {
  height: 0.375rem;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-progress-color);
}

.snui-range::-moz-range-thumb {
  width: var(--snui-range-thumb-size);
  height: var(--snui-range-thumb-size);
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
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-checkbox__description {
  grid-column: 2;
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  overflow-wrap: anywhere;
}

.snui-checkbox__error {
  grid-column: 2;
${FIELD_ERROR_DECLARATIONS}
}

.snui-checkbox__input[aria-invalid="true"] {
  border-color: var(--snui-color-danger);
}

.snui-radio-group {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-radio-group__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-radio-group__description {
  display: block;
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  overflow-wrap: anywhere;
}

.snui-radio-group__options {
  display: flex;
  flex-direction: column;
  gap: var(--snui-space-1);
}

.snui-radio-group[data-orientation="horizontal"] .snui-radio-group__options {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--snui-space-1) var(--snui-space-4);
}

.snui-radio-group__error {
${FIELD_ERROR_DECLARATIONS}
}

/*
 * The field wrapper is the component root; the interactive label inside it
 * carries every state attribute (selected, hovered, focus-visible, and the
 * rest), so all visual rules key off the button.
 */
.snui-radio__button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--snui-space-1) var(--snui-space-3);
  align-items: start;
  min-height: var(--snui-control-min-height);
  padding-block: var(--snui-space-2);
  cursor: pointer;
}

.snui-radio__control {
  display: grid;
  place-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0.125rem 0 0;
  border: 2px solid var(--snui-color-border);
  border-radius: 50%;
  background: var(--snui-color-surface);
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast);
}

.snui-radio__button[data-hovered]:not([data-disabled]) .snui-radio__control {
  border-color: var(--snui-color-accent-fill);
}

.snui-radio__control::before {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--snui-color-on-accent);
  content: "";
  opacity: 0;
}

.snui-radio__button[data-selected] .snui-radio__control {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

.snui-radio__button[data-selected] .snui-radio__control::before {
  opacity: 1;
}

.snui-radio__button[data-focus-visible] .snui-radio__control {
${focusRingDeclarations("2px", true)}
}

.snui-radio__button[data-invalid] .snui-radio__control {
  border-color: var(--snui-color-danger);
}

.snui-radio__button[data-disabled] {
${DISABLED_DECLARATIONS}
}

.snui-radio__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

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
  top: 50%;
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

.snui-switch__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-progress {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-progress__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-progress__track {
  position: relative;
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-border);
}

.snui-progress__fill {
  height: 100%;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-accent-fill);
  transition: inline-size var(--snui-transition-fast);
}

.snui-progress--tone-info .snui-progress__fill {
  background: var(--snui-color-info);
}

.snui-progress--tone-success .snui-progress__fill {
  background: var(--snui-color-success);
}

.snui-progress--tone-warning .snui-progress__fill {
  background: var(--snui-color-warning);
}

.snui-progress--tone-danger .snui-progress__fill {
  background: var(--snui-color-danger);
}

.snui-progress--indeterminate .snui-progress__fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 40%;
  animation: ${PROGRESS_INDETERMINATE_ANIMATION} 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  /*
   * The indeterminate slide stops moving rather than slowing down, so the
   * static 40 percent fill keeps signaling activity without motion.
   */
  .snui-progress--indeterminate .snui-progress__fill {
    /* Longhand: the stylesheet keyframe audit scans animation shorthands. */
    animation-name: none;
    inset-inline-start: 0;
  }
}

.snui-segmented {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.snui-segmented__legend {
  display: block;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  margin-bottom: var(--snui-space-2);
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
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

.snui-segmented__group--vertical {
  flex-direction: column;
  align-items: stretch;
  overflow-x: visible;
  overflow-y: auto;
}

.snui-segmented__option {
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-1) var(--snui-space-3);
  border: 0;
  border-radius: calc(var(--snui-radius-md) - 0.375rem - 1px);
  background: transparent;
  color: var(--snui-color-text-muted);
  font-weight: var(--snui-font-weight-semibold);
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
${PRESSED_FILL_DECLARATION}
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
${DISABLED_DECLARATIONS}
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
${DISABLED_DECLARATIONS}
}

.snui-checkbox:has(.snui-checkbox__input:disabled) .snui-checkbox__input,
.snui-segmented[aria-disabled="true"] .snui-segmented__option {
  cursor: not-allowed;
  opacity: 1;
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens every variant to the same system button, which
   * erases the primary emphasis and the danger distinction. Reconstruct
   * both: primary takes the system highlight, and danger keeps a dashed
   * outline, matching the invalid-control reconstruction below.
   */
  .snui-button--primary,
  .snui-button--primary:not(:disabled):not([aria-disabled="true"]):hover {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }

  .snui-button--danger,
  .snui-button--danger:not(:disabled):not([aria-disabled="true"]):hover {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
    color: ButtonText;
    outline: 2px dashed ButtonText;
    outline-offset: 1px;
  }

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

  /*
   * Forced colors flattens the danger border to a system color, which erases
   * the valid versus invalid distinction. Reconstruct it with an outline,
   * which forced colors preserves, rather than with color.
   */
  .snui-input[aria-invalid="true"],
  .snui-select[aria-invalid="true"],
  .snui-textarea[aria-invalid="true"],
  .snui-range[aria-invalid="true"],
  .snui-checkbox__input[aria-invalid="true"],
  .snui-radio__button[data-invalid] .snui-radio__control {
    outline: 2px dashed CanvasText;
    outline-offset: 1px;
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

  .snui-radio__control {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
  }

  .snui-radio__button[data-selected] .snui-radio__control {
    border-color: Highlight;
    background: Highlight;
  }

  .snui-radio__button[data-selected] .snui-radio__control::before {
    forced-color-adjust: none;
    background: HighlightText;
  }

  .snui-radio__button[data-hovered]:not([data-disabled]) .snui-radio__control,
  .snui-switch__button[data-hovered]:not([data-disabled]) .snui-switch__track {
    border-color: Highlight;
  }

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

  .snui-progress__track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-progress__fill {
    forced-color-adjust: none;
    background: Highlight;
  }
}
`)}
`;
