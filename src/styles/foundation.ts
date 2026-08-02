import {
  focusRingDeclarations,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const FOUNDATION_STYLES = scopeStyles(`
:scope,
*,
*::before,
*::after {
  box-sizing: border-box;
}

:scope {
  /* The containing block for portaled overlays (toasts, menus, dialogs). */
  position: relative;
  width: 100%;
  max-width: none;
  margin-inline: auto;
  background: var(--snui-color-background);
  color: var(--snui-color-text);
  font-family: var(--snui-font-family);
  font-size: var(--snui-font-size);
  line-height: var(--snui-line-height);
  container-name: snui-panel;
  container-type: inline-size;
}

.snui-root__content {
  min-width: 0;
  padding: var(--snui-space-4);
}

:scope.snui-root--standard {
  max-width: var(--snui-content-width-standard);
}

:scope.snui-root--wide {
  max-width: var(--snui-content-width-wide);
}

button,
input,
select,
textarea {
  font: inherit;
}

/*
 * Host applications ship global element styles that reach unclassed markup a
 * consumer renders inside a panel. Signal K Admin bundles Bootstrap Reboot,
 * whose legend, heading, and block margins visibly change panel content. These
 * rules make a panel render the same in every host. Package components carry
 * their own classes, so they are unaffected.
 */
h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
  font-weight: var(--snui-font-weight-semibold);
  line-height: 1.3;
}

h1 { font-size: 1.5rem; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.125rem; }
h4,
h5,
h6 { font-size: 1rem; }

p,
ul,
ol,
dl,
dd,
figure,
blockquote {
  margin: 0;
}

legend {
  width: auto;
  padding: 0;
  float: none;
  margin-bottom: 0;
  font-size: inherit;
  line-height: inherit;
}

fieldset {
  min-width: 0;
  padding: 0;
  border: 0;
  margin: 0;
}

hr {
  height: 0;
  border: 0;
  border-top: 1px solid var(--snui-color-border);
  margin: 0;
  color: inherit;
  opacity: 1;
}

table {
  border-collapse: collapse;
}

a:any-link {
  color: var(--snui-color-link);
  text-decoration-line: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.14em;
  overflow-wrap: anywhere;
}

a:visited {
  color: var(--snui-color-link-visited);
}

a:any-link:hover {
  color: var(--snui-color-link-hover);
  text-decoration-thickness: 0.14em;
}

button,
summary,
input[type="checkbox"],
input[type="range"] {
  touch-action: manipulation;
}

:focus-visible {
${focusRingDeclarations("2px", true)}
}

[disabled],
[aria-disabled="true"] {
  cursor: not-allowed;
}

@media (prefers-contrast: more) {
  /* Stronger contrast request: boundaries and focus take the text color. */
  :scope {
    --snui-color-border: var(--snui-color-text);
  }

  :focus-visible {
    outline-width: 3px;
  }
}

.snui-visually-hidden {
${visuallyHiddenDeclarations(true)}
}

@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-root__content {
    padding: var(--snui-space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
   * Scoped to elements this package styles. A blanket universal reset would
   * also suppress motion a consumer deliberately kept inside the panel, which
   * it could then only restore with an !important declaration.
   */
  :scope,
  [class^="snui-"],
  [class*=" snui-"],
  [class^="snui-"]::before,
  [class*=" snui-"]::before,
  [class^="snui-"]::after,
  [class*=" snui-"]::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`);
