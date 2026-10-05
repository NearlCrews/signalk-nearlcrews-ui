import {
  BLOCKED_SELECTOR,
  FIELD_ERROR_DECLARATIONS,
  FIELD_MARKERS,
  GROUP_LEGEND_DECLARATIONS,
  MUTED_PROSE_DECLARATIONS,
  NARROW_PANEL_QUERY,
  NON_LINK_DESCENDANTS,
  SURFACE_DECLARATIONS,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

/**
 * A control that holds a value the reader edits. A plain button and a hidden
 * input hold none, so neither one keeps a label live.
 */
const VALUE_CONTROL =
  ':is(input:not([type="hidden"]), select, textarea, [role="radio"])';

/**
 * A field whose slot holds a control held either way, natively or by
 * aria-disabled, and no value control that is still live. The label names the
 * value controls in its slot, so a blocked button beside a live input, one
 * disabled option of a select or a segmented control, and a disabled
 * secondary input each leave the label live. The second half sits inside
 * :where(), so the selector keeps the weight of the first and a consumer rule
 * that outweighed the label rules before it was added still does.
 */
const BLOCKED_FIELD = `.snui-field:has(> .snui-field__control ${BLOCKED_SELECTOR}):where(:not(:has(> .snui-field__control ${VALUE_CONTROL}:not(${BLOCKED_SELECTOR}))))`;

export const FORM_STYLES = scopeStyles(`
.snui-field__control {
  min-width: 0;
}

.snui-field--compact {
  gap: var(--snui-space-1);
}

/*
 * The label column is a token so a panel can align inline labels across its
 * own fields, or widen the column for a longer language, the way the input
 * group already publishes its widths.
 */
.snui-field--inline {
  grid-template-columns: minmax(var(--snui-field-inline-label-min, 9rem), 1fr) minmax(0, 2fr);
  column-gap: var(--snui-space-4);
}

.snui-field--inline > .snui-field__label {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}

.snui-field--inline > .snui-field__description {
  grid-column: 1;
}

.snui-field--inline > .snui-field__control {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}

.snui-field--inline > .snui-field__error {
  grid-column: 2;
}

/*
 * With no description there is no second row to share: a control spanning
 * two would hand part of its height to an empty track, and the label would
 * center in a short first row above the control's middle.
 */
.snui-field--inline:not(:has(> .snui-field__description)) > .snui-field__control {
  grid-row: 1;
}

.snui-input-group {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

.snui-input-group--compact {
  gap: var(--snui-space-1);
}

.snui-input-group > .snui-input,
.snui-input-group > .snui-range {
  width: auto;
  min-width: var(--snui-input-group-control-min);
  flex: 1 1 var(--snui-input-group-control-basis);
}

.snui-input-group__control {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--snui-space-1);
}

.snui-input-group__control--grow {
  min-width: var(--snui-input-group-control-min);
  flex: 1 1 var(--snui-input-group-control-basis);
}

.snui-input-group__control--grow > .snui-input,
.snui-input-group__control--grow > .snui-range {
  width: 100%;
}

.snui-input-group__control--fixed {
  flex: 0 0 auto;
  white-space: nowrap;
}

.snui-input-group__control--fixed > .snui-input {
  width: var(--snui-input-group-control-min);
  min-width: 0;
  flex: none;
}

.snui-input-group__addon {
  flex: none;
  color: var(--snui-color-text-muted);
  white-space: nowrap;
}

/*
 * Regular weight beside the semibold label: in Night the muted color sits
 * almost on the text color, so weight is what keeps the marker apart.
 */
.snui-optional-mark {
  color: var(--snui-color-text-muted);
  font-weight: normal;
}

.snui-field-group {
${SURFACE_DECLARATIONS}
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--snui-space-3);
  min-width: 0;
  padding: var(--snui-space-4);
  margin: 0;
}

/*
 * A fieldset draws its first legend child in the top border unless that
 * legend floats, and a legend drawn there is no grid item, so the placement
 * below would never apply. Floating makes it an ordinary child: the grid
 * ignores the float, the legend takes the row beside the actions, and the
 * border runs unbroken. The fieldset is still named by its first legend,
 * floated or not. The foundation reset keeps consumer legends unfloated.
 *
 * WebKit computes float to none on every grid item (WebKit bug 220793, open
 * since 2021), so there the legend stays the rendered legend in the border
 * notch, the 0.12.0 rendering. The fieldset stays: a div named through
 * aria-labelledby would lose the native disabled state the group hands its
 * controls, and reordering the children for a float layout would change the
 * reading order in every engine.
 */
.snui-field-group__legend {
  float: inline-start;
  grid-column: 1;
  grid-row: 1;
${GROUP_LEGEND_DECLARATIONS}
}

.snui-field-group__actions {
  display: flex;
  grid-column: 2;
  grid-row: 1 / span 2;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-self: start;
  gap: var(--snui-space-2);
}

.snui-field-group__description {
${MUTED_PROSE_DECLARATIONS}
  grid-column: 1;
  grid-row: 2;
  margin-block-start: var(--snui-space-1);
}

.snui-field-group__content {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--snui-space-3);
  margin-block-start: var(--snui-space-3);
}

.snui-field-group__error {
${FIELD_ERROR_DECLARATIONS}
}

/*
 * Every field error sets its danger glyph and message side by side, the
 * message as its own item, so a wrapped line hangs past the glyph. The gap
 * after the glyph is the one every glyph in front of its own text takes.
 */
.snui-field-error__row {
  display: flex;
  align-items: baseline;
}

.snui-field-error__text {
  min-width: 0;
}

/*
 * Disabled text uses a measurable token rather than opacity, so the muted
 * description stays readable on every theme surface, Night included.
 */
.snui-field-group:disabled > .snui-field-group__legend,
.snui-field-group:disabled > .snui-field-group__description {
  color: var(--snui-color-text-disabled);
}

/*
 * The field's own label dims with the control it names, once no value control
 * in its slot is left to edit. A field whose control is held either way reads
 * as editable at a glance otherwise, while its input is not, and the group
 * and the checkbox beside it already say so. The markers set colors of their
 * own, so they are named to dim with it.
 */
${BLOCKED_FIELD} > .snui-field__label,
${BLOCKED_FIELD} > .snui-field__label ${FIELD_MARKERS} {
  color: var(--snui-color-text-disabled);
}

/*
 * The select-all box sits in the legend row. It drops the row padding but
 * keeps the control target floor, so the legend row grows to fit it.
 */
.snui-checkbox-group .snui-field-group__actions {
  align-items: center;
}

/*
 * The consumer class lands on the checkbox block, while the row padding sits
 * on the control inside it, so the reset has to reach the control.
 */
.snui-checkbox-group__select-all > .snui-checkbox__control {
  padding-block: 0;
}

.snui-checkbox-group__options {
  display: grid;
  column-gap: var(--snui-space-4);
}

/* Columns fill the available width; a narrow panel collapses to one. */
.snui-checkbox-group__options--grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--snui-grid-track-min)), 1fr));
}

.snui-checkbox-group__options--stack {
  grid-template-columns: minmax(0, 1fr);
}

/*
 * Forced colors grays a disabled widget for itself, but a legend and a
 * description are ordinary text inside the fieldset rather than widgets, so
 * both would return to the system text color and the group would read as
 * available. GrayText restores the distinction the theme token carries
 * everywhere else.
 */
@media (forced-colors: active) {
  /*
   * Each rule reaches the text's descendants as well, the markers included,
   * except a link: a disabled control or fieldset does not disable it, so it
   * keeps the system link color. None opts out of forced colors: that
   * opt-out inherits and would hand the descendants their theme colors back.
   * A system color the author names paints as it is either way.
   */
  .snui-field-group:disabled > .snui-field-group__legend,
  .snui-field-group:disabled > .snui-field-group__legend ${NON_LINK_DESCENDANTS},
  .snui-field-group:disabled > .snui-field-group__description,
  .snui-field-group:disabled > .snui-field-group__description ${NON_LINK_DESCENDANTS} {
    color: GrayText;
  }

  ${BLOCKED_FIELD} > .snui-field__label,
  ${BLOCKED_FIELD} > .snui-field__label ${NON_LINK_DESCENDANTS} {
    color: GrayText;
  }
}

${NARROW_PANEL_QUERY} {
  .snui-field--inline {
    grid-template-columns: minmax(0, 1fr);
    column-gap: 0;
  }

  .snui-field--inline > .snui-field__label,
  .snui-field--inline > .snui-field__description,
  .snui-field--inline > .snui-field__control,
  .snui-field--inline:not(:has(> .snui-field__description)) > .snui-field__control,
  .snui-field--inline > .snui-field__error {
    grid-column: 1;
    grid-row: auto;
  }

  .snui-field-group {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--snui-space-3);
  }

  .snui-field-group__actions {
    grid-column: 1;
    grid-row: 3;
    justify-content: flex-start;
    margin-block-start: var(--snui-space-2);
  }

  .snui-field-group__content {
    grid-row: 4;
  }
}
`);
