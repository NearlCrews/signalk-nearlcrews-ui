import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Multi-line text field styles. Installed by `Textarea` through
 * `useOptionalModuleStyles`, so a panel without one never injects them. The
 * shared `.snui-input` rules the field also carries stay in the root sheet.
 */
export const TEXTAREA_STYLES: StyleModule = {
  id: "textarea",
  styles: scopeStyles(`
.snui-textarea {
  min-height: 6rem;
  resize: vertical;
}

/*
 * A row count replaces the fixed minimum height, and where the engine sizes
 * fields from content the control grows with its text from that floor.
 */
.snui-textarea--rows {
  min-height: auto;
  field-sizing: content;
}

/*
 * The coarse-pointer type floor and the forced-colors invalid outline are not
 * restated here. The control always carries snui-input as well, so the root
 * sheet's rules for that class already reach it, and a second copy could only
 * drift from the one every other field follows.
 */
`),
};
