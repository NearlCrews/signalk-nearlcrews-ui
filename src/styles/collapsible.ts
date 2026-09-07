import {
  DISABLED_DECLARATIONS,
  PRESSED_FILL_DECLARATION,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const COLLAPSIBLE_STYLES = scopeStyles(`
.snui-accordion {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-3);
}

.snui-collapsible {
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
}

/* Embedded sections sit inside a Card and borrow its chrome. */
.snui-collapsible--embedded {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.snui-collapsible__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
}

.snui-collapsible__leading {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 0;
}

/*
 * The heading takes the same type step a Section heading of that level would,
 * so sibling level-2 titles match whether or not they collapse.
 */
.snui-collapsible__heading {
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  font: inherit;
  font-size: var(--snui-font-size);
}

.snui-collapsible__heading--level-1,
.snui-collapsible__heading--level-2 {
  font-size: var(--snui-font-size-lg);
}

.snui-collapsible__toggle {
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
  font-weight: var(--snui-font-weight-bold);
  text-align: start;
  cursor: pointer;
  transition: background-color var(--snui-transition-fast);
}

@media (hover: hover) {
  .snui-collapsible__toggle:not(:disabled):hover {
    background: var(--snui-color-interactive-hover);
  }
}

.snui-collapsible__toggle:not(:disabled):active {
${PRESSED_FILL_DECLARATION}
}

.snui-collapsible__toggle:disabled {
${DISABLED_DECLARATIONS}
}

.snui-collapsible__title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.snui-collapsible__chevron {
  flex: none;
  transition: transform var(--snui-transition-fast);
}

.snui-collapsible__chevron:dir(rtl) {
  transform: scaleX(-1);
}

.snui-collapsible__toggle[aria-expanded="true"] .snui-collapsible__chevron {
  transform: rotate(90deg);
}

.snui-collapsible__toggle[aria-expanded="true"] .snui-collapsible__chevron:dir(rtl) {
  transform: scaleX(-1) rotate(90deg);
}

.snui-collapsible__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
}

.snui-collapsible__actions > * {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.snui-collapsible__summary {
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-collapsible__summary--header {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

.snui-collapsible__summary--below {
  padding: 0 var(--snui-space-4) var(--snui-space-3);
}

.snui-collapsible__content {
  padding: var(--snui-space-3) var(--snui-space-4) var(--snui-space-4);
  border-block-start: 1px solid var(--snui-color-border);
}

.snui-collapsible--embedded > .snui-collapsible__header {
  padding-inline: 0;
}

.snui-collapsible--embedded > .snui-collapsible__content,
.snui-collapsible--embedded > .snui-collapsible__summary--below {
  padding-inline: 0;
}

@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-collapsible__heading {
    flex-basis: 100%;
  }

  .snui-collapsible__summary--header {
    padding-inline-start: calc(var(--snui-space-3) + 1em);
  }

  .snui-collapsible__actions {
    padding-inline-start: calc(var(--snui-space-3) + 1em);
  }
}
`);
