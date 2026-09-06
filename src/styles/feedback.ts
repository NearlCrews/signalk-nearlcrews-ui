import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";
import {
  TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
} from "./tone-accent.js";

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

.snui-banner__title {
  margin: 0;
  margin-block-end: var(--snui-space-1);
  font-weight: var(--snui-font-weight-bold);
}

/* The banner glyph is larger and heavier than the inline mark it refines. */
.snui-banner__tone-icon {
  display: inline-grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border-width: 2px;
  margin-inline-end: 0;
  color: var(--snui-color-info);
  font-weight: var(--snui-font-weight-heavy);
}

.snui-banner--success .snui-banner__tone-icon { color: var(--snui-color-success); }
.snui-banner--warning .snui-banner__tone-icon { color: var(--snui-color-warning); }
.snui-banner--danger .snui-banner__tone-icon { color: var(--snui-color-danger); }

.snui-banner__body > :first-child { margin-block-start: 0; }
.snui-banner__body > :last-child { margin-block-end: 0; }

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
}

@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-banner {
    align-items: stretch;
    flex-direction: column;
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
