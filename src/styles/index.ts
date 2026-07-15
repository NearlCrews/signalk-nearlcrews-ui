import { COLLAPSIBLE_STYLES } from "./collapsible.js";
import { COMPONENT_STYLES } from "./components.js";
import { CONTROL_STYLES } from "./controls.js";
import { FEEDBACK_STYLES } from "./feedback.js";
import { FORM_STYLES } from "./forms.js";
import { FOUNDATION_STYLES } from "./foundation.js";
import { LAYOUT_STYLES } from "./layout.js";
import { TOKEN_STYLES } from "./tokens.js";

export const PANEL_STYLES = [
  TOKEN_STYLES,
  FOUNDATION_STYLES,
  CONTROL_STYLES,
  COMPONENT_STYLES,
  FORM_STYLES,
  LAYOUT_STYLES,
  FEEDBACK_STYLES,
  COLLAPSIBLE_STYLES,
].join("\n");
