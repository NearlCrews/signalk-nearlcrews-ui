import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type SegmentedControlLegendVisibility = "hidden" | "visible";
export type SegmentedControlOrientation = "horizontal" | "vertical";

/**
 * The APG radio-group pattern optionally moves focus without changing the
 * selection when the platform's focus modifier is held: Cmd on macOS, Ctrl
 * elsewhere. Resolve the modifier once at module scope.
 */
const platformHint =
  typeof navigator === "undefined"
    ? ""
    : `${navigator.platform} ${navigator.userAgent}`;
const FOCUS_MOVE_MODIFIER: "ctrlKey" | "metaKey" = /Mac/i.test(platformHint)
  ? "metaKey"
  : "ctrlKey";

export interface SegmentedControlOption<Value extends string> {
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: Value;
}

export interface SegmentedControlProps<Value extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly defaultValue?: Value;
  readonly disabled?: boolean;
  readonly legend: ReactNode;
  readonly legendVisibility?: SegmentedControlLegendVisibility;
  /** Carries the selection into native form submission and form reset. */
  readonly name?: string;
  readonly onChange: (value: Value) => void;
  readonly options: readonly SegmentedControlOption<Value>[];
  readonly orientation?: SegmentedControlOrientation;
  readonly value?: Value;
}

export function SegmentedControl<Value extends string>({
  className,
  defaultValue,
  disabled = false,
  legend,
  legendVisibility = "hidden",
  name,
  onChange,
  options,
  orientation = "horizontal",
  ref,
  value,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SegmentedControlProps<Value>): React.JSX.Element {
  if (!hasReactContent(legend)) {
    throw new Error("SegmentedControl requires a non-empty legend.");
  }

  const legendId = useId();
  const buttons = useRef(new Map<Value, HTMLButtonElement>());
  const [internalValue, setInternalValue] = useState<Value | undefined>(
    defaultValue,
  );
  const effectiveValue = value ?? internalValue;
  const enabledOptions = options.filter((option) => option.disabled !== true);
  const selectedEnabled = enabledOptions.some(
    (option) => option.value === effectiveValue,
  );
  const fallbackValue = enabledOptions[0]?.value;

  // Keep the hidden input's default value aligned so a native form reset
  // restores the defaultValue selection even before React re-renders, and
  // mirror platform radio groups by restoring the selection on reset.
  const setHiddenInputRef = useCallback(
    (node: HTMLInputElement | null): (() => void) | undefined => {
      if (node === null) return undefined;
      node.defaultValue = defaultValue ?? "";
      const form = node.form;
      if (form === null) return undefined;
      const onReset = (): void => {
        if (value === undefined) setInternalValue(defaultValue);
      };
      form.addEventListener("reset", onReset);
      return () => form.removeEventListener("reset", onReset);
    },
    [defaultValue, value],
  );

  const select = (nextValue: Value): void => {
    if (value === undefined) setInternalValue(nextValue);
    onChange(nextValue);
  };

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentValue: Value,
  ): void => {
    let nextIndex: number | null = null;
    const currentIndex = enabledOptions.findIndex(
      (option) => option.value === currentValue,
    );
    const stepForward =
      currentIndex < 0 ? 0 : (currentIndex + 1) % enabledOptions.length;
    const stepBackward =
      currentIndex < 0
        ? enabledOptions.length - 1
        : (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;

    if (orientation === "horizontal") {
      const isRtl = event.currentTarget.matches(":dir(rtl)");
      if (
        (event.key === "ArrowRight" && !isRtl) ||
        (event.key === "ArrowLeft" && isRtl)
      ) {
        nextIndex = stepForward;
      } else if (
        (event.key === "ArrowLeft" && !isRtl) ||
        (event.key === "ArrowRight" && isRtl)
      ) {
        nextIndex = stepBackward;
      }
    } else if (event.key === "ArrowDown") {
      nextIndex = stepForward;
    } else if (event.key === "ArrowUp") {
      nextIndex = stepBackward;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledOptions.length - 1;
    }

    if (nextIndex === null) return;
    const nextOption = enabledOptions[nextIndex];
    if (nextOption === undefined) return;

    event.preventDefault();
    if (event[FOCUS_MOVE_MODIFIER]) {
      buttons.current.get(nextOption.value)?.focus();
      return;
    }
    select(nextOption.value);
    buttons.current.get(nextOption.value)?.focus();
  };

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-segmented", className)}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      aria-orientation={orientation}
      aria-labelledby={joinIdReferences(ariaLabelledBy, legendId)}
    >
      <span
        id={legendId}
        className={
          legendVisibility === "visible"
            ? "snui-segmented__legend"
            : "snui-visually-hidden"
        }
      >
        {legend}
      </span>
      <div
        className={classNames(
          "snui-segmented__group",
          orientation === "vertical" && "snui-segmented__group--vertical",
        )}
      >
        {options.map((option) => {
          const checked = option.value === effectiveValue;
          const optionDisabled = disabled || option.disabled === true;
          const firstEnabled =
            !selectedEnabled && option.value === fallbackValue;

          return (
            // biome-ignore lint/a11y/useSemanticElements: Button-backed ARIA radios provide roving focus and immediate keyboard selection.
            <button
              key={option.value}
              ref={(node: HTMLButtonElement) => {
                buttons.current.set(option.value, node);
                return () => {
                  buttons.current.delete(option.value);
                };
              }}
              type="button"
              role="radio"
              className="snui-segmented__option"
              aria-checked={checked}
              disabled={optionDisabled}
              tabIndex={!optionDisabled && (checked || firstEnabled) ? 0 : -1}
              onClick={() => select(option.value)}
              onKeyDown={(event) => moveSelection(event, option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {name === undefined ? null : (
        <input
          ref={setHiddenInputRef}
          type="hidden"
          name={name}
          value={effectiveValue ?? ""}
          readOnly
        />
      )}
    </div>
  );
}
