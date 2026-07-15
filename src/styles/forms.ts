import { owned, scopeStyles } from "./scope.js";

export const FORM_STYLES = scopeStyles(`
${owned(".snui-field__control")} {
  min-width: 0;
}

${owned(".snui-field--compact")} {
  gap: 0.125rem;
}

${owned(".snui-field--inline")} {
  grid-template-columns: minmax(9rem, 1fr) minmax(0, 2fr);
  column-gap: var(--snui-space-4);
}

${owned(".snui-field--inline .snui-field__label")} {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}

${owned(".snui-field--inline .snui-field__description")} {
  grid-column: 1;
}

${owned(".snui-field--inline .snui-field__control")} {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}

${owned(".snui-field--inline .snui-field__error")} {
  grid-column: 2;
}

${owned(".snui-input-group")} {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

${owned(".snui-input-group--compact")} {
  gap: var(--snui-space-1);
}

${owned(".snui-input-group > .snui-input")},
${owned(".snui-input-group > .snui-range")} {
  width: auto;
  min-width: 7rem;
  flex: 1 1 12rem;
}

${owned(".snui-input-group__control")} {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--snui-space-1);
}

${owned(".snui-input-group__control--grow")} {
  min-width: 7rem;
  flex: 1 1 12rem;
}

${owned(".snui-input-group__control--grow > .snui-input")},
${owned(".snui-input-group__control--grow > .snui-range")} {
  width: 100%;
}

${owned(".snui-input-group__control--fixed")} {
  flex: 0 0 auto;
  white-space: nowrap;
}

${owned(".snui-input-group__control--fixed > .snui-input")} {
  width: 7rem;
  min-width: 0;
  flex: none;
}

${owned(".snui-input-group__addon")} {
  flex: none;
  color: var(--snui-color-text-muted);
  white-space: nowrap;
}

${owned(".snui-field-group")} {
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

${owned(".snui-field-group__legend")} {
  grid-column: 1;
  grid-row: 1;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--snui-color-text);
  font-weight: 700;
  overflow-wrap: anywhere;
}

${owned(".snui-field-group__actions")} {
  display: flex;
  grid-column: 2;
  grid-row: 1 / span 2;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-self: start;
  gap: var(--snui-space-2);
}

${owned(".snui-field-group__description")} {
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

${owned(".snui-field-group__content")} {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--snui-space-3);
  margin-top: var(--snui-space-3);
}

${owned(".snui-field-group:disabled > .snui-field-group__legend")},
${owned(".snui-field-group:disabled > .snui-field-group__description")} {
  opacity: 0.68;
}

@media (max-width: 37.5rem) {
  ${owned(".snui-field--inline")} {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    column-gap: 0;
  }

  ${owned(".snui-field--inline .snui-field__label")},
  ${owned(".snui-field--inline .snui-field__description")},
  ${owned(".snui-field--inline .snui-field__control")},
  ${owned(".snui-field--inline .snui-field__error")} {
    grid-column: 1;
    grid-row: auto;
  }

  ${owned(".snui-field-group")} {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--snui-space-3);
  }

  ${owned(".snui-field-group__actions")} {
    grid-column: 1;
    grid-row: auto;
    justify-content: flex-start;
    margin-top: var(--snui-space-2);
  }
}
`);
