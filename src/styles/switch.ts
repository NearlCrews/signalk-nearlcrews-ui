import {
  CONTROL_LABEL_DECLARATIONS,
  DISABLED_DECLARATIONS,
  FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
  focusRingDeclarations,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/** Track geometry, stated once so the thumb cannot drift off its end. */
const TRACK_WIDTH = "2.25rem";
const TRACK_HEIGHT = "1.25rem";
const TRACK_BORDER = "2px";
const THUMB_SIZE = "0.875rem";
const THUMB_INSET = "0.125rem";

/**
 * How far the thumb travels, measured across the track's padding box: the
 * border-box width less both borders, the thumb, and the inset it keeps at
 * each end.
 */
const THUMB_TRAVEL = `calc(${TRACK_WIDTH} - ${TRACK_BORDER} - ${TRACK_BORDER} - ${THUMB_SIZE} - ${THUMB_INSET} - ${THUMB_INSET})`;

/**
 * Switch styles. Installed by `Switch` through `useOptionalModuleStyles`, so
 * a panel without a switch never injects them.
 */
export const SWITCH_STYLES: StyleModule = {
  id: "switch",
  styles: scopeStyles(`
.snui-switch__button {
  display: flex;
  min-height: var(--snui-control-min-height);
  align-items: center;
  gap: var(--snui-space-3);
  padding-block: var(--snui-space-2);
  cursor: pointer;
}

.snui-switch__track {
  position: relative;
  width: ${TRACK_WIDTH};
  height: ${TRACK_HEIGHT};
  flex: none;
  border: ${TRACK_BORDER} solid var(--snui-color-border);
  border-radius: var(--snui-radius-pill);
  background: var(--snui-color-surface);
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast);
}

.snui-switch__thumb {
  position: absolute;
  inset-inline-start: ${THUMB_INSET};
  inset-block-start: 50%;
  width: ${THUMB_SIZE};
  height: ${THUMB_SIZE};
  border-radius: 50%;
  background: var(--snui-color-text-muted);
  transform: translateY(-50%);
  transition:
    inset-inline-start var(--snui-transition-fast),
    background-color var(--snui-transition-fast);
}

.snui-switch__button[data-hovered]:not([data-disabled]) .snui-switch__track {
  border-color: var(--snui-color-accent-fill);
}

.snui-switch__button[data-selected] .snui-switch__track {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

.snui-switch__button[data-selected] .snui-switch__thumb {
  inset-inline-start: calc(100% - ${THUMB_SIZE} - ${THUMB_INSET});
  background: var(--snui-color-on-accent);
}

/*
 * The travel above is an inline-direction offset, which is the only form a
 * right-to-left panel mirrors on its own. Where the engine can match a
 * direction selector, the same travel is handed to the compositor as a
 * transform, with the mirror written out: an inline offset animates through
 * layout, and this is the one animation a discrete control runs on every
 * press. Chromium and Edge 118 and 119 match no :dir() selector, so they keep
 * the layout form, which is correct in both directions there.
 */
@supports selector(:dir(rtl)) {
  .snui-switch__thumb {
    transition:
      transform var(--snui-transition-fast),
      background-color var(--snui-transition-fast);
  }

  .snui-switch__button[data-selected] .snui-switch__thumb {
    inset-inline-start: ${THUMB_INSET};
    transform: translate(${THUMB_TRAVEL}, -50%);
  }

  .snui-switch__button[data-selected] .snui-switch__thumb:dir(rtl) {
    transform: translate(calc(-1 * ${THUMB_TRAVEL}), -50%);
  }
}

.snui-switch__button[data-focus-visible] .snui-switch__track {
${focusRingDeclarations("2px", true)}
}

.snui-switch__button[data-disabled] {
${DISABLED_DECLARATIONS}
}

.snui-switch__button[data-disabled] .snui-switch__track {
  border-color: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled] .snui-switch__thumb {
  background: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled][data-selected] .snui-switch__track {
  background: var(--snui-color-text-disabled);
}

.snui-switch__button[data-disabled][data-selected] .snui-switch__thumb {
  background: var(--snui-color-surface);
}

.snui-switch__label {
${CONTROL_LABEL_DECLARATIONS}
}

@media (forced-colors: active) {
  .snui-switch__track {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
  }

  .snui-switch__thumb {
    forced-color-adjust: none;
    background: ButtonText;
  }

  .snui-switch__button[data-selected] .snui-switch__track {
    forced-color-adjust: none;
    border-color: Highlight;
    background: Highlight;
  }

  .snui-switch__button[data-selected] .snui-switch__thumb {
    forced-color-adjust: none;
    background: HighlightText;
  }

  .snui-switch__button[data-focus-visible] .snui-switch__track {
${FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS}
  }

  .snui-switch__button[data-hovered]:not([data-disabled]) .snui-switch__track {
    border-color: Highlight;
  }
}
`),
};
