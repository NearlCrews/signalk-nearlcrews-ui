import {
  FORCED_COLORS_OUTLINE_DECLARATIONS,
  OVERLAY_TRANSITION_DECLARATIONS,
  RAISED_SURFACE_TOKEN_DECLARATIONS,
  raisedOverlayDeclarations,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Custom property holding the width of the popover surface, which `Popover`
 * writes for every width but `"auto"`.
 *
 * @internal
 */
export const POPOVER_WIDTH_PROPERTY = "--snui-popover-width";

/**
 * Anchored popover styles. Installed by `Popover` through `useModuleStyles`,
 * so a panel without a popover never injects them.
 */
export const POPOVER_STYLES: StyleModule = {
  id: "popover",
  styles: scopeStyles(`
/* ==== Popover (anchored content overlay) ====

   No safe-area insets here: an anchored overlay is positioned by react-aria
   against the visual viewport with a fixed container padding, which no CSS
   environment variable reaches. A popover that flips to the edge of a notched
   viewport can therefore sit under the cutout, unlike the scrim, the panel
   content, and the toast host, which all fold the insets into their geometry.
*/

.snui-popover {
${RAISED_SURFACE_TOKEN_DECLARATIONS}
  width: var(${POPOVER_WIDTH_PROPERTY}, auto);
  max-width: min(24rem, 100%);
  padding: var(--snui-space-3);
  overflow-y: auto;
  overscroll-behavior: contain;
${raisedOverlayDeclarations("normal")}
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
`),
};
