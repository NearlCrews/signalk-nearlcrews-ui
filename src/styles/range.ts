import {
  DISABLED_DECLARATIONS,
  FORCED_COLORS_INVALID_DECLARATIONS,
  TRACK_THICKNESS,
  TRACK_THICKNESS_COARSE,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * The WebKit track background: the filled portion up to the value, then the
 * rest. Written once because right-to-left mirrors it and forced colors
 * rebuilds both halves with system colors, each at its own indentation.
 */
function trackFill(
  direction: "left" | "right",
  [filled, rest]: readonly [filled: string, rest: string],
  indent: string,
): string {
  return [
    `${indent}background: linear-gradient(`,
    `${indent}  to ${direction},`,
    `${indent}  ${filled} 0 var(--snui-range-progress, 0%),`,
    `${indent}  ${rest} var(--snui-range-progress, 0%)`,
    `${indent});`,
  ].join("\n");
}

/** The thumb's size, which follows the density contract in both engines. */
const THUMB_SIZE_DECLARATIONS = [
  "  width: var(--snui-range-thumb-size);",
  "  height: var(--snui-range-thumb-size);",
].join("\n");

/** The thumb's face, painted the same in both engines. */
const THUMB_FACE_DECLARATIONS = [
  "  border: 2px solid var(--snui-color-surface);",
  "  border-radius: 50%;",
  "  background: var(--snui-color-accent-fill);",
].join("\n");

/** The thumb under forced colors, in both engines. */
const FORCED_COLORS_THUMB_DECLARATIONS = [
  "    forced-color-adjust: none;",
  "    border-color: Canvas;",
  "    background: Highlight;",
].join("\n");

/** The filled and remaining track colors, themed and forced. */
const TRACK_COLORS = [
  "var(--snui-range-progress-color)",
  "var(--snui-range-track-color)",
] as const;
const FORCED_TRACK_COLORS = ["Highlight", "ButtonText"] as const;

/**
 * Range slider styles. Installed by `RangeInput` through
 * `useOptionalModuleStyles`, so a panel without a slider never injects them.
 * The track and progress tokens stay in the root sheet, which owns every
 * token this module points at.
 */
export const RANGE_STYLES: StyleModule = {
  id: "range",
  styles: scopeStyles(`
.snui-range {
  appearance: none;
  width: 100%;
  min-height: var(--snui-control-min-height);
  margin: 0;
  background: transparent;
  accent-color: var(--snui-color-accent-fill);
  cursor: pointer;
}

.snui-range::-webkit-slider-runnable-track {
  height: ${TRACK_THICKNESS};
  border: 0;
  border-radius: var(--snui-radius-pill);
${trackFill("right", TRACK_COLORS, "  ")}
}

.snui-range:dir(rtl)::-webkit-slider-runnable-track {
${trackFill("left", TRACK_COLORS, "  ")}
}

/*
 * The thumb opts out of native rendering, so the user-agent target-size
 * exception no longer applies to it. It scales with the density contract
 * instead of staying fixed while every other control grows.
 */
.snui-range::-webkit-slider-thumb {
  appearance: none;
${THUMB_SIZE_DECLARATIONS}
  margin-block-start: calc((${TRACK_THICKNESS} - var(--snui-range-thumb-size)) / 2);
${THUMB_FACE_DECLARATIONS}
}

.snui-range::-moz-range-track {
  height: ${TRACK_THICKNESS};
  border: 0;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-track-color);
}

.snui-range::-moz-range-progress {
  height: ${TRACK_THICKNESS};
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-progress-color);
}

.snui-range::-moz-range-thumb {
${THUMB_SIZE_DECLARATIONS}
${THUMB_FACE_DECLARATIONS}
}

/*
 * Only the filled portion takes the danger color. Recoloring the remainder
 * with it would flatten the two halves into one bar, and the boundary between
 * them is where the value reads, which is what the operator has to correct.
 */
.snui-range[aria-invalid="true"] {
  --snui-range-progress-color: var(--snui-color-danger);
}

.snui-range:disabled {
${DISABLED_DECLARATIONS}
  --snui-range-progress-color: var(--snui-color-text-disabled);
}

.snui-range:disabled::-webkit-slider-thumb {
  background: var(--snui-color-text-disabled);
}

.snui-range:disabled::-moz-range-thumb {
  background: var(--snui-color-text-disabled);
}

/*
 * The track follows the pointer the way the progress bar's does: the thumb
 * already grows here, and a hairline track under a 2.75rem thumb reads as a
 * line rather than as the length the value sits on.
 */
@media (any-pointer: coarse) {
  .snui-range::-webkit-slider-runnable-track,
  .snui-range::-moz-range-track,
  .snui-range::-moz-range-progress {
    height: ${TRACK_THICKNESS_COARSE};
  }

  .snui-range::-webkit-slider-thumb {
    margin-block-start: calc(
      (${TRACK_THICKNESS_COARSE} - var(--snui-range-thumb-size)) / 2
    );
  }
}

@media (forced-colors: active) {
  /* The invalid outline the root sheet reconstructs for every field. */
  .snui-range[aria-invalid="true"] {
${FORCED_COLORS_INVALID_DECLARATIONS}
  }

  /*
   * Forced colors would flatten the gradient into one system color and take
   * the filled portion with it, leaving the thumb as the only reading of the
   * value. The two halves are rebuilt with system colors instead.
   */
  .snui-range::-webkit-slider-runnable-track {
    forced-color-adjust: none;
${trackFill("right", FORCED_TRACK_COLORS, "    ")}
  }

  .snui-range:dir(rtl)::-webkit-slider-runnable-track {
    forced-color-adjust: none;
${trackFill("left", FORCED_TRACK_COLORS, "    ")}
  }

  .snui-range::-webkit-slider-thumb {
${FORCED_COLORS_THUMB_DECLARATIONS}
  }

  .snui-range::-moz-range-track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-range::-moz-range-progress {
    forced-color-adjust: none;
    background: Highlight;
  }

  .snui-range::-moz-range-thumb {
${FORCED_COLORS_THUMB_DECLARATIONS}
  }
}
`),
};
