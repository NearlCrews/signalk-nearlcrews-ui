import {
  bodyEdgeMarginRules,
  NARROW_PANEL_QUERY,
  PROSE_MEASURE_DECLARATION,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import {
  TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
  toneDescendantColorRules,
} from "./tone-rules.js";

/*
 * The banner glyph is drawn larger than the inline mark it refines. Internal
 * geometry rather than a token: it is the size this one mark needs beside a
 * heavier border, not a value a consumer themes.
 */
const BANNER_TONE_ICON_SIZE = "1.25rem";

export const FEEDBACK_STYLES = scopeStyles(`
.snui-banner {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--snui-space-3);
  padding: var(--snui-space-3) var(--snui-space-4);
${TONE_ACCENT_BAR_DECLARATIONS}
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
}

${toneAccentBarRules("snui-banner")}

/*
 * An announcing banner stays mounted so a screen reader observes it before the
 * first message arrives. While it has nothing to say it leaves the flow rather
 * than the accessibility tree, so it paints no box, border, padding, or
 * margin; display: none would remove the region entirely. The pseudo-class
 * outranks the tone modifier, so the accent bar waits with it.
 */
.snui-banner:empty {
${visuallyHiddenDeclarations()}
}

.snui-banner__title {
  text-wrap: balance;
  margin: 0;
  margin-block-end: var(--snui-space-1);
  font-weight: var(--snui-font-weight-bold);
}

/* Larger and heavier than the inline mark it refines, and no glyph margin:
   the content row owns the gap between the mark and the text. */
.snui-banner__tone-icon {
  display: inline-grid;
  width: ${BANNER_TONE_ICON_SIZE};
  height: ${BANNER_TONE_ICON_SIZE};
  place-items: center;
  font-weight: var(--snui-font-weight-heavy);
}

${toneDescendantColorRules("snui-banner", ".snui-banner__tone-icon")}

${bodyEdgeMarginRules("snui-banner__body")}

.snui-banner__content,
.snui-banner__text,
.snui-banner__body {
  min-width: 0;
  overflow-wrap: anywhere;
}

.snui-banner__body {
${PROSE_MEASURE_DECLARATION}
  text-wrap: pretty;
}

/*
 * The message column takes the row rather than shrinking to its content.
 * WebKit's pretty line breaking wants slack, and a column sized to its own
 * max-content width leaves none, so it broke a sentence that fit on one line.
 */
.snui-banner__content {
  display: flex;
  flex: 1 1 auto;
  align-items: flex-start;
  gap: var(--snui-space-2);
}

.snui-banner__text {
  flex: 1 1 auto;
}

/*
 * A banner with actions starts its content low enough that the lifted action
 * row below keeps at least space-2 of inset from the top border: the lift
 * alone spent most of the padding, and a focus ring landed on the border.
 */
.snui-banner:has(> .snui-banner__actions) {
  padding-block-start: max(var(--snui-space-3), calc(var(--snui-space-2) + (var(--snui-control-min-height) - 1lh) / 2));
}

/*
 * The action slot never shrinks: the text column wraps instead, and the
 * narrow layout stacks the two, so a Dismiss label cannot break per letter.
 */
.snui-banner__actions {
  display: flex;
  max-width: 100%;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--snui-space-2);
  /*
   * A control is taller than a line of text, so the row is lifted to center
   * on the banner's first line, the title where there is one, rather than
   * hanging half a line below it. The row keeps control height, so a shorter
   * action such as a link centers inside it rather than rising above the line.
   */
  min-block-size: var(--snui-control-min-height);
  margin-block-start: calc((1lh - var(--snui-control-min-height)) / 2);
}

${NARROW_PANEL_QUERY} {
  .snui-banner {
    align-items: stretch;
    flex-direction: column;
  }

  /*
   * Stacked under the text, the actions keep their own line and are not
   * lifted, so they also drop the control-height row a lift needs.
   */
  .snui-banner__actions {
    min-block-size: auto;
    margin-block-start: 0;
  }

  .snui-banner:has(> .snui-banner__actions) {
    padding-block-start: var(--snui-space-3);
  }
}

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tone bar to the same system color as the
   * rest of the border, which weakens the severity signal. Reconstruct the
   * leading bar with ButtonText against CanvasText so it stays distinct.
   */
  .snui-banner {
    forced-color-adjust: none;
    border-color: CanvasText;
    border-inline-start-color: ButtonText;
    background: Canvas;
    color: CanvasText;
  }

  /*
   * The banner opts out as a surface, so ordinary links, the body, and the
   * unrestricted action slot opt back in or consumer controls placed in them
   * keep the author palette against Canvas. Primary and danger buttons
   * explicitly reconstruct their own system colors, which overrides this
   * inherited value.
   */
  .snui-banner a:any-link,
  .snui-banner__body,
  .snui-banner__actions {
    forced-color-adjust: auto;
  }
}
`);
