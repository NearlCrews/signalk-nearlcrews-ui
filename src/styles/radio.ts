import {
  CONTROL_LABEL_DECLARATIONS,
  CONTROL_ROW_DECLARATIONS,
  DISABLED_DECLARATIONS,
  FIELD_DESCRIPTION_DECLARATIONS,
  FIELD_ERROR_DECLARATIONS,
  FIELD_STACK_DECLARATIONS,
  FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
  FORCED_COLORS_INVALID_DECLARATIONS,
  focusRingDeclarations,
  SELECTION_GLYPH_SIZE,
} from "./fragments.js";
import type { StyleModule } from "./install.js";
import { scopeStyles } from "./scope.js";

/**
 * Radio and radio group styles. Installed by `RadioGroup` through
 * `useOptionalModuleStyles`, which covers the `Radio` children it wraps, so a
 * panel without a radio group never injects them. The rule that hides an
 * empty error region stays in the root sheet, shared with every other field.
 */
export const RADIO_STYLES: StyleModule = {
  id: "radio",
  styles: scopeStyles(`
.snui-radio-group {
${FIELD_STACK_DECLARATIONS}
}

.snui-radio-group__label {
${CONTROL_LABEL_DECLARATIONS}
}

.snui-radio-group__description {
  text-wrap: pretty;
  display: block;
${FIELD_DESCRIPTION_DECLARATIONS}
}

/*
 * A group held unavailable dims its own text with the options, so the whole
 * control reads as unavailable rather than as a live question with dimmed
 * answers. React Aria marks the group root while it is disabled.
 */
.snui-radio-group[data-disabled]
  :is(.snui-radio-group__label, .snui-radio-group__description) {
  color: var(--snui-color-text-disabled);
}

.snui-radio-group__options {
  display: flex;
  flex-direction: column;
  gap: var(--snui-space-1);
}

.snui-radio-group[data-orientation="horizontal"] .snui-radio-group__options {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--snui-space-1) var(--snui-space-4);
}

.snui-radio-group__error {
${FIELD_ERROR_DECLARATIONS}
}

/*
 * The field wrapper is the component root; the interactive label inside it
 * carries every state attribute (selected, hovered, focus-visible, and the
 * rest), so all visual rules key off the button.
 */
.snui-radio__button {
${CONTROL_ROW_DECLARATIONS}
}

.snui-radio__control {
  display: grid;
  place-content: center;
  width: ${SELECTION_GLYPH_SIZE};
  height: ${SELECTION_GLYPH_SIZE};
  margin: 0.125rem 0 0;
  border: 2px solid var(--snui-color-border);
  border-radius: 50%;
  background: var(--snui-color-surface);
  transition:
    background-color var(--snui-transition-fast),
    border-color var(--snui-transition-fast);
}

.snui-radio__button[data-hovered]:not([data-disabled]) .snui-radio__control {
  border-color: var(--snui-color-accent-fill);
}

.snui-radio__control::before {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--snui-color-on-accent);
  content: "";
  opacity: 0;
}

.snui-radio__button[data-selected] .snui-radio__control {
  border-color: var(--snui-color-accent-fill);
  background: var(--snui-color-accent-fill);
}

.snui-radio__button[data-selected] .snui-radio__control::before {
  opacity: 1;
}

.snui-radio__button[data-focus-visible] .snui-radio__control {
${focusRingDeclarations("2px", true)}
}

.snui-radio__button[data-invalid] .snui-radio__control {
  border-color: var(--snui-color-danger);
}

.snui-radio__button[data-disabled] {
${DISABLED_DECLARATIONS}
}

.snui-radio__button[data-disabled] .snui-radio__control {
  border-color: var(--snui-color-text-disabled);
}

.snui-radio__button[data-disabled][data-selected] .snui-radio__control {
  background: var(--snui-color-text-disabled);
}

.snui-radio__button[data-disabled][data-selected] .snui-radio__control::before {
  background: var(--snui-color-surface);
}

.snui-radio__label {
${CONTROL_LABEL_DECLARATIONS}
}

@media (forced-colors: active) {
  /* The invalid outline the root sheet reconstructs for every field. */
  .snui-radio__button[data-invalid] .snui-radio__control {
${FORCED_COLORS_INVALID_DECLARATIONS}
  }

  /*
   * A span carrying an authored color is repainted with the forced palette's
   * ordinary text color, not with its disabled one, the way a native control
   * would be. The unavailable group says so with the system color instead.
   */
  .snui-radio-group[data-disabled]
    :is(.snui-radio-group__label, .snui-radio-group__description) {
    color: GrayText;
  }

  .snui-radio__control {
    forced-color-adjust: none;
    border-color: ButtonText;
    background: Canvas;
  }

  .snui-radio__button[data-selected] .snui-radio__control {
    border-color: Highlight;
    background: Highlight;
  }

  .snui-radio__button[data-selected] .snui-radio__control::before {
    forced-color-adjust: none;
    background: HighlightText;
  }

  .snui-radio__button[data-focus-visible] .snui-radio__control {
${FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS}
  }

  .snui-radio__button[data-hovered]:not([data-disabled]) .snui-radio__control {
    border-color: Highlight;
  }
}
`),
};
