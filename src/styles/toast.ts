import { versionedAnimationName } from "../version.js";
import { toneDotShapeRules } from "./fragments.js";
import { scopeStyles } from "./scope.js";

/** A versioned global name prevents keyframe collisions between package copies. */
const TOAST_ENTER_ANIMATION = versionedAnimationName("toast-enter");

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
${toneDotShapeRules("snui-toast", "snui-toast__tone-dot")}

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
