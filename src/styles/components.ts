import { scopeStyles } from "./scope.js";

export const COMPONENT_STYLES = scopeStyles(`
.snui-section {
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

.snui-section__header {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--snui-space-4);
}

.snui-section__header > * {
  min-width: 0;
  max-width: 100%;
}

.snui-section__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--snui-space-2);
}

.snui-section__actions > * {
  min-width: 0;
  max-width: 100%;
}

.snui-section__title {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text);
  font-size: 1.125rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.snui-section__description {
  min-width: 0;
  margin: var(--snui-space-1) 0 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-section > :not(.snui-section__header) + :not(.snui-section__header) {
  margin-top: var(--snui-space-3);
}

.snui-field {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-field__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: 650;
  overflow-wrap: anywhere;
}

.snui-field__description {
  min-width: 0;
  color: var(--snui-color-text-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.snui-field__error {
  min-width: 0;
  color: var(--snui-color-danger);
  font-size: 0.875rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.snui-required-mark {
  color: var(--snui-color-danger);
}

.snui-disclosure {
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

.snui-disclosure__summary {
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

.snui-disclosure__summary:hover {
  background: var(--snui-color-interactive-hover);
}

.snui-disclosure__summary:active {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-interactive-hover)
  );
}

.snui-disclosure__title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.snui-disclosure__summary::-webkit-details-marker {
  display: none;
}

.snui-disclosure__chevron {
  transition: transform var(--snui-transition-fast);
}

.snui-disclosure__chevron:dir(rtl) {
  transform: scaleX(-1);
}

.snui-disclosure[open] .snui-disclosure__chevron {
  transform: rotate(90deg);
}

.snui-disclosure[open] .snui-disclosure__chevron:dir(rtl) {
  transform: scaleX(-1) rotate(90deg);
}

.snui-disclosure__content {
  min-width: 0;
  padding: 0 var(--snui-space-3) var(--snui-space-3);
  overflow-wrap: anywhere;
}

.snui-status {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--snui-space-2);
  color: var(--snui-color-text);
  overflow-wrap: anywhere;
}

.snui-status__dot {
  width: 0.7rem;
  height: 0.7rem;
  flex: none;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: currentColor;
}

.snui-status--neutral { color: var(--snui-color-text-muted); }
.snui-status--info { color: var(--snui-color-info); }
.snui-status--success { color: var(--snui-color-success); }
.snui-status--warning { color: var(--snui-color-warning); }
.snui-status--danger { color: var(--snui-color-danger); }

.snui-action-bar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: color-mix(in srgb, var(--snui-color-surface) 94%, transparent);
  box-shadow: var(--snui-shadow-raised);
  -webkit-backdrop-filter: blur(0.4rem);
  backdrop-filter: blur(0.4rem);
}

.snui-action-bar--sticky {
  position: sticky;
  z-index: 2;
  bottom: 0;
}

.snui-action-bar__status {
  min-width: 0;
  max-width: 100%;
}

.snui-action-bar__status:focus-visible {
  border-radius: var(--snui-radius-sm);
}

.snui-action-bar__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  margin-inline-start: auto;
}

.snui-inline-confirm {
  display: grid;
  gap: var(--snui-space-3);
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-warning);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

.snui-inline-confirm__title {
  min-width: 0;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.snui-inline-confirm__message {
  min-width: 0;
  margin: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-inline-confirm__actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  justify-content: flex-end;
}

@container snui-panel (max-width: 37.5rem) {
  .snui-section {
    padding: var(--snui-space-3);
  }

  .snui-section__header,
  .snui-action-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .snui-action-bar__actions {
    width: 100%;
    margin-inline-start: 0;
  }

  .snui-section__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .snui-action-bar__actions > .snui-button {
    flex: 1 1 auto;
  }
}

@media (forced-colors: active) {
  .snui-status__dot {
    border-color: CanvasText;
    background: CanvasText;
  }
}
`);
