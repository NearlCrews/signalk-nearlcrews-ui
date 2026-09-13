import {
  focusRingDeclarations,
  NARROW_PANEL_QUERY,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { PANEL_CONTAINER_NAME } from "./tokens.js";

export const FOUNDATION_STYLES = scopeStyles(`
:scope,
*,
*::before,
*::after {
  box-sizing: border-box;
}

/*
 * The user-agent rule for [hidden] is a bare element selector, so any class
 * rule in this package that sets a display wins over it and an element toggled
 * through the hidden attribute keeps rendering. Restated here at class weight
 * with !important so the attribute means the same thing everywhere inside a
 * panel.
 */
[hidden] {
  display: none !important;
}

:scope {
  /*
   * Deliberately not a containing block. Toasts, dialogs, and the docked
   * action bar are position: fixed against the viewport, so none of them ever
   * needed one, while react-aria positions an anchored menu or popover
   * absolutely and measures the room it may grow into against the viewport. A
   * positioned panel root mixes those two frames: in a panel taller than the
   * viewport, every overlay opened after the page scrolls reports no room
   * below its trigger and renders clipped to an empty sliver.
   */
  position: static;
  width: 100%;
  max-width: none;
  margin-inline: auto;
  background: var(--snui-color-background);
  color: var(--snui-color-text);
  font-family: var(--snui-font-family);
  font-size: var(--snui-font-size);
  line-height: var(--snui-line-height);
  /*
   * The scoped subtree carries its own antialiasing rather than inheriting
   * whatever the host set, so the semibold weights the package leans on render
   * at the intended thickness on macOS.
   */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  container-name: ${PANEL_CONTAINER_NAME};
  /*
   * Size containment only. The scrim, the toast host, and the docked action
   * bar are position: fixed against the viewport from inside this box, so this
   * declaration must never grow into layout containment, which would make the
   * panel their containing block and offset every viewport coordinate the
   * measuring code writes into their custom properties.
   */
  container-type: inline-size;
}

/*
 * Horizontal safe-area insets belong to the content padding, so a panel in a
 * notched or rounded viewport keeps its text clear of the hardware edge. The
 * overlays read the same insets for their own geometry. The insets name
 * physical edges, so the padding stays physical too: routed through
 * padding-inline the left inset would land on the right edge of an RTL panel.
 */
.snui-root__content {
  min-width: 0;
  padding-block: var(--snui-space-4);
  padding-left: max(var(--snui-space-4), env(safe-area-inset-left, 0px));
  padding-right: max(var(--snui-space-4), env(safe-area-inset-right, 0px));
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

/* The display steps set their own leading: 1.3 reads loose at 24 and 20 px. */
h1,
h2 { line-height: 1.2; }

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

/*
 * The user agent indents a list with a magic number that differs between the
 * Admin host and a bare fixture, so the indent lands on the package space
 * scale instead. Package list primitives clear it with their own padding.
 */
ul,
ol {
  padding-inline-start: var(--snui-space-5);
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

/*
 * The host highlight is replaced rather than erased: a consumer marking a
 * matched Signal K path needs the emphasis the element exists for, and the
 * package tokens keep it readable in every theme.
 */
mark {
  padding: 0;
  background: var(--snui-color-accent-subtle);
  color: var(--snui-color-text);
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
  /*
   * Stronger contrast request: boundaries and focus take the text color, and
   * the two dimmed text tokens climb toward it. Disabled text keeps a step
   * below the rest, because losing that step would leave a blocked control
   * looking exactly like an available one.
   */
  :scope {
    --snui-color-border: var(--snui-color-text);
    --snui-color-text-muted: var(--snui-color-text);
    --snui-color-text-disabled: color-mix(in srgb, var(--snui-color-text) 80%, var(--snui-color-surface));
  }

  :focus-visible {
    outline-width: 3px;
  }
}

.snui-visually-hidden {
${visuallyHiddenDeclarations(true)}
}

${NARROW_PANEL_QUERY} {
  .snui-root__content {
    padding-block: var(--snui-space-3);
    padding-left: max(var(--snui-space-3), env(safe-area-inset-left, 0px));
    padding-right: max(var(--snui-space-3), env(safe-area-inset-right, 0px));
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
