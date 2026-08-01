import { PACKAGE_VERSION } from "../version.js";
import { scopeStyles } from "./scope.js";
import { CONTAINER_BREAKPOINT_NARROW } from "./tokens.js";

/** A versioned global name prevents keyframe collisions between package copies. */
const TOAST_ENTER_ANIMATION = `snui-v${PACKAGE_VERSION.replace(/[^a-zA-Z0-9_-]/g, "-")}-toast-enter`;

export const DIALOG_STYLES = scopeStyles(`
/* ==== Dialog and scrim (Dialog, AlertDialog) ==== */

.snui-scrim {
  position: fixed;
  z-index: var(--snui-z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--snui-space-4);
  background: rgb(15 23 42 / 45%);
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
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}
`);

export const MENU_STYLES = scopeStyles(`
/* ==== Menu (Menu, MenuItem, MenuSeparator, MenuSection) ==== */

.snui-menu-popover {
  z-index: var(--snui-z-overlay);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  opacity: 1;
  transform: none;
  transition:
    opacity var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

.snui-menu-popover[data-entering],
.snui-menu-popover[data-exiting] {
  opacity: 0;
  transform: translateY(-0.25rem);
}

.snui-menu {
  min-width: 10rem;
  max-width: min(20rem, 100%);
  max-height: inherit;
  padding: var(--snui-space-1);
  overflow-y: auto;
}

.snui-menu__item {
  display: flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-2);
  padding: var(--snui-space-1) var(--snui-space-3);
  border-radius: var(--snui-radius-sm);
  color: var(--snui-color-text);
  cursor: default;
  outline: none;
}

.snui-menu__item[data-hovered],
.snui-menu__item[data-focused] {
  background: var(--snui-color-interactive-hover);
}

.snui-menu__item[data-focus-visible] {
  outline: 2px solid var(--snui-color-focus);
  outline-offset: -2px;
}

.snui-menu__item[data-pressed] {
  background: color-mix(
    in srgb,
    var(--snui-color-accent-fill) 12%,
    var(--snui-color-interactive-hover)
  );
}

.snui-menu__item[data-disabled] {
  cursor: not-allowed;
  opacity: 0.58;
}

.snui-menu__item--destructive {
  color: var(--snui-color-danger);
  font-weight: var(--snui-font-weight-bold);
}

.snui-menu__separator {
  margin: var(--snui-space-1) var(--snui-space-2);
  border-top: 1px solid var(--snui-color-border);
}

.snui-menu__section + .snui-menu__section {
  border-top: 1px solid var(--snui-color-border);
  margin-top: var(--snui-space-1);
  padding-top: var(--snui-space-1);
}

.snui-menu__section-header {
  padding: var(--snui-space-2) var(--snui-space-3) var(--snui-space-1);
  color: var(--snui-color-text-muted);
  font-size: 0.8125em;
  font-weight: var(--snui-font-weight-bold);
}

@media (forced-colors: active) {
  .snui-menu-popover {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }

  /*
   * Forced colors flattens the hover fill, which erases the focused item.
   * Reconstruct the focused state with a system highlight.
   */
  .snui-menu__item[data-focused],
  .snui-menu__item[data-hovered],
  .snui-menu__item[data-pressed] {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}
`);

export const POPOVER_STYLES = scopeStyles(`
/* ==== Popover (anchored content overlay) ==== */

.snui-popover {
  z-index: var(--snui-z-overlay);
  width: var(--snui-popover-width, auto);
  max-width: min(24rem, 100%);
  padding: var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  opacity: 1;
  transform: none;
  transition:
    opacity var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

.snui-popover[data-entering],
.snui-popover[data-exiting] {
  opacity: 0;
  transform: translateY(-0.25rem);
}

@media (forced-colors: active) {
  .snui-popover {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}
`);

export const TOAST_STYLES = scopeStyles(`
/* ==== Toast (ToastRegion, queued toast cards) ==== */

@keyframes ${TOAST_ENTER_ANIMATION} {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}

.snui-toast-region {
  position: absolute;
  inset-block-end: var(--snui-space-4);
  inset-inline-end: var(--snui-space-4);
  z-index: var(--snui-z-toast);
  display: flex;
  width: min(22rem, calc(100% - 2 * var(--snui-space-4)));
  flex-direction: column;
  gap: var(--snui-space-2);
  /* Clicks pass through the gaps between toasts to the panel below. */
  pointer-events: none;
}

.snui-toast {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
  border: 1px solid var(--snui-color-border);
  border-inline-start-width: 0.3rem;
  border-radius: var(--snui-radius-md);
  background: var(--snui-color-surface-raised);
  box-shadow: var(--snui-shadow-overlay);
  color: var(--snui-color-text);
  pointer-events: auto;
  animation: ${TOAST_ENTER_ANIMATION} var(--snui-transition-fast);
  transition:
    opacity var(--snui-transition-fast),
    transform var(--snui-transition-fast);
}

.snui-toast[data-exiting] {
  opacity: 0;
  transform: translateY(0.25rem);
}

.snui-toast--info { border-inline-start-color: var(--snui-color-info); }
.snui-toast--success { border-inline-start-color: var(--snui-color-success); }
.snui-toast--warning { border-inline-start-color: var(--snui-color-warning); }
.snui-toast--danger { border-inline-start-color: var(--snui-color-danger); }

.snui-toast__tone {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--snui-space-1);
  padding-block-start: 0.1875rem;
  color: var(--snui-color-info);
  font-size: var(--snui-font-size-xs);
  font-weight: var(--snui-font-weight-heavy);
  line-height: 1;
}

.snui-toast--success .snui-toast__tone { color: var(--snui-color-success); }
.snui-toast--warning .snui-toast__tone { color: var(--snui-color-warning); }
.snui-toast--danger .snui-toast__tone { color: var(--snui-color-danger); }

.snui-toast__tone-dot {
  width: 0.55rem;
  height: 0.55rem;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: currentColor;
}

/*
 * Per-tone dot shapes copy the StatusIndicator dots, so tone never depends
 * on color alone. The glyph beside the dot carries the same meaning as the
 * Banner severity symbol.
 */
.snui-toast--info .snui-toast__tone-dot {
  border-radius: var(--snui-radius-sm);
}

.snui-toast--success .snui-toast__tone-dot {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  border-radius: 0;
}

.snui-toast--warning .snui-toast__tone-dot {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  border-radius: 0;
}

.snui-toast--danger .snui-toast__tone-dot {
  clip-path: polygon(
    50% 0,
    100% 25%,
    100% 75%,
    50% 100%,
    0 75%,
    0 25%
  );
  border-radius: 0;
}

.snui-toast__text {
  min-width: 0;
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.snui-toast__title {
  font-weight: var(--snui-font-weight-bold);
}

.snui-toast__description {
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
}

@media (forced-colors: active) {
  /*
   * The tone border survives as a system color, and the shaped dot is
   * reconstructed with CanvasText, so tone still does not depend on hue.
   */
  .snui-toast__tone-dot {
    background: CanvasText;
    forced-color-adjust: none;
  }
}
`);
