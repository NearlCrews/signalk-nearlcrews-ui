import { COMPONENT_STYLES } from "./components.js";
import { CONTROL_STYLES } from "./controls.js";
import { FOUNDATION_STYLES } from "./foundation.js";
import { TOKEN_STYLES } from "./tokens.js";

export const PANEL_STYLES = [
  TOKEN_STYLES,
  FOUNDATION_STYLES,
  CONTROL_STYLES,
  COMPONENT_STYLES,
].join("\n");
