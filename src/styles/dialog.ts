import { FORCED_COLORS_OUTLINE_DECLARATIONS } from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

export const DIALOG_STYLES = scopeStyles(`
/* ==== Dialog and scrim (Dialog, AlertDialog) ==== */

.snui-scrim {
  position: fixed;
  z-index: var(--snui-z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--snui-space-4);
  background: var(--snui-color-scrim);
  inset: 0;
  opacity: 1;
  transition: opacity var(--snui-transition-fast);
}

.snui-scrim--blur {
  backdrop-filter: blur(0.25rem);
}

.snui-scrim[data-entering],
.snui-scrim[data-exiting] {
  opacity: 0;
}

.snui-dialog-frame {
  display: flex;
  width: 100%;
  max-width: 100%;
  justify-content: center;
  opacity: 1;
  transform: none;
  transition:
    opacity var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

.snui-dialog-frame[data-entering],
.snui-dialog-frame[data-exiting] {
  opacity: 0;
  transform: translateY(0.5rem);
}

.snui-dialog {
  display: flex;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - var(--snui-space-6));
  flex-direction: column;
  gap: var(--snui-space-3);
  padding: var(--snui-space-5);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  overflow-y: auto;
}

.snui-dialog--standard {
  max-width: min(100%, var(--snui-content-width-standard));
}

.snui-dialog--wide {
  max-width: min(100%, var(--snui-content-width-wide));
}

.snui-dialog__title {
  overflow-wrap: anywhere;
}

.snui-dialog__description {
  min-width: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
}

.snui-dialog__body {
  min-width: 0;
}

.snui-dialog__body > :first-child { margin-top: 0; }
.snui-dialog__body > :last-child { margin-bottom: 0; }

.snui-dialog__actions {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--snui-space-2);
}

/* Below the narrow-panel breakpoint the dialog becomes a bottom sheet. */
@container snui-panel (max-width: ${CONTAINER_BREAKPOINT_NARROW}) {
  .snui-scrim {
    align-items: flex-end;
    padding: 0;
  }

  .snui-dialog-frame {
    align-self: flex-end;
  }

  .snui-dialog {
    max-height: 85vh;
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  .snui-dialog__actions > .snui-button {
    flex: 1 1 auto;
  }
}

@media (forced-colors: active) {
  .snui-dialog {
${FORCED_COLORS_OUTLINE_DECLARATIONS}
  }
}
`);
