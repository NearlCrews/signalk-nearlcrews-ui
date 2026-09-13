import {
  DISABLED_DECLARATIONS,
  NARROW_PANEL_QUERY,
  PRESSED_FILL_DECLARATION,
  SURFACE_DECLARATIONS,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import {
  TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
  toneSelectorList,
} from "./tone-rules.js";

export const COLLAPSIBLE_STYLES = scopeStyles(`
.snui-accordion {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-3);
}

.snui-collapsible {
${SURFACE_DECLARATIONS}
  min-width: 0;
}

/*
 * A toned section paints the same leading bar a toned Card does and carries
 * the tone glyph beside its title, so a problem hidden inside a collapsed
 * section is marked the same way everywhere. The bar belongs to the default
 * variant: an embedded section draws no chrome of its own, so its tone shows
 * as the glyph alone.
 */
${toneSelectorList("snui-collapsible")} {
${TONE_ACCENT_BAR_DECLARATIONS}
}

${toneAccentBarRules("snui-collapsible")}

.snui-collapsible__tone-glyph {
  flex: none;
  margin-inline-end: 0.375em;
  vertical-align: middle;
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
 * so sibling level-2 titles match whether or not they collapse. Only the size
 * is restated: the foundation reset already gives every heading its line
 * height and weight, which a font shorthand here would quietly drop.
 */
.snui-collapsible__heading {
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
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
  text-wrap: balance;
}

/*
 * The chevron is a text glyph, and its advance width varies by font, so the
 * box is pinned to the 1em the narrow-panel indents below are measured
 * against. Without it those indents miss the title's text edge.
 */
.snui-collapsible__chevron {
  flex: none;
  inline-size: 1em;
  text-align: center;
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
  text-wrap: pretty;
}

.snui-collapsible__summary--header {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

/*
 * The summary and the content share the header's inline edge, so every row of
 * the block lines up against the same border rather than stepping in and out.
 */
.snui-collapsible__summary--below {
  padding: 0 var(--snui-space-3) var(--snui-space-3);
}

.snui-collapsible__content {
  padding: var(--snui-space-3);
  border-block-start: 1px solid var(--snui-color-border);
}

.snui-collapsible--embedded > .snui-collapsible__header {
  padding-inline: 0;
}

.snui-collapsible--embedded > .snui-collapsible__content,
.snui-collapsible--embedded > .snui-collapsible__summary--below {
  padding-inline: 0;
}

${NARROW_PANEL_QUERY} {
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

@media (forced-colors: active) {
  /*
   * Forced colors flattens the hover and pressed fills, which leaves the
   * toggle painted exactly like the header around it. Reconstruct both states
   * with a system highlight, as the menu item does.
   */
  .snui-collapsible__toggle:not(:disabled):hover,
  .snui-collapsible__toggle:not(:disabled):active {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}
`);
