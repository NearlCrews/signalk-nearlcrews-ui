import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/*
 * Room for about three lines of body text, so an empty field reads as one
 * that takes a paragraph rather than a single line.
 */
const TEXTAREA_MIN_HEIGHT = "6rem";

/**
 * Multi-line text field styles. Installed by `Textarea` through
 * `useOptionalModuleStyles`, so a panel without one never injects them. The
 * shared `.snui-input` rules the field also carries stay in the root sheet.
 *
 * The coarse-pointer type floor and the forced-colors invalid outline are not
 * restated here. The control always carries snui-input as well, so the root
 * sheet's rules for that class already reach it, and a second copy could only
 * drift from the one every other field follows.
 */
export const TEXTAREA_STYLES: StyleModule = {
  id: "textarea",
  styles: scopeStyles(`
/*
 * Single-line fields let the control floor set their height and pad by the
 * small step; several lines of text need the full inset above the first and
 * below the last, so the field restores it.
 */
.snui-textarea {
  min-height: ${TEXTAREA_MIN_HEIGHT};
  padding-block: var(--snui-space-2);
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
`),
};
