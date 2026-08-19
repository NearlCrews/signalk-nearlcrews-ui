import {
  FORCED_COLORS_OUTLINE_DECLARATIONS,
  OVERLAY_TRANSITION_DECLARATIONS,
  RAISED_OVERLAY_DECLARATIONS,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";

export const POPOVER_STYLES = scopeStyles(`
/* ==== Popover (anchored content overlay) ==== */

.snui-popover {
  width: var(--snui-popover-width, auto);
  max-width: min(24rem, 100%);
  padding: var(--snui-space-3);
  overflow-y: auto;
  overscroll-behavior: contain;
${RAISED_OVERLAY_DECLARATIONS}
}

.snui-popover[data-entering],
.snui-popover[data-exiting] {
${OVERLAY_TRANSITION_DECLARATIONS}
}

@media (forced-colors: active) {
  .snui-popover {
${FORCED_COLORS_OUTLINE_DECLARATIONS}
  }
}
`);
