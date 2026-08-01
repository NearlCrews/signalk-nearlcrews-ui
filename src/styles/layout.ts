import { scopeStyles } from "./scope.js";

const GAP_RULES = [1, 2, 3, 4, 5, 6]
  .map((space) => {
    const scale = String(space);
    return `
.snui-stack--gap-${scale},
.snui-cluster--gap-${scale} {
  gap: var(--snui-space-${scale});
}`;
  })
  .join("\n");

export const LAYOUT_STYLES = scopeStyles(`
/* Stacks, clusters, and metric grids may render as lists; strip list chrome. */
.snui-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.snui-cluster {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

${GAP_RULES}

.snui-layout--align-start { align-items: flex-start; }
.snui-layout--align-center { align-items: center; }
.snui-layout--align-end { align-items: flex-end; }
.snui-layout--align-stretch { align-items: stretch; }
.snui-layout--justify-start { justify-content: flex-start; }
.snui-layout--justify-center { justify-content: center; }
.snui-layout--justify-end { justify-content: flex-end; }
.snui-layout--justify-between { justify-content: space-between; }
.snui-layout--justify-around { justify-content: space-around; }
.snui-layout--justify-evenly { justify-content: space-evenly; }

.snui-card {
  min-width: 0;
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

.snui-card--compact {
  padding: var(--snui-space-3);
}

.snui-card__header {
  min-width: 0;
  margin-block-end: var(--snui-space-3);
  padding-block-end: var(--snui-space-3);
  border-block-end: 1px solid var(--snui-color-border);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
}

.snui-card__footer {
  min-width: 0;
  margin-block-start: var(--snui-space-3);
  padding-block-start: var(--snui-space-3);
  border-block-start: 1px solid var(--snui-color-border);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
}

.snui-card--compact .snui-card__header {
  margin-block-end: var(--snui-space-2);
  padding-block-end: var(--snui-space-2);
}

.snui-card--compact .snui-card__footer {
  margin-block-start: var(--snui-space-2);
  padding-block-start: var(--snui-space-2);
}

.snui-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  gap: var(--snui-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.snui-metric {
  min-width: 0;
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

.snui-metric__label {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-metric__value {
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text);
  font-size: 1.125rem;
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.snui-metric__unit {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-semibold);
}

.snui-metric__detail {
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  overflow-wrap: anywhere;
}

.snui-metric--info .snui-metric__value { color: var(--snui-color-info); }
.snui-metric--success .snui-metric__value { color: var(--snui-color-success); }
.snui-metric--warning .snui-metric__value { color: var(--snui-color-warning); }
.snui-metric--danger .snui-metric__value { color: var(--snui-color-danger); }

/* Tone glyphs keep the state visible when color is unavailable or unseen. */
.snui-metric__tone-glyph,
.snui-badge__tone-glyph {
  display: inline-flex;
  width: 1em;
  height: 1em;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  margin-inline-end: 0.375em;
  font-size: 0.8em;
  font-weight: var(--snui-font-weight-bold);
  line-height: 1;
}

.snui-badge {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  max-width: 100%;
  padding: 0.125rem var(--snui-space-2);
  border: 1px solid currentColor;
  border-radius: var(--snui-radius-pill);
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-bold);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.snui-badge--info { color: var(--snui-color-info); }
.snui-badge--success { color: var(--snui-color-success); }
.snui-badge--warning { color: var(--snui-color-warning); }
.snui-badge--danger { color: var(--snui-color-danger); }

@media (forced-colors: active) {
  /*
   * Forced colors flattens the tone hue; keep the badge border and text
   * pinned to system colors so the outline survives alongside the glyph.
   */
  .snui-badge {
    forced-color-adjust: none;
    border-color: CanvasText;
    color: CanvasText;
  }
}
`);
