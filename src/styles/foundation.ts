import {
  focusRingDeclarations,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW, PANEL_CONTAINER_NAME } from "./tokens.js";

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
  container-name: ${PANEL_CONTAINER_NAME};
  container-type: inline-size;
}

/*
 * Horizontal safe-area insets belong to the content padding, so a panel in a
 * notched or rounded viewport keeps its text clear of the hardware edge. The
 * overlays read the same insets for their own geometry.
 */
.snui-root__content {
  min-width: 0;
  padding-block: var(--snui-space-4);
  padding-inline: max(var(--snui-space-4), env(safe-area-inset-left, 0px)) max(var(--snui-space-4), env(safe-area-inset-right, 0px));
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
 * whose legend, heading, block margins, code and keyboard styling, mark
 * highlight, label display, and button radius visibly change panel content.
 * These rules neutralize the known element-level host styles. They do not
 * override arbitrary higher-specificity selectors. Package components carry
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

h1 { font-size: var(--snui-font-size-2xl); }
h2 { font-size: var(--snui-font-size-xl); }
h3 { font-size: var(--snui-font-size-lg); }
h4,
h5,
h6 { font-size: var(--snui-font-size); }

p,
ul,
ol,
dl,
dd,
figure,
blockquote,
address,
pre {
  margin: 0;
}

b,
strong {
  font-weight: var(--snui-font-weight-bold);
}

small {
  font-size: var(--snui-font-size-sm);
}

code,
kbd,
pre,
samp {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-family: var(--snui-font-family-mono);
  font-size: var(--snui-font-size-sm);
}

pre {
  overflow: auto;
}

mark {
  padding: 0;
  background: transparent;
  color: inherit;
}

label {
  display: inline;
}

legend {
  width: auto;
  padding: 0;
  float: none;
  margin-block-end: 0;
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
  border-block-start: 1px solid var(--snui-color-border);
  margin: 0;
  color: inherit;
  opacity: 1;
}

table {
  border-collapse: collapse;
}

th {
  font-weight: var(--snui-font-weight-semibold);
  text-align: start;
}

button {
  border-radius: var(--snui-radius-sm);
}

/*
 * Underline metrics come from the active system face, so the line sits where
 * the font's designer put it; hover keeps an explicit thickening as the
 * visible change.
 */
a:any-link {
  color: var(--snui-color-link);
  text-decoration-line: underline;
  text-decoration-thickness: from-font;
  text-underline-position: from-font;
  overflow-wrap: anywhere;
}

a:visited {
  color: var(--snui-color-link-visited);
}

@media (hover: hover) {
  a:any-link:hover {
    color: var(--snui-color-link-hover);
    text-decoration-thickness: 0.14em;
  }
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
    padding-block: var(--snui-space-3);
    padding-inline: max(var(--snui-space-3), env(safe-area-inset-left, 0px)) max(var(--snui-space-3), env(safe-area-inset-right, 0px));
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
