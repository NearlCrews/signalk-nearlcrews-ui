import { owned, scopeStyles } from "./scope.js";

export const COMPONENT_STYLES = scopeStyles(`
${owned(".snui-section")} {
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

${owned(".snui-section + .snui-section")} {
  margin-top: var(--snui-space-4);
}

${owned(".snui-section__header")} {
  display: flex;
  gap: var(--snui-space-3);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--snui-space-4);
}

${owned(".snui-section__title")} {
  margin: 0;
  color: var(--snui-color-text);
  font-size: 1.125rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

${owned(".snui-section__description")} {
  margin: var(--snui-space-1) 0 0;
  color: var(--snui-color-text-muted);
}

${owned(".snui-section > :not(.snui-section__header) + :not(.snui-section__header)")} {
  margin-top: var(--snui-space-3);
}

${owned(".snui-field")} {
  display: grid;
  gap: var(--snui-space-1);
}

${owned(".snui-field + .snui-field")} {
  margin-top: var(--snui-space-3);
}

${owned(".snui-field__label")} {
  color: var(--snui-color-text);
  font-weight: 650;
}

${owned(".snui-field__description")} {
  color: var(--snui-color-text-muted);
  font-size: 0.875rem;
}

${owned(".snui-field__error")} {
  color: var(--snui-color-danger);
  font-size: 0.875rem;
  font-weight: 600;
}

${owned(".snui-required-mark")} {
  color: var(--snui-color-danger);
}

${owned(".snui-disclosure")} {
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

${owned(".snui-disclosure + .snui-disclosure")} {
  margin-top: var(--snui-space-3);
}

${owned(".snui-disclosure__summary")} {
  display: flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-3);
  color: var(--snui-color-text);
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

${owned(".snui-disclosure__summary::-webkit-details-marker")} {
  display: none;
}

${owned(".snui-disclosure__chevron")} {
  transition: transform var(--snui-transition-fast);
}

${owned(".snui-disclosure[open] .snui-disclosure__chevron")} {
  transform: rotate(90deg);
}

${owned(".snui-disclosure__content")} {
  padding: 0 var(--snui-space-3) var(--snui-space-3);
}

${owned(".snui-banner")} {
  padding: var(--snui-space-3) var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-inline-start-width: 0.3rem;
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
}

${owned(".snui-banner--info")} { border-inline-start-color: var(--snui-color-info); }
${owned(".snui-banner--success")} { border-inline-start-color: var(--snui-color-success); }
${owned(".snui-banner--warning")} { border-inline-start-color: var(--snui-color-warning); }
${owned(".snui-banner--danger")} { border-inline-start-color: var(--snui-color-danger); }

${owned(".snui-banner__title")} {
  margin: 0 0 var(--snui-space-1);
  font-weight: 700;
}

${owned(".snui-banner__body > :first-child")} { margin-top: 0; }
${owned(".snui-banner__body > :last-child")} { margin-bottom: 0; }

${owned(".snui-status")} {
  display: inline-flex;
  align-items: center;
  gap: var(--snui-space-2);
  color: var(--snui-color-text);
}

${owned(".snui-status__dot")} {
  width: 0.7rem;
  height: 0.7rem;
  flex: none;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: currentColor;
}

${owned(".snui-status--neutral")} { color: var(--snui-color-text-muted); }
${owned(".snui-status--info")} { color: var(--snui-color-info); }
${owned(".snui-status--success")} { color: var(--snui-color-success); }
${owned(".snui-status--warning")} { color: var(--snui-color-warning); }
${owned(".snui-status--danger")} { color: var(--snui-color-danger); }

${owned(".snui-action-bar")} {
  display: flex;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: center;
  justify-content: space-between;
  margin-top: var(--snui-space-4);
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
  background: color-mix(in srgb, var(--snui-color-surface) 94%, transparent);
  box-shadow: var(--snui-shadow-raised);
  backdrop-filter: blur(0.4rem);
}

${owned(".snui-action-bar--sticky")} {
  position: sticky;
  z-index: 2;
  bottom: 0;
}

${owned(".snui-action-bar__actions")} {
  display: flex;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  margin-inline-start: auto;
}

${owned(".snui-inline-confirm")} {
  display: grid;
  gap: var(--snui-space-3);
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-warning);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

${owned(".snui-inline-confirm__title")} {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

${owned(".snui-inline-confirm__message")} {
  margin: 0;
  color: var(--snui-color-text-muted);
}

${owned(".snui-inline-confirm__actions")} {
  display: flex;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  justify-content: flex-end;
}

@media (max-width: 37.5rem) {
  ${owned(".snui-section")} {
    padding: var(--snui-space-3);
  }

  ${owned(".snui-section__header")},
  ${owned(".snui-action-bar")} {
    align-items: stretch;
    flex-direction: column;
  }

  ${owned(".snui-action-bar__actions")} {
    width: 100%;
    margin-inline-start: 0;
  }

  ${owned(".snui-action-bar__actions > .snui-button")} {
    flex: 1 1 auto;
  }
}

@media (forced-colors: active) {
  ${owned(".snui-status__dot")} {
    border-color: CanvasText;
    background: CanvasText;
  }
}
`);
