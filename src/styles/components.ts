import { owned, scopeStyles } from "./scope.js";

export const COMPONENT_STYLES = scopeStyles(`
${owned(".snui-section")} {
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

${owned(".snui-section__header")} {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--snui-space-4);
}

${owned(".snui-section__header > *")} {
  min-width: 0;
  max-width: 100%;
}

${owned(".snui-section__heading-group")} {
  min-width: 0;
  max-width: 100%;
}

${owned(".snui-section__actions")} {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--snui-space-2);
}

${owned(".snui-section__actions > *")} {
  min-width: 0;
  max-width: 100%;
}

${owned(".snui-section__title")} {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text);
  font-size: 1.125rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

${owned(".snui-section__description")} {
  min-width: 0;
  margin: var(--snui-space-1) 0 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

${owned(".snui-section > :not(.snui-section__header) + :not(.snui-section__header)")} {
  margin-top: var(--snui-space-3);
}

${owned(".snui-field")} {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

${owned(".snui-field__label")} {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: 650;
  overflow-wrap: anywhere;
}

${owned(".snui-field__description")} {
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

${owned(".snui-field__error")} {
  min-width: 0;
  color: var(--snui-color-danger);
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

${owned(".snui-required-mark")} {
  color: var(--snui-color-danger);
}

${owned(".snui-disclosure")} {
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

${owned(".snui-disclosure__summary")} {
  display: flex;
  min-width: 0;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-3);
  color: var(--snui-color-text);
  font-weight: 650;
  cursor: pointer;
  list-style: none;
  transition: background-color var(--snui-transition-fast);
}

${owned(".snui-disclosure__summary:hover")} {
  background: var(--snui-color-interactive-hover);
}

${owned(".snui-disclosure__summary:active")} {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-interactive-hover)
  );
}

${owned(".snui-disclosure__title")} {
  min-width: 0;
  overflow-wrap: anywhere;
}

${owned(".snui-disclosure__summary::-webkit-details-marker")} {
  display: none;
}

${owned(".snui-disclosure__chevron")} {
  transition: transform var(--snui-transition-fast);
}

${owned(".snui-disclosure__chevron:dir(rtl)")} {
  transform: scaleX(-1);
}

${owned(".snui-disclosure[open] .snui-disclosure__chevron")} {
  transform: rotate(90deg);
}

${owned(".snui-disclosure[open] .snui-disclosure__chevron:dir(rtl)")} {
  transform: scaleX(-1) rotate(90deg);
}

${owned(".snui-disclosure__content")} {
  min-width: 0;
  padding: 0 var(--snui-space-3) var(--snui-space-3);
  overflow-wrap: anywhere;
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

${owned(".snui-banner__tone-icon")} {
  display: inline-grid;
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  color: var(--snui-color-info);
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1;
}

${owned(".snui-banner--success .snui-banner__tone-icon")} { color: var(--snui-color-success); }
${owned(".snui-banner--warning .snui-banner__tone-icon")} { color: var(--snui-color-warning); }
${owned(".snui-banner--danger .snui-banner__tone-icon")} { color: var(--snui-color-danger); }

${owned(".snui-banner__body > :first-child")} { margin-top: 0; }
${owned(".snui-banner__body > :last-child")} { margin-bottom: 0; }

${owned(".snui-status")} {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--snui-space-2);
  color: var(--snui-color-text);
  overflow-wrap: anywhere;
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
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: center;
  justify-content: space-between;
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
  min-width: 0;
  max-width: 100%;
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
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

${owned(".snui-inline-confirm__message")} {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

${owned(".snui-inline-confirm__actions")} {
  display: flex;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  justify-content: flex-end;
}

@container snui-panel (max-width: 37.5rem) {
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

  ${owned(".snui-section__actions")} {
    width: 100%;
    justify-content: flex-start;
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
