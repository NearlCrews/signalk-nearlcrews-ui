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

/* The 1rem floor the root sheet gives every text control on coarse pointers. */
@media (any-pointer: coarse) {
  .snui-textarea {
    font-size: max(1rem, var(--snui-font-size));
  }
}

@media (forced-colors: active) {
  /* The invalid outline the root sheet reconstructs for every field. */
  .snui-textarea[aria-invalid="true"] {
    outline: 2px dashed CanvasText;
    outline-offset: 1px;
  }
}
`),
};
