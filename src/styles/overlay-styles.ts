import { DIALOG_STYLES } from "./dialog.js";
import type { StyleModule } from "./install.js";
import { MENU_STYLES } from "./menu.js";
import { POPOVER_STYLES } from "./popover.js";
import { TOAST_STYLES } from "./toast.js";

/**
 * Anchored and modal overlay styles: dialog, menu, popover, and toast.
 * Installed by the overlay components through `useModuleStyles`, so a panel
 * without overlays never injects their selectors.
 */
export const OVERLAY_STYLES: StyleModule = {
  id: "overlays",
  styles: [DIALOG_STYLES, MENU_STYLES, POPOVER_STYLES, TOAST_STYLES].join("\n"),
};
