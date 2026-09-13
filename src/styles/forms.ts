import {
  FIELD_ERROR_DECLARATIONS,
  NARROW_PANEL_QUERY,
  SURFACE_DECLARATIONS,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

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

.snui-optional-mark {
  color: var(--snui-color-text-muted);
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

.snui-field-group__legend {
  text-wrap: balance;
  grid-column: 1;
  grid-row: 1;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
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
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
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
 * Disabled text uses a measurable token rather than opacity, so the muted
 * description stays readable on every theme surface, Night included.
 */
.snui-field-group:disabled > .snui-field-group__legend,
.snui-field-group:disabled > .snui-field-group__description {
  color: var(--snui-color-text-disabled);
}

/*
 * The field's own label dims with the control it names. A field whose control
 * is held either way reads as editable at a glance otherwise, while its input
 * is not, and the group and the checkbox beside it already say so.
 */
.snui-field:has(> .snui-field__control :is(:disabled, [aria-disabled="true"]))
  > .snui-field__label {
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
 * The warning region stays mounted so its announcement is not lost; while
 * empty it leaves the flow rather than the accessibility tree, matching the
 * field error regions.
 */
.snui-checkbox-group__warning:empty {
${visuallyHiddenDeclarations()}
}

/*
 * Forced colors grays a disabled widget for itself, but a legend and a
 * description are ordinary text inside the fieldset rather than widgets, so
 * both would return to the system text color and the group would read as
 * available. GrayText restores the distinction the theme token carries
 * everywhere else.
 */
@media (forced-colors: active) {
  .snui-field-group:disabled > .snui-field-group__legend,
  .snui-field-group:disabled > .snui-field-group__description {
    forced-color-adjust: none;
    color: GrayText;
  }

  .snui-field:has(> .snui-field__control :is(:disabled, [aria-disabled="true"]))
    > .snui-field__label {
    forced-color-adjust: none;
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
