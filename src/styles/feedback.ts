import { scopeStyles } from "./scope.js";

export const FEEDBACK_STYLES = scopeStyles(`
.snui-banner {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--snui-space-3);
  padding: var(--snui-space-3) var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-inline-start-width: 0.3rem;
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
}

.snui-banner--info { border-inline-start-color: var(--snui-color-info); }
.snui-banner--success { border-inline-start-color: var(--snui-color-success); }
.snui-banner--warning { border-inline-start-color: var(--snui-color-warning); }
.snui-banner--danger { border-inline-start-color: var(--snui-color-danger); }

.snui-banner__title {
  margin: 0 0 var(--snui-space-1);
  font-weight: 700;
}

.snui-banner__tone-icon {
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

.snui-banner--success .snui-banner__tone-icon { color: var(--snui-color-success); }
.snui-banner--warning .snui-banner__tone-icon { color: var(--snui-color-warning); }
.snui-banner--danger .snui-banner__tone-icon { color: var(--snui-color-danger); }

.snui-banner__body > :first-child { margin-top: 0; }
.snui-banner__body > :last-child { margin-bottom: 0; }

.snui-banner__content,
.snui-banner__text,
.snui-banner__body {
  min-width: 0;
  overflow-wrap: anywhere;
}

.snui-banner__content {
  display: flex;
  align-items: flex-start;
  gap: var(--snui-space-2);
}

.snui-banner__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
}

.snui-banner__dismiss {
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

.snui-banner__dismiss:hover {
  background: var(--snui-color-hover-raised);
}

.snui-banner__dismiss:active {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-hover-raised)
  );
  transform: translateY(1px);
}

@container snui-panel (max-width: 37.5rem) {
  .snui-banner {
    align-items: stretch;
    flex-direction: column;
  }
}
`);
