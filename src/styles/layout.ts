import { owned, scopeStyles } from "./scope.js";

const GAP_RULES = [1, 2, 3, 4, 5, 6]
  .map((space) => {
    const scale = String(space);
    return `
${owned(`.snui-stack--gap-${scale}`)},
${owned(`.snui-cluster--gap-${scale}`)} {
  gap: var(--snui-space-${scale});
}`;
  })
  .join("\n");

export const LAYOUT_STYLES = scopeStyles(`
${owned(".snui-stack")} {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

${owned(".snui-cluster")} {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
}

${GAP_RULES}

${owned(".snui-layout--align-start")} { align-items: flex-start; }
${owned(".snui-layout--align-center")} { align-items: center; }
${owned(".snui-layout--align-end")} { align-items: flex-end; }
${owned(".snui-layout--align-stretch")} { align-items: stretch; }
${owned(".snui-layout--justify-start")} { justify-content: flex-start; }
${owned(".snui-layout--justify-center")} { justify-content: center; }
${owned(".snui-layout--justify-end")} { justify-content: flex-end; }
${owned(".snui-layout--justify-between")} { justify-content: space-between; }

${owned(".snui-card")} {
  min-width: 0;
  padding: var(--snui-space-4);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface);
  box-shadow: var(--snui-shadow-raised);
}

${owned(".snui-metric-grid")} {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  gap: var(--snui-space-3);
}

${owned(".snui-metric")} {
  min-width: 0;
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
}

${owned(".snui-metric__label")} {
  color: var(--snui-color-text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

${owned(".snui-metric__value")} {
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

${owned(".snui-metric__detail")} {
  margin-top: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}

${owned(".snui-metric--info .snui-metric__value")} { color: var(--snui-color-info); }
${owned(".snui-metric--success .snui-metric__value")} { color: var(--snui-color-success); }
${owned(".snui-metric--warning .snui-metric__value")} { color: var(--snui-color-warning); }
${owned(".snui-metric--danger .snui-metric__value")} { color: var(--snui-color-danger); }

${owned(".snui-badge")} {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  max-width: 100%;
  padding: 0.125rem var(--snui-space-2);
  border: 1px solid currentColor;
  border-radius: 999px;
  color: var(--snui-color-text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

${owned(".snui-badge--info")} { color: var(--snui-color-info); }
${owned(".snui-badge--success")} { color: var(--snui-color-success); }
${owned(".snui-badge--warning")} { color: var(--snui-color-warning); }
${owned(".snui-badge--danger")} { color: var(--snui-color-danger); }
`);
