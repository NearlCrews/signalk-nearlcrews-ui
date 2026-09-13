import { versionedAnimationName } from "../version.js";
import {
  CONTROL_LABEL_DECLARATIONS,
  FIELD_STACK_DECLARATIONS,
  TRACK_THICKNESS,
  TRACK_THICKNESS_COARSE,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";
import { toneColorRules } from "./tone-rules.js";

/** Keyframe name for the indeterminate slide. */
const PROGRESS_INDETERMINATE_ANIMATION =
  versionedAnimationName("progress-slide");

/** The same slide for a right-to-left panel, where a translate is mirrored. */
const PROGRESS_INDETERMINATE_ANIMATION_RTL =
  versionedAnimationName("progress-slide-rtl");

/**
 * Progress bar styles. Installed by `Progress` through
 * `useOptionalModuleStyles`, so a panel without one never injects them. The
 * keyframe sits outside the scope block, where `@keyframes` has to live.
 */
export const PROGRESS_STYLES: StyleModule = {
  id: "progress",
  styles: `
/*
 * A transform rather than an inset: an animated inset runs layout and paint on
 * the main thread for every frame of an animation that has no end, which is
 * the thread a panel waiting on a slow onboard network can least spare. The
 * fill is 40 percent of the track, so -100 percent of the fill and 250 percent
 * of it land exactly where the old -40 percent and 100 percent of the track
 * did. A translate is physical, hence the mirrored pair below.
 */
@keyframes ${PROGRESS_INDETERMINATE_ANIMATION} {
  from { translate: -100%; }
  to { translate: 250%; }
}

@keyframes ${PROGRESS_INDETERMINATE_ANIMATION_RTL} {
  from { translate: 100%; }
  to { translate: -250%; }
}

${scopeStyles(`
.snui-progress {
${FIELD_STACK_DECLARATIONS}
}

/* The tone mark leads the label on one line rather than taking a grid row. */
.snui-progress__heading {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: var(--snui-space-1);
}

.snui-progress__label {
${CONTROL_LABEL_DECLARATIONS}
}

.snui-progress__tone {
  flex: none;
}

.snui-progress__tone-glyph {
  vertical-align: middle;
}

.snui-progress__track {
  position: relative;
  height: ${TRACK_THICKNESS};
  overflow: hidden;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-track);
}

/*
 * A coarse pointer means a helm, a glove, or a moving cabin, where the track
 * has to read as a length at a glance. The control height and the range thumb
 * already scale here; the track is the last measured element that did not.
 */
@media (any-pointer: coarse) {
  .snui-progress__track {
    height: ${TRACK_THICKNESS_COARSE};
  }
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

.snui-progress--indeterminate:dir(rtl) .snui-progress__fill {
  /* Longhand: the stylesheet keyframe audit scans animation shorthands. */
  animation-name: ${PROGRESS_INDETERMINATE_ANIMATION_RTL};
}

@media (prefers-reduced-motion: reduce) {
  /*
   * The indeterminate slide stops moving rather than slowing down, and takes
   * a striped full-width fill so it cannot be read as a determinate value:
   * the static 40 percent fill it used to leave was pixel for pixel a bar
   * reporting forty percent complete, which is a wait of unknown length
   * announced as nearly half done.
   */
  .snui-progress--indeterminate .snui-progress__fill {
    animation-name: none;
    inline-size: 100%;
    background-image: repeating-linear-gradient(
      135deg,
      transparent 0 0.5rem,
      var(--snui-color-track) 0.5rem 1rem
    );
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
