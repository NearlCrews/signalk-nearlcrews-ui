import { versionedAnimationName } from "../version.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";
import { toneColorRules } from "./tone-rules.js";

/** A versioned global name prevents keyframe collisions between package copies. */
const PROGRESS_INDETERMINATE_ANIMATION =
  versionedAnimationName("progress-slide");

/**
 * Progress bar styles. Installed by `Progress` through
 * `useOptionalModuleStyles`, so a panel without one never injects them. The
 * keyframe sits outside the scope block, where `@keyframes` has to live.
 */
export const PROGRESS_STYLES: StyleModule = {
  id: "progress",
  styles: `
@keyframes ${PROGRESS_INDETERMINATE_ANIMATION} {
  from { inset-inline-start: -40%; }
  to { inset-inline-start: 100%; }
}

${scopeStyles(`
.snui-progress {
  display: grid;
  min-width: 0;
  gap: var(--snui-space-1);
}

.snui-progress__label {
  min-width: 0;
  color: var(--snui-color-text);
  font-weight: var(--snui-font-weight-semibold);
  overflow-wrap: anywhere;
}

.snui-progress__track {
  position: relative;
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-track);
}

.snui-progress__fill {
  height: 100%;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-accent-fill);
  transition: inline-size var(--snui-transition-fast);
}

${toneColorRules((tone) => `.snui-progress--tone-${tone} .snui-progress__fill`, "background")}

.snui-progress--indeterminate .snui-progress__fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 40%;
  animation: ${PROGRESS_INDETERMINATE_ANIMATION} 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  /*
   * The indeterminate slide stops moving rather than slowing down, so the
   * static 40 percent fill keeps signaling activity without motion.
   */
  .snui-progress--indeterminate .snui-progress__fill {
    /* Longhand: the stylesheet keyframe audit scans animation shorthands. */
    animation-name: none;
    inset-inline-start: 0;
  }
}

@media (forced-colors: active) {
  .snui-progress__track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-progress__fill {
    forced-color-adjust: none;
    background: Highlight;
  }
}
`)}`,
};
