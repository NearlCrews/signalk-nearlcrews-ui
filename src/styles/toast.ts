import { versionedAnimationName } from "../version.js";
import { visuallyHiddenDeclarations } from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";
import {
  TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
  toneDescendantColorRules,
  toneDotShapeRules,
} from "./tone-rules.js";

/** The keyframe name the toast card animates in with. */
const TOAST_ENTER_ANIMATION = versionedAnimationName("toast-enter");

/*
 * The tone dot's own diameter. Internal geometry rather than a token: it is
 * the size this one mark needs beside the card's text, not a value a consumer
 * themes.
 */
const TOAST_TONE_DOT_SIZE = "0.75rem";

/**
 * Toast region and card styles. Installed by `ToastRegion` through
 * `useModuleStyles`, so a panel without notifications never injects them.
 */
export const TOAST_STYLES: StyleModule = {
  id: "toast",
  styles: `
@keyframes ${TOAST_ENTER_ANIMATION} {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}

${scopeStyles(`
/* ==== Toast (ToastRegion, queued toast cards) ==== */

.snui-toast-region-host {
  position: fixed;
  inset-block-start: var(--snui-toast-host-top, 0px);
  inset-block-end: var(--snui-toast-host-bottom, 0px);
  /* JavaScript measures a physical viewport coordinate, including in RTL. */
  left: var(--snui-toast-host-left, 0px);
  z-index: var(--snui-z-toast);
  display: flex;
  width: var(--snui-toast-host-width, 100%);
  flex-direction: column;
  align-items: flex-end;
  gap: var(--snui-space-2);
  /* Safe-area insets are physical edges, so this shorthand stays physical. */
  padding:
    max(var(--snui-space-4), env(safe-area-inset-top, 0px))
    max(var(--snui-space-4), env(safe-area-inset-right, 0px))
    max(var(--snui-space-4), env(safe-area-inset-bottom, 0px))
    max(var(--snui-space-4), env(safe-area-inset-left, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Clicks pass through the gaps between toasts to the panel below. */
  pointer-events: none;
}

/*
 * A panel scrolled out of the visual viewport hides its notifications from
 * sight, never from assistive technology. Hiding it through visibility would
 * drop the live region and every dismiss button out of the accessibility
 * tree, so a failed save raised while the panel is off screen would go
 * unannounced and stay unreachable, including through F6. Only the paint is
 * removed: the insets reset first so the clipped box takes its static
 * position inside the panel instead of a viewport coordinate the panel no
 * longer occupies.
 */
.snui-toast-region-host:not([data-snui-toast-host-visible]) {
  inset: auto;
${visuallyHiddenDeclarations()}
}

.snui-toast-region {
  display: flex;
  width: min(22rem, 100%);
  flex: none;
  flex-direction: column;
  gap: var(--snui-space-2);
  pointer-events: none;
}

.snui-toast-region:first-child {
  margin-block-start: auto;
}

.snui-toast {
  /*
   * The card is a raised surface, so every hover fill painted inside it (the
   * dismiss button, consumer actions) needs the raised hover step to stay
   * visible in Dark, where the flat hover fill equals the raised surface.
   */
  --snui-color-interactive-hover: var(--snui-color-hover-raised);
  --snui-color-focus-ring-band: var(--snui-color-surface-raised);
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
${TONE_ACCENT_BAR_DECLARATIONS}
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

${toneAccentBarRules("snui-toast")}

/* The shaped dot keeps its own column; the glyph sits with the title. */
.snui-toast__tone {
  display: inline-flex;
  flex: none;
  align-items: center;
  padding-block-start: 0.1875rem;
  line-height: 1;
}

.snui-toast__tone-glyph {
  margin-inline-end: var(--snui-space-1);
  vertical-align: 0.1em;
}

${toneDescendantColorRules(
  "snui-toast",
  ":is(.snui-toast__tone, .snui-toast__tone-glyph)",
)}

/* The size StatusIndicator uses, so the per-tone shapes read at a glance. */
.snui-toast__tone-dot {
  width: ${TOAST_TONE_DOT_SIZE};
  height: ${TOAST_TONE_DOT_SIZE};
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
  text-wrap: balance;
  font-weight: var(--snui-font-weight-bold);
}

.snui-toast__description {
  margin-block-start: var(--snui-space-1);
  color: var(--snui-color-text-muted);
  text-wrap: pretty;
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
`)}`,
};
