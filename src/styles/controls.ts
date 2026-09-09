import { SPINNER_ANIMATION_NAME, versionedAnimationName } from "../version.js";
import {
  DISABLED_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  focusRingDeclarations,
  PRESSED_FILL_DECLARATION,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { toneColorRules } from "./tone-rules.js";

const PROGRESS_INDETERMINATE_ANIMATION =
  versionedAnimationName("progress-slide");

/**
 * Edge of the checkbox box. The description and the error sit outside the
 * label, so they indent by this plus the control's column gap to line up
 * under the label text.
 */
const CHECKBOX_BOX_SIZE = "1.25rem";

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

/*
 * Every raw :hover rule sits behind (hover: hover). On a touch screen the
 * hover state latches after a tap until the next tap elsewhere, so a stuck
 * hover fill would read as a stuck state.
 */
@media (hover: hover) {
  .snui-button--primary:not(:disabled):not([aria-disabled="true"]):hover {
    background: var(--snui-color-accent-fill-hover);
  }
}

.snui-button--secondary {
  border-color: var(--snui-color-border);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
}

@media (hover: hover) {
  .snui-button--secondary:not(:disabled):not([aria-disabled="true"]):hover,
  .snui-button--ghost:not(:disabled):not([aria-disabled="true"]):hover {
    border-color: var(--snui-color-accent-fill);
    background: var(--snui-color-interactive-hover);
  }
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

@media (hover: hover) {
  .snui-button--danger:not(:disabled):not([aria-disabled="true"]):hover {
    background: var(--snui-color-danger-subtle);
  }
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

/*
 * A compact button holding one glyph sizes to that glyph, which clears the
 * target floor in height and misses it in width. The floor belongs to the
 * control, so it carries the same token in both axes and stays at least square.
 */
.snui-button--size-compact {
  min-inline-size: var(--snui-control-min-height);
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
  min-inline-size: var(--snui-control-min-height);
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

.snui-input--monospace {
  font-family: var(--snui-font-family-mono);
}

/*
 * iOS Safari zooms the page when a focused control's font size is below
 * 16px. Coarse pointers already get the taller control floor, so the same
 * query lifts text controls to at least 1rem without touching desktop type.
 */
@media (any-pointer: coarse) {
  .snui-input,
  .snui-select,
  .snui-textarea {
    font-size: max(1rem, var(--snui-font-size));
  }
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

/*
 * A row count replaces the fixed minimum height, and where the engine sizes
 * fields from content the control grows with its text from that floor.
 */
.snui-textarea--rows {
  min-height: auto;
  field-sizing: content;
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
  margin-block-start: calc((0.375rem - var(--snui-range-thumb-size)) / 2);
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

/*
 * The block holds the control, the description, and the error; only the
 * control is a label, so only it toggles when pressed.
 */
.snui-checkbox {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-checkbox__control {
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
  width: ${CHECKBOX_BOX_SIZE};
  height: ${CHECKBOX_BOX_SIZE};
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

@media (hover: hover) {
  .snui-checkbox__control:hover .snui-checkbox__input:not(:disabled):not([aria-invalid="true"]) {
    border-color: var(--snui-color-accent-fill);
  }
}

/*
 * A hidden label leaves the box alone in the grid, so the second column goes,
 * and the control has only its box to hit. It therefore keeps the target
 * floor in both axes and centers the box inside it.
 */
.snui-checkbox--label-hidden > .snui-checkbox__control {
  grid-template-columns: auto;
  justify-items: center;
  align-items: center;
  min-inline-size: var(--snui-control-min-height);
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
  min-width: 0;
  padding-inline-start: calc(${CHECKBOX_BOX_SIZE} + var(--snui-space-3));
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-sm);
  overflow-wrap: anywhere;
}

.snui-checkbox__error {
  padding-inline-start: calc(${CHECKBOX_BOX_SIZE} + var(--snui-space-3));
${FIELD_ERROR_DECLARATIONS}
}

/* Nothing occupies the box column, so the messages start at the edge. */
.snui-checkbox--label-hidden > :is(.snui-checkbox__description, .snui-checkbox__error) {
  padding-inline-start: 0;
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

.snui-radio__button[data-disabled] .snui-radio__control {
  border-color: var(--snui-color-text-disabled);
}

.snui-radio__button[data-disabled][data-selected] .snui-radio__control {
  background: var(--snui-color-text-disabled);
}

.snui-radio__button[data-disabled][data-selected] .snui-radio__control::before {
  background: var(--snui-color-surface);
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
  background: var(--snui-color-track);
}

.snui-progress__fill {
  height: 100%;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-accent-fill);
  transition: inline-size var(--snui-transition-fast);
}

${toneColorRules((tone) => `.snui-progress--tone-${tone} .snui-progress__fill`, "background")}

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
  margin-block-end: var(--snui-space-2);
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

/*
 * A short option sizes to its own text, which clears the target floor in
 * height and misses it in width, exactly as a compact button does. The floor
 * belongs to the control, so the option carries the same token in both axes
 * and a one-character option stays at least square.
 */
.snui-segmented__option {
  min-height: var(--snui-control-min-height);
  min-inline-size: var(--snui-control-min-height);
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

@media (hover: hover) {
  .snui-segmented__option:not(:disabled):not([aria-checked="true"]):hover {
    background: var(--snui-color-interactive-hover);
    color: var(--snui-color-text);
  }
}

.snui-segmented__option:not(:disabled):not([aria-checked="true"]):active {
${PRESSED_FILL_DECLARATION}
}

.snui-segmented__option[aria-checked="true"] {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

@media (hover: hover) {
  .snui-segmented__option[aria-checked="true"]:not(:disabled):hover {
    background: var(--snui-color-accent-fill-hover);
  }
}

.snui-segmented__option[aria-checked="true"]:not(:disabled):active {
  background: var(--snui-color-accent-fill-hover);
}

/*
 * Disabled text is a measured token rather than an opacity, so the fragment
 * recolors text and every control that paints an accent fill or a selected
 * state repaints that fill in the same token. A busy button keeps its fill:
 * the spinner and description already say why it is unavailable.
 */
.snui-button:disabled,
.snui-button[aria-disabled="true"]:not([aria-busy="true"]),
.snui-input:disabled,
.snui-range:disabled,
.snui-segmented:not([aria-disabled="true"]) .snui-segmented__option:disabled {
${DISABLED_DECLARATIONS}
}

.snui-button--secondary:disabled,
.snui-button--secondary[aria-disabled="true"]:not([aria-busy="true"]),
.snui-button--danger:disabled,
.snui-button--danger[aria-disabled="true"]:not([aria-busy="true"]) {
  border-color: var(--snui-color-text-disabled);
}

.snui-button--primary:disabled,
.snui-button--primary[aria-disabled="true"]:not([aria-busy="true"]) {
  background: var(--snui-color-text-disabled);
  color: var(--snui-color-surface);
}

.snui-button[aria-disabled="true"] {
  cursor: not-allowed;
}

.snui-range:disabled {
  --snui-range-progress-color: var(--snui-color-text-disabled);
}

.snui-range:disabled::-webkit-slider-thumb {
  background: var(--snui-color-text-disabled);
}

.snui-range:disabled::-moz-range-thumb {
  background: var(--snui-color-text-disabled);
}

.snui-checkbox:has(.snui-checkbox__input:disabled),
.snui-segmented[aria-disabled="true"] {
${DISABLED_DECLARATIONS}
}

.snui-checkbox:has(.snui-checkbox__input:disabled) > .snui-checkbox__control,
.snui-checkbox:has(.snui-checkbox__input:disabled) .snui-checkbox__input,
.snui-segmented[aria-disabled="true"] .snui-segmented__option {
  cursor: not-allowed;
}

.snui-checkbox__input:disabled {
  border-color: var(--snui-color-text-disabled);
}

.snui-checkbox__input:disabled:checked,
.snui-checkbox__input:disabled:indeterminate {
  border-color: var(--snui-color-text-disabled);
  background: var(--snui-color-text-disabled);
}

.snui-checkbox__input:disabled::before {
  border-color: var(--snui-color-surface);
}

.snui-segmented__option:disabled[aria-checked="true"],
.snui-segmented[aria-disabled="true"] .snui-segmented__option[aria-checked="true"] {
  background: var(--snui-color-text-disabled);
  color: var(--snui-color-surface);
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

  /*
   * Secondary and ghost buttons get the same explicit treatment, so a button
   * inside a surface that opted out of forced-color adjustment (the inline
   * confirmation, a banner body) still paints in system colors rather than
   * inheriting the opt-out with the author theme.
   */
  .snui-button--secondary,
  .snui-button--secondary:not(:disabled):not([aria-disabled="true"]):hover {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  .snui-button--ghost,
  .snui-button--ghost:not(:disabled):not([aria-disabled="true"]):hover {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
    color: ButtonText;
  }

  .snui-button--secondary:disabled,
  .snui-button--secondary[aria-disabled="true"],
  .snui-button--ghost:disabled,
  .snui-button--ghost[aria-disabled="true"] {
    border-color: GrayText;
    color: GrayText;
    opacity: 1;
  }

  /*
   * These controls opt out of automatic forced-color adjustment to preserve
   * their selected or danger state. Rebuild focus with system colors so the
   * author theme token cannot blend into Highlight.
   */
  .snui-button--primary:focus-visible,
  .snui-button--secondary:focus-visible,
  .snui-button--ghost:focus-visible,
  .snui-segmented__option[aria-checked="true"]:focus-visible {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }

  .snui-button--danger:focus-visible {
    outline: 3px solid CanvasText;
    outline-offset: 3px;
    box-shadow: none;
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

  .snui-radio__button[data-focus-visible] .snui-radio__control,
  .snui-switch__button[data-focus-visible] .snui-switch__track {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
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
