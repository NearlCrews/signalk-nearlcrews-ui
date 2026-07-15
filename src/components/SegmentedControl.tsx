import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

import { classNames } from "../utils/class-names.js";

export interface SegmentedControlOption<Value extends string> {
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: Value;
}

export interface SegmentedControlProps<Value extends string> {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly legend: ReactNode;
  readonly onChange: (value: Value) => void;
  readonly options: readonly SegmentedControlOption<Value>[];
  readonly value: Value;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

export function SegmentedControl<Value extends string>({
  className,
  disabled = false,
  legend,
  onChange,
  options,
  value,
}: SegmentedControlProps<Value>): React.JSX.Element {
  const legendId = useId();
  const buttons = useRef(new Map<Value, HTMLButtonElement>());
  const enabledOptions = options.filter((option) => option.disabled !== true);
  const selectedEnabled = enabledOptions.some(
    (option) => option.value === value,
  );
  const fallbackValue = enabledOptions[0]?.value;

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentValue: Value,
  ): void => {
    let nextIndex: number | null = null;
    const currentIndex = enabledOptions.findIndex(
      (option) => option.value === currentValue,
    );

    if (NEXT_KEYS.has(event.key)) {
      nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % enabledOptions.length;
    } else if (PREVIOUS_KEYS.has(event.key)) {
      nextIndex =
        currentIndex < 0
          ? enabledOptions.length - 1
          : (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledOptions.length - 1;
    }

    if (nextIndex === null) return;
    const nextOption = enabledOptions[nextIndex];
    if (nextOption === undefined) return;

    event.preventDefault();
    onChange(nextOption.value);
    buttons.current.get(nextOption.value)?.focus();
  };

  return (
    <fieldset
      className={classNames("snui-segmented", className)}
      disabled={disabled}
    >
      <legend id={legendId} className="snui-visually-hidden">
        {legend}
      </legend>
      <div
        className="snui-segmented__group"
        role="radiogroup"
        aria-labelledby={legendId}
      >
        {options.map((option) => {
          const checked = option.value === value;
          const optionDisabled = disabled || option.disabled === true;
          const firstEnabled =
            !selectedEnabled && option.value === fallbackValue;

          return (
            // biome-ignore lint/a11y/useSemanticElements: Button-backed ARIA radios provide roving focus and immediate keyboard selection.
            <button
              key={option.value}
              ref={(node) => {
                if (node === null) buttons.current.delete(option.value);
                else buttons.current.set(option.value, node);
              }}
              type="button"
              role="radio"
              className="snui-segmented__option"
              aria-checked={checked}
              disabled={optionDisabled}
              tabIndex={!optionDisabled && (checked || firstEnabled) ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => moveSelection(event, option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
