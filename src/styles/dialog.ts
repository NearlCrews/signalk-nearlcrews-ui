import {
  bodyEdgeMarginRules,
  FORCED_COLORS_OUTLINE_DECLARATIONS,
  NARROW_PANEL_QUERY,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Modal dialog and scrim styles. Installed by `Dialog` and `AlertDialog`
 * through `useModuleStyles`, so a panel without a dialog never injects them.
 *
 * `--snui-visual-viewport-height` is written onto the dialog element by
 * `Dialog` itself, from the visual viewport, so an on-screen keyboard shrinks
 * the dialog instead of pushing its actions under the keyboard. It falls back
 * to `100dvh` for a dialog measured before its first frame.
 */
export const DIALOG_STYLES: StyleModule = {
  id: "dialog",
  styles: scopeStyles(`
/* ==== Dialog and scrim (Dialog, AlertDialog) ==== */

.snui-scrim {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(var(--snui-space-4), env(safe-area-inset-top, 0px))
    max(var(--snui-space-4), env(safe-area-inset-right, 0px))
    max(var(--snui-space-4), env(safe-area-inset-bottom, 0px))
    max(var(--snui-space-4), env(safe-area-inset-left, 0px));
  background: var(--snui-color-scrim);
  inset: 0;
  opacity: 1;
  transition: opacity var(--snui-transition-normal);
}

.snui-scrim--blur {
  -webkit-backdrop-filter: blur(0.25rem);
  backdrop-filter: blur(0.25rem);
}

.snui-scrim[data-entering],
.snui-scrim[data-exiting] {
  opacity: 0;
}

/* Blurring a full viewport on every frame of a fade costs a visible hitch on
   the hardware these panels run on, so the blur waits until the scrim is at
   rest. */
.snui-scrim--blur[data-entering],
.snui-scrim--blur[data-exiting] {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.snui-dialog-frame {
  display: flex;
  width: 100%;
  max-width: 100%;
  justify-content: center;
  opacity: 1;
  transform: none;
  transition:
    opacity var(--snui-transition-normal),
    transform var(--snui-transition-normal);
}

.snui-dialog-frame[data-entering],
.snui-dialog-frame[data-exiting] {
  opacity: 0;
  transform: translateY(0.5rem);
}

.snui-dialog {
  /*
   * The dialog is a raised surface, so hover fills painted inside it use the
   * raised hover step; see the toast card for the same remap.
   */
  --snui-color-interactive-hover: var(--snui-color-hover-raised);
  --snui-color-focus-ring-band: var(--snui-color-surface-raised);
  display: flex;
  width: 100%;
  max-width: 100%;
  max-height: calc(
    var(--snui-visual-viewport-height, 100dvh) -
    max(var(--snui-space-4), env(safe-area-inset-top, 0px)) -
    max(var(--snui-space-4), env(safe-area-inset-bottom, 0px))
  );
  flex-direction: column;
  gap: var(--snui-space-3);
  padding: var(--snui-space-5);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  /* The body scrolls, not the surface, so the title stays readable and the
     actions stay reachable on a short landscape viewport. */
  overflow: hidden;
}

.snui-dialog--standard {
  max-width: min(100%, var(--snui-content-width-standard));
}

.snui-dialog--wide {
  max-width: min(100%, var(--snui-content-width-wide));
}

.snui-dialog__title {
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.snui-dialog__description {
  min-width: 0;
  color: var(--snui-color-text-muted);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.snui-dialog__body {
  min-width: 0;
  /* A flex item does not shrink below its content without this, so the body
     has to be told it may before it can scroll. */
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  /* A flick that overshoots the end of the body must not scroll the host page
     behind the modal. */
  overscroll-behavior: contain;
}

${bodyEdgeMarginRules("snui-dialog__body")}

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
${NARROW_PANEL_QUERY} {
  .snui-scrim {
    align-items: flex-end;
    padding:
      0
      env(safe-area-inset-right, 0px)
      env(safe-area-inset-bottom, 0px)
      env(safe-area-inset-left, 0px);
  }

  .snui-dialog-frame {
    align-self: flex-end;
  }

  .snui-dialog {
    max-height: min(
      85dvh,
      calc(
        var(--snui-visual-viewport-height, 100dvh) -
        env(safe-area-inset-bottom, 0px)
      )
    );
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  .snui-dialog__actions > .snui-button {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .snui-scrim--blur {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .snui-dialog {
${FORCED_COLORS_OUTLINE_DECLARATIONS}
  }
}
`),
};
