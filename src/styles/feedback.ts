import { owned, scopeStyles } from "./scope.js";

export const FEEDBACK_STYLES = scopeStyles(`
${owned(".snui-banner")} {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--snui-space-3);
}

${owned(".snui-banner__content")},
${owned(".snui-banner__body")} {
  min-width: 0;
  overflow-wrap: anywhere;
}

${owned(".snui-banner__actions")} {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

${owned(".snui-banner__dismiss")} {
  display: inline-flex;
  min-width: 0;
  min-height: var(--snui-control-min-height);
  max-width: 100%;
  align-items: center;
  padding: var(--snui-space-1) var(--snui-space-3);
  border: 1px solid currentColor;
  border-radius: var(--snui-radius-sm);
  background: transparent;
  color: var(--snui-color-text);
  font-weight: 650;
  text-align: center;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

${owned(".snui-banner__dismiss:hover")} {
  background: var(--snui-color-surface-raised);
}

${owned(".snui-banner__dismiss:active")} {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-surface-raised)
  );
  transform: translateY(1px);
}

${owned(".snui-action-bar__status:focus")} {
  border-radius: var(--snui-radius-sm);
}

@media (max-width: 37.5rem) {
  ${owned(".snui-banner")} {
    align-items: stretch;
    flex-direction: column;
  }
}
`);
