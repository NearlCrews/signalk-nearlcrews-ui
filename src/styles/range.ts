import { DISABLED_DECLARATIONS } from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

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
  height: 0.375rem;
  border: 0;
  border-radius: var(--snui-radius-pill);
  background: linear-gradient(
    to right,
    var(--snui-range-progress-color) 0 var(--snui-range-progress, 0%),
    var(--snui-range-track-color) var(--snui-range-progress, 0%)
  );
}

.snui-range:dir(rtl)::-webkit-slider-runnable-track {
  background: linear-gradient(
    to left,
    var(--snui-range-progress-color) 0 var(--snui-range-progress, 0%),
    var(--snui-range-track-color) var(--snui-range-progress, 0%)
  );
}

/*
 * The thumb opts out of native rendering, so the user-agent target-size
 * exception no longer applies to it. It scales with the density contract
 * instead of staying fixed while every other control grows.
 */
.snui-range::-webkit-slider-thumb {
  appearance: none;
  width: var(--snui-range-thumb-size);
  height: var(--snui-range-thumb-size);
  margin-block-start: calc((0.375rem - var(--snui-range-thumb-size)) / 2);
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

.snui-range::-moz-range-track {
  height: 0.375rem;
  border: 0;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-track-color);
}

.snui-range::-moz-range-progress {
  height: 0.375rem;
  border-radius: var(--snui-radius-pill);
  background: var(--snui-range-progress-color);
}

.snui-range::-moz-range-thumb {
  width: var(--snui-range-thumb-size);
  height: var(--snui-range-thumb-size);
  border: 2px solid var(--snui-color-surface);
  border-radius: 50%;
  background: var(--snui-color-accent-fill);
}

.snui-range[aria-invalid="true"] {
  --snui-range-progress-color: var(--snui-color-danger);
  --snui-range-track-color: var(--snui-color-danger);
}

.snui-range:disabled {
${DISABLED_DECLARATIONS}
}

.snui-range:disabled {
  --snui-range-progress-color: var(--snui-color-text-disabled);
}

.snui-range:disabled::-webkit-slider-thumb {
  background: var(--snui-color-text-disabled);
}

.snui-range:disabled::-moz-range-thumb {
  background: var(--snui-color-text-disabled);
}

@media (forced-colors: active) {
  /* The invalid outline the root sheet reconstructs for every field. */
  .snui-range[aria-invalid="true"] {
    outline: 2px dashed CanvasText;
    outline-offset: 1px;
  }

  .snui-range::-webkit-slider-runnable-track,
  .snui-range:dir(rtl)::-webkit-slider-runnable-track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-range::-webkit-slider-thumb {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }

  .snui-range::-moz-range-track {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-range::-moz-range-thumb {
    forced-color-adjust: none;
    border-color: Canvas;
    background: Highlight;
  }
}
`),
};
