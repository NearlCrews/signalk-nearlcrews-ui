import { COLLAPSIBLE_STYLES } from "./collapsible.js";
import { COMPONENT_STYLES } from "./components.js";
import { CONTROL_STYLES } from "./controls.js";
import { FEEDBACK_STYLES } from "./feedback.js";
import { FORM_STYLES } from "./forms.js";
import { FOUNDATION_STYLES } from "./foundation.js";
import { LAYOUT_STYLES } from "./layout.js";
import { SIMPLE_TABLE_STYLES } from "./simple-table.js";
import { TOKEN_STYLES } from "./tokens.js";

/*
 * Style delivery is modular. This file holds the root sheet PanelRoot installs
 * on every mount, and nothing else: every per-component module is installed by
 * the one component that renders it (see use-module-styles.ts), and reaching
 * one from here would put all of them back in PanelRoot's import graph, where
 * no bundler could drop the CSS a panel never renders. The full manifest lives
 * in modules.ts, which only tests and tooling import.
 *
 * Import order here is cascade order: tokens first, then the foundation reset,
 * then components.
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
  FEEDBACK_STYLES,
  COLLAPSIBLE_STYLES,
].join("\n");
