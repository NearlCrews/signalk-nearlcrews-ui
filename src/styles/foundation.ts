import { owned, scopeStyles } from "./scope.js";

export const FOUNDATION_STYLES = scopeStyles(`
:scope,
${owned("*")} {
  box-sizing: border-box;
}

:scope {
  width: 100%;
  max-width: none;
  margin-inline: auto;
  padding: var(--snui-space-4);
  background: var(--snui-color-background);
  color: var(--snui-color-text);
  font-family: var(--snui-font-family);
  font-size: var(--snui-font-size);
  line-height: var(--snui-line-height);
}

:scope.snui-root--standard {
  max-width: var(--snui-content-width-standard);
}

:scope.snui-root--wide {
  max-width: var(--snui-content-width-wide);
}

${owned("button")},
${owned("input")},
${owned("select")},
${owned("textarea")} {
  font: inherit;
}

${owned("a:any-link")} {
  color: var(--snui-color-link);
  text-decoration-line: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.14em;
  overflow-wrap: anywhere;
}

${owned("a:visited")} {
  color: var(--snui-color-link-visited);
}

${owned("a:any-link:hover")} {
  color: var(--snui-color-link-hover);
  text-decoration-thickness: 0.14em;
}

${owned("button")},
${owned("summary")},
${owned('input[type="checkbox"]')},
${owned('input[type="range"]')} {
  touch-action: manipulation;
}

${owned(":focus-visible")} {
  outline: 2px solid var(--snui-color-focus);
  outline-offset: 2px;
  box-shadow: var(--snui-focus-ring);
}

${owned("[disabled]")},
${owned('[aria-disabled="true"]')} {
  cursor: not-allowed;
}

${owned(".snui-visually-hidden")} {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

@media (max-width: 37.5rem) {
  :scope {
    padding: var(--snui-space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  :scope,
  ${owned("*")},
  ${owned("*::before")},
  ${owned("*::after")} {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`);
