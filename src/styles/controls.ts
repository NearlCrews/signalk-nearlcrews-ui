import { SPINNER_ANIMATION_NAME } from "../version.js";
import {
  BLOCKED_SELECTOR,
  CONTROL_LABEL_DECLARATIONS,
  CONTROL_ROW_DECLARATIONS,
  CONTROL_SURFACE_DECLARATIONS,
  DISABLED_DECLARATIONS,
  FIELD_DESCRIPTION_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  FIELD_MARKERS,
  FIELD_STACK_DECLARATIONS,
  FOCUS_RING_WIDTH,
  FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
  FORCED_COLORS_HIGHLIGHT_DECLARATIONS,
  FORCED_COLORS_INVALID_DECLARATIONS,
  GROUP_LEGEND_DECLARATIONS,
  NARROW_PANEL_QUERY,
  NON_LINK_DESCENDANTS,
  PRESSED_FILL_DECLARATION,
  SELECTION_GLYPH_DECLARATIONS,
  SELECTION_GLYPH_SIZE,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { COARSE_POINTER_QUERY } from "./tokens.js";

/**
 * Inset of the segmented group around its options. The option's own corner
 * radius is derived from it, so the two are written once and cannot drift.
 */
const SEGMENTED_INSET = "0.375rem";

/*
 * The inverse of BLOCKED_SELECTOR, for the live half of a hover, active, or
 * forced-colors rule. Two `:not()` arguments rather than one
 * `:not(:is(...))`, because that form weighs (0,1,0) where this one weighs
 * (0,2,0) and every button and checkbox rule below was written against the
 * heavier form. The segmented option rules use the one-argument
 * `:not(${BLOCKED_SELECTOR})` instead, at (0,1,0), and the segmented rules
 * below are weighed against that lighter form.
 */
const NOT_BLOCKED = ':not(:disabled):not([aria-disabled="true"])';

/*
 * A button blocked either way while it is not busy. A busy button keeps its
 * fill, so every disabled repaint of a button is written against this pair.
 */
function blockedIdle(button: string): string {
  return `${button}:disabled,\n${button}[aria-disabled="true"]:not([aria-busy="true"])`;
}

/* A checkbox block whose box is blocked either way. */
const BLOCKED_CHECKBOX = `.snui-checkbox:has(.snui-checkbox__input${BLOCKED_SELECTOR})`;

/*
 * The fill of a disabled control that paints an accent or a selected fill.
 * DISABLED_DECLARATIONS recolors text alone, so such a control restates its
 * fill beside it, in the same token.
 */
const DISABLED_FILL_DECLARATIONS = `  background: var(--snui-color-text-disabled);
  color: var(--snui-color-surface);`;

/*
 * Where a checkbox's description and error start: past the box and the gap
 * the control row leaves after it, so the messages line up with the label.
 */
const CHECKBOX_MESSAGE_INSET = `calc(${SELECTION_GLYPH_SIZE} + var(--snui-space-3))`;

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
  /*
   * A button states its own type size rather than inheriting the surface's,
   * so an action in a small-text slot such as a card footer stays the size of
   * every other button.
   */
  font-size: var(--snui-font-size);
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
}

.snui-button${NOT_BLOCKED}:active {
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
  .snui-button--primary${NOT_BLOCKED}:hover {
    background: var(--snui-color-accent-fill-hover);
  }
}

.snui-button--secondary {
  border-color: var(--snui-color-border);
  background: var(--snui-color-surface);
  color: var(--snui-color-text);
}

@media (hover: hover) {
  .snui-button--secondary${NOT_BLOCKED}:hover,
  .snui-button--ghost${NOT_BLOCKED}:hover {
    border-color: var(--snui-color-accent-fill);
    background: var(--snui-color-interactive-hover);
  }
}

.snui-button--secondary${NOT_BLOCKED}:active,
.snui-button--ghost${NOT_BLOCKED}:active {
${PRESSED_FILL_DECLARATION}
}

.snui-button--ghost {
  background: transparent;
  color: var(--snui-color-text);
}

/*
 * The dashed border is the danger variant's non-color cue, and it is drawn in
 * every theme rather than only under forced colors. Night caps every
 * foreground's red, so danger and the ordinary border sit about 1.5:1 apart
 * there and a destructive action would otherwise read as an ordinary
 * secondary button to a dark-adapted eye at the helm.
 */
.snui-button--danger {
  border-color: var(--snui-color-danger);
  border-style: dashed;
  background: transparent;
  color: var(--snui-color-danger);
}

@media (hover: hover) {
  .snui-button--danger${NOT_BLOCKED}:hover {
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

/*
 * The list-line form. A dense row is a line of text with columns of its own,
 * not an action to centre, so the content reads from the leading edge and the
 * horizontal padding goes; the target height, the focus ring, and the blocked
 * and busy presentation stay, because the row is still what the user presses.
 * It follows the size modifiers so a compact row keeps the flush edge.
 */
.snui-button--text {
  justify-content: start;
  padding-inline: 0;
  background: transparent;
  color: var(--snui-color-text);
  /* A list line reads as part of its row, at the row's own size. */
  font-size: inherit;
  font-weight: var(--snui-font-weight-medium);
  text-align: start;
}

.snui-button--text > .snui-button__content {
  justify-content: start;
}

/*
 * A button whose blocked reason is drawn: the button and a muted line under
 * it travel as one item, so a row of actions keeps each reason beside its own
 * button.
 */
.snui-button-reason {
  display: inline-flex;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--snui-space-1);
}

.snui-button-reason--full-width {
  display: flex;
  width: 100%;
  align-items: stretch;
}

.snui-button-reason__text {
${FIELD_DESCRIPTION_DECLARATIONS}
}

/*
 * The control floor sets the height of a single-line field, as it does a
 * button's, so the block padding is the small step rather than the gap token
 * that grows on a coarse pointer: an input and the button beside it stand at
 * exactly the same 40 or 44 pixels, and the text stays centered. Textarea
 * restores its own inset.
 */
.snui-input {
  width: 100%;
  min-height: var(--snui-control-min-height);
  padding: var(--snui-space-1) var(--snui-space-3);
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

/*
 * Color alone cannot carry the refusal. Night caps every foreground's red, so
 * the danger border sits about 1.5:1 from the ordinary one and the operator
 * cannot see which field the panel is refusing. The dashed outline is the
 * shape cue that survives the cap, and it stands aside while the field is
 * focused, because the focus ring owns the outline there.
 */
.snui-input[aria-invalid="true"]:not(:focus-visible) {
  outline: 1px dashed var(--snui-color-danger);
  outline-offset: 1px;
}

.snui-input--monospace {
  font-family: var(--snui-font-family-mono);
}

/*
 * iOS Safari zooms the page when a focused control's font size is below
 * 16px. Coarse pointers already get the taller control floor, so the same
 * query lifts text controls to at least 1rem without touching desktop type.
 */
@media ${COARSE_POINTER_QUERY} {
  .snui-input {
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
${FIELD_STACK_DECLARATIONS}
}

.snui-checkbox__control {
${CONTROL_ROW_DECLARATIONS}
}

.snui-checkbox__input {
  appearance: none;
${SELECTION_GLYPH_DECLARATIONS}
  border-radius: 0.25rem;
  accent-color: var(--snui-color-accent-fill);
  cursor: pointer;
}

@media (hover: hover) {
  .snui-checkbox__control:hover .snui-checkbox__input${NOT_BLOCKED}:not([aria-invalid="true"]) {
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
${CONTROL_LABEL_DECLARATIONS}
}

.snui-checkbox__description,
.snui-checkbox__reason {
${FIELD_DESCRIPTION_DECLARATIONS}
  padding-inline-start: ${CHECKBOX_MESSAGE_INSET};
}

.snui-checkbox__error {
  padding-inline-start: ${CHECKBOX_MESSAGE_INSET};
${FIELD_ERROR_DECLARATIONS}
}

/* Nothing occupies the box column, so the messages start at the edge. */
.snui-checkbox--label-hidden > :is(.snui-checkbox__description, .snui-checkbox__reason, .snui-checkbox__error) {
  padding-inline-start: 0;
}

.snui-checkbox__input[aria-invalid="true"] {
  border-color: var(--snui-color-danger);
}

.snui-segmented {
  min-width: 0;
}

.snui-segmented__legend {
  display: block;
  margin-block-end: var(--snui-space-2);
${GROUP_LEGEND_DECLARATIONS}
}

.snui-segmented__description {
${FIELD_DESCRIPTION_DECLARATIONS}
  display: block;
  margin-block-end: var(--snui-space-2);
}

.snui-segmented__error {
${FIELD_ERROR_DECLARATIONS}
  display: block;
  margin-block-start: var(--snui-space-2);
}

/*
 * The track is the only edge of an interactive control, so it keeps the
 * control boundary token rather than the subtle container outline.
 */
.snui-segmented__group {
${CONTROL_SURFACE_DECLARATIONS}
  display: inline-flex;
  max-width: 100%;
  padding: ${SEGMENTED_INSET};
  overflow-x: auto;
}

.snui-segmented__group--vertical {
  flex-direction: column;
  align-items: stretch;
  overflow-x: visible;
  overflow-y: auto;
}

/*
 * A narrow panel wraps the options onto a second row rather than scrolling
 * them: a sideways scroller inside a group carries no affordance, so the last
 * option would sit off the edge with nothing saying it is there.
 */
${NARROW_PANEL_QUERY} {
  .snui-segmented__group {
    display: flex;
    flex-wrap: wrap;
    overflow-x: visible;
  }
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
  border-radius: calc(var(--snui-radius-md) - ${SEGMENTED_INSET} - 1px);
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
  .snui-segmented__option:not(${BLOCKED_SELECTOR}):not([aria-checked="true"]):hover {
    background: var(--snui-color-interactive-hover);
    color: var(--snui-color-text);
  }
}

.snui-segmented__option:not(${BLOCKED_SELECTOR}):not([aria-checked="true"]):active {
${PRESSED_FILL_DECLARATION}
}

.snui-segmented__option[aria-checked="true"] {
  background: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

@media (hover: hover) {
  .snui-segmented__option[aria-checked="true"]:not(${BLOCKED_SELECTOR}):hover {
    background: var(--snui-color-accent-fill-hover);
  }
}

.snui-segmented__option[aria-checked="true"]:not(${BLOCKED_SELECTOR}):active {
  background: var(--snui-color-accent-fill-hover);
}

/*
 * Disabled text is a measured token rather than an opacity, so the fragment
 * recolors text and every control that paints an accent fill or a selected
 * state repaints that fill in the same token. A busy button keeps its fill:
 * the spinner and description already say why it is unavailable.
 */
${blockedIdle(".snui-button")},
.snui-input:disabled,
.snui-segmented__option:disabled {
${DISABLED_DECLARATIONS}
}

${blockedIdle(".snui-button--secondary")},
${blockedIdle(".snui-button--danger")} {
  border-color: var(--snui-color-text-disabled);
}

${blockedIdle(".snui-button--primary")} {
${DISABLED_FILL_DECLARATIONS}
}

.snui-button[aria-disabled="true"] {
  cursor: not-allowed;
}

${BLOCKED_CHECKBOX},
.snui-segmented[aria-disabled="true"] {
${DISABLED_DECLARATIONS}
}

${BLOCKED_CHECKBOX} > .snui-checkbox__control,
${BLOCKED_CHECKBOX} .snui-checkbox__input,
.snui-segmented[aria-disabled="true"] .snui-segmented__option,
.snui-segmented[aria-readonly="true"] .snui-segmented__option {
  cursor: not-allowed;
}

.snui-checkbox__input${BLOCKED_SELECTOR} {
  border-color: var(--snui-color-text-disabled);
}

/*
 * The label sets its own text color, so it does not inherit the blocked
 * block's; it dims with the box, the way a blocked field's label does. The
 * required and optional markers set colors of their own too, so they are
 * named here rather than left stronger than the text they annotate.
 */
${BLOCKED_CHECKBOX} .snui-checkbox__label,
${BLOCKED_CHECKBOX} .snui-checkbox__label ${FIELD_MARKERS} {
  color: var(--snui-color-text-disabled);
}

.snui-checkbox__input${BLOCKED_SELECTOR}:checked,
.snui-checkbox__input${BLOCKED_SELECTOR}:indeterminate {
  border-color: var(--snui-color-text-disabled);
  background: var(--snui-color-text-disabled);
}

.snui-checkbox__input${BLOCKED_SELECTOR}::before {
  border-color: var(--snui-color-surface);
}

/*
 * The blocked selector keeps its :not(:disabled): that puts the fill one step
 * above the blocked text rule below, whose color it replaces.
 */
.snui-segmented__option:disabled[aria-checked="true"],
.snui-segmented[aria-disabled="true"] .snui-segmented__option[aria-checked="true"],
.snui-segmented__option[aria-disabled="true"][aria-checked="true"]:not(:disabled) {
${DISABLED_FILL_DECLARATIONS}
}

/*
 * An option blocked through ariaDisabled keeps its tab stop and paints as a
 * natively disabled one. The live hover and press rules exclude it, so its
 * resting look holds through both, because nothing it would do on a press is
 * going to happen.
 */
.snui-segmented__option[aria-disabled="true"]:not(:disabled) {
${DISABLED_DECLARATIONS}
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens every variant to the same system button, which
   * erases the primary emphasis and the danger distinction. Reconstruct
   * both: primary takes the system highlight, and danger keeps a dashed
   * outline, matching the invalid-control reconstruction below.
   */
  .snui-button--primary,
  .snui-button--primary${NOT_BLOCKED}:hover {
${FORCED_COLORS_HIGHLIGHT_DECLARATIONS}
  }

  /*
   * Danger, ghost, and secondary are each written out in system colors, so a
   * button inside a surface that opted out of forced-color adjustment (the
   * inline confirmation, a banner body) still paints in them rather than
   * inheriting the opt-out with the author theme. Danger and ghost share the
   * canvas fill; secondary below keeps the button face.
   */
  .snui-button--danger,
  .snui-button--danger${NOT_BLOCKED}:hover,
  .snui-button--ghost,
  .snui-button--ghost${NOT_BLOCKED}:hover {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
    color: ButtonText;
  }

  /*
   * The dashed outline sits on the resting rule alone: restated with the
   * hover colors, it would outweigh the focus ring below and bring the
   * dashes back over it while the pointer rests on a focused button.
   */
  .snui-button--danger {
    outline: 2px dashed ButtonText;
    outline-offset: 1px;
  }

  .snui-button--secondary,
  .snui-button--secondary${NOT_BLOCKED}:hover {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  /*
   * A blocked button paints GrayText in every variant. The rule takes the
   * blocked rules' own weight, so the theme's disabled token never reaches
   * the system palette, and it leaves a busy button its variant, as every
   * theme does. Primary drops its highlight fill with the state.
   */
  ${blockedIdle(".snui-button")} {
    border-color: GrayText;
    color: GrayText;
    opacity: 1;
  }

  ${blockedIdle(".snui-button--primary")} {
    background: ButtonFace;
  }

  /*
   * Danger's dashed outline dims with its text, except while the focus ring
   * owns the outline; a natively disabled button takes no focus.
   */
  .snui-button--danger:disabled,
  .snui-button--danger[aria-disabled="true"]:not([aria-busy="true"]):not(:focus-visible) {
    outline-color: GrayText;
  }

  /*
   * Every piece of label text takes the system color, the markers included,
   * except a link: a disabled box does not disable it, so it keeps the
   * system link color. Nothing opts out of forced colors here: that opt-out
   * inherits, and it would hand the label's descendants their theme colors
   * back. A system color the author names paints as it is either way.
   */
  ${BLOCKED_CHECKBOX} .snui-checkbox__label,
  ${BLOCKED_CHECKBOX} .snui-checkbox__label ${NON_LINK_DESCENDANTS} {
    color: GrayText;
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
${FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS}
  }

  /*
   * While focused, danger's solid ring replaces its dashed state outline. It
   * is one pixel wider than the shared width and set further out, so focus
   * reads as a new line rather than as the state outline turning solid.
   */
  .snui-button--danger:focus-visible {
    outline: calc(${FOCUS_RING_WIDTH} + 1px) solid CanvasText;
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
   * which forced colors preserves, rather than with color. It stands aside
   * while the control has visible focus, because the ring owns the outline
   * there and this rule would otherwise outweigh it. A select carries the
   * input class, so the first selector covers it.
   */
  .snui-input[aria-invalid="true"]:not(:focus-visible),
  .snui-checkbox__input[aria-invalid="true"]:not(:focus-visible) {
${FORCED_COLORS_INVALID_DECLARATIONS}
  }

  .snui-segmented__option[aria-checked="true"],
  .snui-segmented__option[aria-checked="true"]:not(${BLOCKED_SELECTOR}):hover,
  .snui-segmented__option[aria-checked="true"]:not(${BLOCKED_SELECTOR}):active {
${FORCED_COLORS_HIGHLIGHT_DECLARATIONS}
  }

  /*
   * A selected option that is disabled or blocked keeps its fill, in
   * GrayText. The rule restates the themed disabled fills selector for
   * selector, so it takes their weight and the theme's disabled token never
   * reaches the system palette through the opt-out above.
   */
  .snui-segmented__option:disabled[aria-checked="true"],
  .snui-segmented[aria-disabled="true"] .snui-segmented__option[aria-checked="true"],
  .snui-segmented__option[aria-disabled="true"][aria-checked="true"]:not(:disabled) {
    background: GrayText;
    color: Canvas;
  }

  /* The system grays a natively disabled option; a blocked one is told to. */
  .snui-segmented__option[aria-disabled="true"]:not([aria-checked="true"]):not(:disabled) {
    color: GrayText;
  }
}
`)}
`;
