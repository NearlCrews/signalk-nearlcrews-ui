import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Empty state styles. Installed by `EmptyState` through
 * `useOptionalModuleStyles`, so a panel that always has data never injects
 * them.
 */
export const EMPTY_STATE_STYLES: StyleModule = {
  id: "empty-state",
  styles: scopeStyles(`
.snui-empty-state {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-6) var(--snui-space-4);
  text-align: center;
}

/* The illustration leads the block, so it is set above the title rather than
   at the body size a text or emoji icon would otherwise inherit. */
.snui-empty-state__icon {
  color: var(--snui-color-text-muted);
  font-size: var(--snui-font-size-2xl);
  line-height: 1;
}

.snui-empty-state__title {
  min-width: 0;
  max-width: 100%;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-bold);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-empty-state__description {
  min-width: 0;
  max-width: 100%;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

/*
 * The one place a sibling margin is added on top of the grid gap: the action
 * sits one step further from the copy than the copy does from the title, so a
 * press is a deliberate move away from the text rather than the next line of
 * it. Everything else in the package lets one gap own the rhythm.
 */
.snui-empty-state__action {
  margin-block-start: var(--snui-space-2);
}
`),
};
