import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useId,
  useRef,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface SegmentedControlOption<Value extends string> {
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: Value;
}

export interface SegmentedControlProps<Value extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  readonly disabled?: boolean;
  readonly legend: ReactNode;
  readonly onChange: (value: Value) => void;
  readonly options: readonly SegmentedControlOption<Value>[];
  readonly rootRef?: Ref<HTMLDivElement>;
  readonly value: Value;
}

export function SegmentedControl<Value extends string>({
  className,
  disabled = false,
  legend,
  onChange,
  options,
  rootRef,
  value,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SegmentedControlProps<Value>): React.JSX.Element {
  if (!hasReactContent(legend)) {
    throw new Error("SegmentedControl requires a non-empty legend.");
  }

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

    const ownerWindow = event.currentTarget.ownerDocument.defaultView;
    const isRtl =
      ownerWindow?.getComputedStyle(event.currentTarget).direction === "rtl";

    if (
      event.key === "ArrowDown" ||
      (event.key === "ArrowRight" && !isRtl) ||
      (event.key === "ArrowLeft" && isRtl)
    ) {
      nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % enabledOptions.length;
    } else if (
      event.key === "ArrowUp" ||
      (event.key === "ArrowLeft" && !isRtl) ||
      (event.key === "ArrowRight" && isRtl)
    ) {
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
    <div
      {...props}
      ref={rootRef}
      className={classNames("snui-segmented", className)}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      aria-orientation="horizontal"
      aria-labelledby={joinIdReferences(ariaLabelledBy, legendId)}
    >
      <span id={legendId} className="snui-visually-hidden">
        {legend}
      </span>
      <div className="snui-segmented__group">
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
    </div>
  );
}
