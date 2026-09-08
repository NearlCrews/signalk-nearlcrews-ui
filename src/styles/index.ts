import { COLLAPSIBLE_STYLES } from "./collapsible.js";
import { COMPONENT_STYLES } from "./components.js";
import { CONTROL_STYLES } from "./controls.js";
import { FEEDBACK_STYLES } from "./feedback.js";
import { FORM_STYLES } from "./forms.js";
import { FOUNDATION_STYLES } from "./foundation.js";
import { ROOT_STYLE_MODULE_ID, type StyleModule } from "./install.js";
import { LAYOUT_STYLES } from "./layout.js";
import { OVERLAY_STYLES } from "./overlay-styles.js";
import { SIMPLE_TABLE_STYLES } from "./simple-table.js";
import { TABLE_STYLES } from "./table.js";
import { TABS_STYLES } from "./tabs.js";
import { TOKEN_STYLES } from "./tokens.js";

/*
 * Style delivery is modular. This manifest is the root sheet PanelRoot installs
 * on every mount; the overlay and table modules below install themselves from
 * the components that need them (see use-module-styles.ts). Import order here
 * is cascade order: tokens first, then the foundation reset, then components.
 *
 * Keyframes are the one thing written outside `scopeStyles`: `@keyframes` is
 * not a descendant rule, so it cannot live inside `@scope`, and the versioned
 * name from `versionedAnimationName` keeps two package copies from colliding
 * in the shared global namespace.
 */
export const PANEL_STYLES = [
  TOKEN_STYLES,
  FOUNDATION_STYLES,
  CONTROL_STYLES,
  COMPONENT_STYLES,
  FORM_STYLES,
  LAYOUT_STYLES,
  SIMPLE_TABLE_STYLES,
  TABS_STYLES,
  FEEDBACK_STYLES,
  COLLAPSIBLE_STYLES,
].join("\n");

/** The root sheet as a module, for tests and tooling that walk every module. */
const ROOT_STYLES: StyleModule = {
  id: ROOT_STYLE_MODULE_ID,
  styles: PANEL_STYLES,
};

/**
 * Every module in cascade order, root first. Tests and tooling walk this list;
 * components install the one module they need.
 *
 * @internal
 */
export const STYLE_MODULES: readonly StyleModule[] = [
  ROOT_STYLES,
  OVERLAY_STYLES,
  TABLE_STYLES,
];

export type { StyleModule } from "./install.js";
export { OVERLAY_STYLES, TABLE_STYLES };
