import { versionedAnimationName } from "../version.js";
import {
  RAISED_SURFACE_TOKEN_DECLARATIONS,
  SAFE_AREA_PADDING_DECLARATIONS,
  TONE_DOT_DECLARATIONS,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";
import {
  OVERLAY_TONE_ACCENT_BAR_DECLARATIONS,
  toneAccentBarRules,
  toneDescendantColorRules,
  toneDotShapeRules,
} from "./tone-rules.js";

/** The keyframe name the toast card animates in with. */
const TOAST_ENTER_ANIMATION = versionedAnimationName("toast-enter");

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
${SAFE_AREA_PADDING_DECLARATIONS}
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

/*
 * The first landmark takes the free space, so the stack sits at the bottom.
 * The host's announcing regions precede it, so it is the first of its type
 * rather than the first child.
 */
.snui-toast-region:first-of-type {
  margin-block-start: auto;
}

.snui-toast {
${RAISED_SURFACE_TOKEN_DECLARATIONS}
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: var(--snui-space-2);
  padding: var(--snui-space-2) var(--snui-space-3);
  /* The card floats over the page, so its outline keeps the boundary token
     the dialog, menu, and popover outlines keep. */
${OVERLAY_TONE_ACCENT_BAR_DECLARATIONS}
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

/* The same mark StatusIndicator paints, so the shapes read at a glance. */
.snui-toast__tone-dot {
${TONE_DOT_DECLARATIONS}
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
