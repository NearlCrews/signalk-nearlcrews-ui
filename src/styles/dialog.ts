import {
  ACTION_ROW_DECLARATIONS,
  bodyEdgeMarginRules,
  FORCED_COLORS_OUTLINE_DECLARATIONS,
  MUTED_PROSE_DECLARATIONS,
  NARROW_PANEL_QUERY,
  overlayFadeTransition,
  RAISED_PAINT_DECLARATIONS,
  RAISED_SURFACE_TOKEN_DECLARATIONS,
  SAFE_AREA_PADDING_DECLARATIONS,
  safeAreaGutter,
  stretchedActionRules,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Custom property holding the height of the visual viewport. `Dialog` writes
 * it onto the dialog element, so an on-screen keyboard shrinks the dialog
 * instead of pushing its actions under the keyboard.
 *
 * @internal
 */
export const VISUAL_VIEWPORT_HEIGHT_PROPERTY = "--snui-visual-viewport-height";

/** The measured height, or `100dvh` for a dialog read before its first frame. */
const VISUAL_VIEWPORT_HEIGHT = `var(${VISUAL_VIEWPORT_HEIGHT_PROPERTY}, 100dvh)`;

/**
 * Modal dialog and scrim styles. Installed by `Dialog` and `AlertDialog`
 * through `useModuleStyles`, so a panel without a dialog never injects them.
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
${SAFE_AREA_PADDING_DECLARATIONS}
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
${overlayFadeTransition("normal")}
}

.snui-dialog-frame[data-entering],
.snui-dialog-frame[data-exiting] {
  opacity: 0;
  transform: translateY(0.5rem);
}

.snui-dialog {
${RAISED_SURFACE_TOKEN_DECLARATIONS}
  display: flex;
  width: 100%;
  max-width: 100%;
  max-height: calc(
    ${VISUAL_VIEWPORT_HEIGHT} -
    ${safeAreaGutter("top")} -
    ${safeAreaGutter("bottom")}
  );
  flex-direction: column;
  gap: var(--snui-space-3);
  padding: var(--snui-space-5);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-lg);
${RAISED_PAINT_DECLARATIONS}
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
${MUTED_PROSE_DECLARATIONS}
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
${ACTION_ROW_DECLARATIONS}
  align-items: center;
  justify-content: flex-end;
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
        ${VISUAL_VIEWPORT_HEIGHT} -
        env(safe-area-inset-bottom, 0px)
      )
    );
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

${stretchedActionRules(".snui-dialog__actions")}
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
