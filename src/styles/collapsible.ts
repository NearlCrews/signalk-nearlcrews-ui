import { owned, scopeStyles } from "./scope.js";

export const COLLAPSIBLE_STYLES = scopeStyles(`
${owned(".snui-collapsible")} {
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

${owned(".snui-collapsible__header")} {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
}

${owned(".snui-collapsible__heading")} {
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  font: inherit;
}

${owned(".snui-collapsible__toggle")} {
  display: flex;
  width: 100%;
  min-height: var(--snui-control-min-height);
  min-width: 0;
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-1);
  border: 0;
  border-radius: var(--snui-radius-sm);
  background: transparent;
  color: var(--snui-color-text);
  font-weight: 700;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--snui-transition-fast);
}

${owned(".snui-collapsible__toggle:not(:disabled):hover")} {
  background: var(--snui-color-surface-raised);
}

${owned(".snui-collapsible__toggle:not(:disabled):active")} {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-surface-raised)
  );
}

${owned(".snui-collapsible__toggle:disabled")} {
  cursor: not-allowed;
  opacity: 0.58;
}

${owned(".snui-collapsible__title")} {
  min-width: 0;
  overflow-wrap: anywhere;
}

${owned(".snui-collapsible__chevron")} {
  flex: none;
  transition: transform var(--snui-transition-fast);
}

${owned('.snui-collapsible__toggle[aria-expanded="true"] .snui-collapsible__chevron')} {
  transform: rotate(90deg);
}

${owned(".snui-collapsible__actions")} {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
}

${owned(".snui-collapsible__actions > *")} {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

${owned(".snui-collapsible__summary")} {
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

${owned(".snui-collapsible__summary--header")} {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

${owned(".snui-collapsible__summary--below")} {
  padding: 0 var(--snui-space-4) var(--snui-space-3);
}

${owned(".snui-collapsible__content")} {
  padding: var(--snui-space-3) var(--snui-space-4) var(--snui-space-4);
  border-top: 1px solid var(--snui-color-border);
}

@media (max-width: 37.5rem) {
  ${owned(".snui-collapsible__header")} {
    align-items: center;
  }

  ${owned(".snui-collapsible__heading")} {
    flex-basis: 100%;
  }

  ${owned(".snui-collapsible__summary--header")} {
    padding-inline-start: calc(var(--snui-space-3) + 1em);
  }

  ${owned(".snui-collapsible__actions")} {
    padding-inline-start: calc(var(--snui-space-3) + 1em);
  }
}
`);
