import { DIALOG_STYLES } from "./dialog.js";
import { EMPTY_STATE_STYLES } from "./empty-state.js";
import { PANEL_STYLES } from "./index.js";
import { ROOT_STYLE_MODULE_ID, type StyleModule } from "./install.js";
import { MENU_STYLES } from "./menu.js";
import { POPOVER_STYLES } from "./popover.js";
import { PROGRESS_STYLES } from "./progress.js";
import { RADIO_STYLES } from "./radio.js";
import { RANGE_STYLES } from "./range.js";
import { SWITCH_STYLES } from "./switch.js";
import { TABLE_STYLES } from "./table.js";
import { TEXTAREA_STYLES } from "./textarea.js";
import { TOAST_STYLES } from "./toast.js";

/** The root sheet as a module, for tests and tooling that walk every module. */
const ROOT_STYLES: StyleModule = {
  id: ROOT_STYLE_MODULE_ID,
  styles: PANEL_STYLES,
};

/**
 * Every module, root first. Tests and tooling walk this list; a component
 * imports the one module it needs directly, never this manifest, which reaches
 * all of them.
 *
 * Only the root sheet has a fixed place in the cascade, ahead of every module
 * (see install.ts). The modules below install in mount order, which is why no
 * two of them may share a selector: each owns one component's classes
 * outright, so their relative order cannot change a computed style.
 *
 * @internal
 */
export const STYLE_MODULES: readonly StyleModule[] = [
  ROOT_STYLES,
  DIALOG_STYLES,
  EMPTY_STATE_STYLES,
  MENU_STYLES,
  POPOVER_STYLES,
  PROGRESS_STYLES,
  RADIO_STYLES,
  RANGE_STYLES,
  SWITCH_STYLES,
  TABLE_STYLES,
  TEXTAREA_STYLES,
  TOAST_STYLES,
];
