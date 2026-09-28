import {
  DISABLED_DECLARATIONS,
  FIRST_LINE_GLYPH_SLOT_DECLARATIONS,
  NARROW_PANEL_QUERY,
  PRESSED_FILL_DECLARATION,
  TONE_GLYPH_BOX_EM,
  TONE_GLYPH_GAP_EM,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { toneAccentBar } from "./tone-rules.js";

/**
 * The toggle while it can be pressed, which the hover, pressed, and
 * forced-colors rules all target.
 */
const ENABLED_TOGGLE = ".snui-collapsible__toggle:not(:disabled)";

/**
 * The chevron's box: the largest title size, so one length holds whatever
 * size the title takes and the rows below can be measured against it.
 */
const CHEVRON_SIZE = "var(--snui-font-size-lg)";

/**
 * The tone glyph's slot in a toned toggle: the glyph's box and the gap before
 * its text, both in ems of the glyph's own size, pinned so the toned indent
 * below can be measured against it.
 */
const TONE_SLOT_SIZE = `calc(${String(TONE_GLYPH_BOX_EM + TONE_GLYPH_GAP_EM)} * var(--snui-font-size-xs))`;

/**
 * How far a narrow panel indents the row that wraps under the heading: the
 * toggle's padding, the chevron's box, and the toggle's gap, the lengths the
 * title's text edge is made of, so the row starts on it. Each is a token, so
 * the indent follows a coarse pointer's larger gap and any title size.
 */
const NARROW_ROW_INDENT = `calc(var(--snui-space-1) + ${CHEVRON_SIZE} + var(--snui-space-2))`;

/** A toned title starts one tone slot and one more toggle gap further in. */
const TONED_ROW_INDENT = `calc(${NARROW_ROW_INDENT} + ${TONE_SLOT_SIZE} + var(--snui-space-2))`;

export const COLLAPSIBLE_STYLES = scopeStyles(`
.snui-accordion {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-3);
}

/* The surface and the inset come from the section shell rule the Section shares. */

/*
 * A toned section paints the same leading bar a toned Card does and carries
 * the tone glyph beside its title, so a problem hidden inside a collapsed
 * section is marked the same way everywhere. The bar belongs to the default
 * variant: an embedded section draws no chrome of its own, so its tone shows
 * as the glyph alone.
 */
${toneAccentBar("snui-collapsible")}

/* The tone slot keeps its glyph on the title's first line. */
.snui-collapsible__tone {
${FIRST_LINE_GLYPH_SLOT_DECLARATIONS}
  inline-size: ${TONE_SLOT_SIZE};
}

/* Embedded sections sit inside a Card and borrow its chrome. */
.snui-collapsible--embedded {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

/*
 * The toggle pads its own hit area, so the header stops that much short of the
 * section inset at the start and the chevron lands on the shared edge. Nothing
 * pads the actions at the end, so the full inset stays there and they line up
 * with the content below.
 */
.snui-collapsible__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--snui-space-2);
  padding-block: var(--snui-space-2);
  padding-inline-start: calc(var(--snui-section-inset) - var(--snui-space-1));
  padding-inline-end: var(--snui-section-inset);
}

/*
 * The leading slot is one shape in both section shells: a Section's glyph and
 * a collapsible section's enable checkbox sit before the heading the same way.
 */
.snui-collapsible__leading,
.snui-section__leading {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 0;
}

/*
 * Only the size is restated: the foundation reset already gives every heading
 * its line height, and the toggle inside carries the title weight.
 */
.snui-collapsible__heading {
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  font-size: var(--snui-font-size);
}

/*
 * Both shells size their titles by depth below the shell's own title rather
 * than by heading level: a top section takes the larger step whether the
 * shell handed it level 2 or, below a panel title, level 3, and every deeper
 * section takes the body size. Written here, after both shells' base sizes.
 */
.snui-section__title--top,
.snui-collapsible__heading--top {
  font-size: var(--snui-font-size-lg);
}

/*
 * On the baseline rather than centered, so the chevron stays on the first
 * line of a title that wraps instead of sitting between its lines; the tone
 * glyph's slot places itself. The block padding centers a one-line title in
 * the control, as centering did.
 */
.snui-collapsible__toggle {
  display: flex;
  width: 100%;
  min-height: var(--snui-control-min-height);
  min-width: 0;
  align-items: baseline;
  gap: var(--snui-space-2);
  padding-block: max(var(--snui-space-1), calc((var(--snui-control-min-height) - 1lh) / 2));
  padding-inline: var(--snui-space-1);
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
  ${ENABLED_TOGGLE}:hover {
    background: var(--snui-color-interactive-hover);
  }
}

${ENABLED_TOGGLE}:active {
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
 * box is pinned to CHEVRON_SIZE, which the narrow panel indent below is
 * measured against. Without it that indent misses the title's text edge. The glyph,
 * U+203A, is bidi mirrored, so on a right-to-left line the browser would
 * already draw it pointing left and the flip below would turn it back; set
 * left to right in isolation, it always points right and the flips alone
 * decide its direction.
 */
.snui-collapsible__chevron {
  flex: none;
  inline-size: ${CHEVRON_SIZE};
  direction: ltr;
  unicode-bidi: isolate;
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
 * The header summary and the actions, which follow the heading. The row adds
 * no box in a wide panel, so both stay items of the header beside the heading.
 */
.snui-collapsible__trailing {
  display: contents;
}

/*
 * The summary and the content keep the section inset, the edge a Section's
 * content keeps and the one the chevron lands on, so every row of the block
 * lines up with its sibling sections rather than stepping in and out.
 */
.snui-collapsible__summary--below {
  padding-block: 0 var(--snui-space-3);
  padding-inline: var(--snui-section-inset);
}

.snui-collapsible__content {
  padding-block: var(--snui-space-3);
  padding-inline: var(--snui-section-inset);
  border-block-start: 1px solid var(--snui-color-border-subtle);
}

.snui-collapsible--embedded > .snui-collapsible__header,
.snui-collapsible--embedded > .snui-collapsible__content,
.snui-collapsible--embedded > .snui-collapsible__summary--below {
  padding-inline: 0;
}

${NARROW_PANEL_QUERY} {
  .snui-collapsible__heading {
    flex-basis: 100%;
  }

  /*
   * Under the heading, the summary and the actions share one row indented
   * once to the title's text edge, and each line it wraps onto starts there.
   * The actions keep the summary's line whenever they fit beside it.
   */
  .snui-collapsible__trailing {
    display: flex;
    min-width: 0;
    flex: 1 1 100%;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--snui-space-2);
    padding-inline-start: ${NARROW_ROW_INDENT};
  }

  .snui-collapsible__header:has(> .snui-collapsible__heading .snui-collapsible__tone) > .snui-collapsible__trailing {
    padding-inline-start: ${TONED_ROW_INDENT};
  }
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the hover and pressed fills, which leaves the
   * toggle painted exactly like the header around it. Reconstruct both states
   * with a system highlight, as the menu item does.
   */
  ${ENABLED_TOGGLE}:hover,
  ${ENABLED_TOGGLE}:active {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}
`);
