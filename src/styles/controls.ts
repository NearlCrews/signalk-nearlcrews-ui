import { SPINNER_ANIMATION_NAME } from "../version.js";
import {
  DISABLED_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  PRESSED_FILL_DECLARATION,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

/**
 * Edge of the checkbox box. The description and the error sit outside the
 * label, so they indent by this plus the control's column gap to line up
 * under the label text.
 */
const CHECKBOX_BOX_SIZE = "1.25rem";

/*
 * A control blocked either way: natively disabled, or held focusable through
 * aria-disabled so closing it on a focused control cannot destroy that focus.
 * Both arguments weigh (0,1,0) and `:is()` takes the weight of its most
 * specific argument, so writing it this way changes no rule's specificity.
 */
const BLOCKED = ':is(:disabled, [aria-disabled="true"])';

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
  .snui-select {
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
  .snui-checkbox__control:hover .snui-checkbox__input:not(:disabled):not([aria-disabled="true"]):not([aria-invalid="true"]) {
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

.snui-checkbox:has(.snui-checkbox__input${BLOCKED}),
.snui-segmented[aria-disabled="true"] {
${DISABLED_DECLARATIONS}
}

.snui-checkbox:has(.snui-checkbox__input${BLOCKED}) > .snui-checkbox__control,
.snui-checkbox:has(.snui-checkbox__input${BLOCKED}) .snui-checkbox__input,
.snui-segmented[aria-disabled="true"] .snui-segmented__option {
  cursor: not-allowed;
}

.snui-checkbox__input${BLOCKED} {
  border-color: var(--snui-color-text-disabled);
}

.snui-checkbox__input${BLOCKED}:checked,
.snui-checkbox__input${BLOCKED}:indeterminate {
  border-color: var(--snui-color-text-disabled);
  background: var(--snui-color-text-disabled);
}

.snui-checkbox__input${BLOCKED}::before {
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
  .snui-checkbox__input[aria-invalid="true"] {
    outline: 2px dashed CanvasText;
    outline-offset: 1px;
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
