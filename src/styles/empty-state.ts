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

.snui-empty-state__icon {
  color: var(--snui-color-text-muted);
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

.snui-empty-state__action {
  margin-block-start: var(--snui-space-2);
}
`),
};
