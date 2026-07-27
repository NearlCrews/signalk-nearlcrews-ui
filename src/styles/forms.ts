import { scopeStyles } from "./scope.js";

export const FORM_STYLES = scopeStyles(`
.snui-field__control {
  min-width: 0;
}

.snui-field--compact {
  gap: calc(var(--snui-space-1) / 2);
}

.snui-field--inline {
  grid-template-columns: minmax(9rem, 1fr) minmax(0, 2fr);
  column-gap: var(--snui-space-4);
}

.snui-field--inline .snui-field__label {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}

.snui-field--inline .snui-field__description {
  grid-column: 1;
}

.snui-field--inline .snui-field__control {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}

.snui-field--inline .snui-field__error {
  grid-column: 2;
}

.snui-input-group {
  --snui-input-group-control-min: 7rem;
  --snui-input-group-control-basis: 12rem;

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

.snui-field-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--snui-space-3);
  min-width: 0;
  padding: var(--snui-space-4);
  margin: 0;
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

.snui-field-group__legend {
  grid-column: 1;
  grid-row: 1;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--snui-color-text);
  font-weight: 700;
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
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-field-group__content {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--snui-space-3);
  margin-top: var(--snui-space-3);
}

.snui-field-group:disabled > .snui-field-group__legend,
.snui-field-group:disabled > .snui-field-group__description {
  opacity: 0.68;
}

@container snui-panel (max-width: 37.5rem) {
  .snui-field--inline {
    grid-template-columns: minmax(0, 1fr);
    column-gap: 0;
  }

  .snui-field--inline .snui-field__label,
  .snui-field--inline .snui-field__description,
  .snui-field--inline .snui-field__control,
  .snui-field--inline .snui-field__error {
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
    margin-top: var(--snui-space-2);
  }

  .snui-field-group__content {
    grid-row: 4;
  }
}
`);
