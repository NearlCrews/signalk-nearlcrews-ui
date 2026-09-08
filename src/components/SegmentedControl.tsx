import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import type { Orientation } from "../utils/variants.js";

export type SegmentedControlLabelVisibility = "hidden" | "visible";
/** @deprecated Use {@link SegmentedControlLabelVisibility}. */
export type SegmentedControlLegendVisibility = SegmentedControlLabelVisibility;
/** @deprecated Use {@link Orientation}. */
export type SegmentedControlOrientation = Orientation;

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
  readonly disabled?: boolean | undefined;
  readonly label: ReactNode;
  readonly value: Value;
}

export interface SegmentedControlProps<Value extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly defaultValue?: Value | undefined;
  readonly disabled?: boolean | undefined;
  /**
   * Accessible name of the group. Either `label` or the deprecated `legend`
   * is required. The group is a `role="radiogroup"` div, not a fieldset, so
   * the name is not a `<legend>` element.
   */
  readonly label?: ReactNode | undefined;
  /** @deprecated Use `label`. */
  readonly legend?: ReactNode | undefined;
  readonly labelVisibility?: SegmentedControlLabelVisibility | undefined;
  /** @deprecated Use `labelVisibility`. */
  readonly legendVisibility?: SegmentedControlLabelVisibility | undefined;
  /** Carries the selection into native form submission and form reset. */
  readonly name?: string | undefined;
  /**
   * Receives the selected value. Composed controls report values, not React
   * change events; the native inputs keep the event form.
   */
  readonly onValueChange?: ((value: Value) => void) | undefined;
  /** @deprecated Use `onValueChange`. */
  readonly onChange?: ((value: Value) => void) | undefined;
  readonly options: readonly SegmentedControlOption<Value>[];
  readonly orientation?: Orientation | undefined;
  readonly value?: Value | undefined;
}

export function SegmentedControl<Value extends string>({
  className,
  defaultValue,
  disabled = false,
  label,
  labelVisibility,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
  legend,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
  legendVisibility,
  name,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
  onChange,
  onValueChange,
  options,
  orientation = "horizontal",
  ref,
  value,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SegmentedControlProps<Value>): React.JSX.Element {
  const groupLabel = hasReactContent(label) ? label : legend;
  requireContent(groupLabel, "SegmentedControl requires a non-empty label.");
  const groupLabelVisibility = labelVisibility ?? legendVisibility ?? "hidden";
  if (options.length === 0) {
    throw new Error("SegmentedControl requires at least one option.");
  }
  const optionValues = new Set<Value>();
  for (const option of options) {
    requireContent(
      option.label,
      "SegmentedControl options require non-empty labels.",
    );
    if (optionValues.has(option.value)) {
      throw new Error(
        `SegmentedControl option values must be unique; received duplicate value "${option.value}".`,
      );
    }
    optionValues.add(option.value);
  }

  const labelId = useId();
  const buttons = useRef(new Map<Value, HTMLButtonElement>());
  const [effectiveValue, commitValue, setInternalValue] = useControllableState<
    Value | undefined
  >(value, defaultValue);
  const enabledOptions = options.filter((option) => option.disabled !== true);
  const selectedEnabled = enabledOptions.some(
    (option) => option.value === effectiveValue,
  );
  const fallbackValue = enabledOptions[0]?.value;

  // The reset listener reads the latest value props through refs so the
  // callback ref below stays stable: a controlled selection change must not
  // detach and reattach the hidden input on every render.
  const valueRef = useRef(value);
  const defaultValueRef = useRef(defaultValue);
  useLayoutEffect(() => {
    valueRef.current = value;
    defaultValueRef.current = defaultValue;
  }, [defaultValue, value]);

  // Keep the hidden input's default value aligned so a native form reset
  // restores the defaultValue selection even before React re-renders, and
  // mirror platform radio groups by restoring the selection on reset.
  const hiddenInput = useRef<HTMLInputElement | null>(null);
  const setHiddenInputRef = useCallback(
    (node: HTMLInputElement | null): (() => void) | undefined => {
      hiddenInput.current = node;
      if (node === null) return undefined;
      node.defaultValue = defaultValueRef.current ?? "";
      const form = node.form;
      if (form === null) {
        return () => {
          hiddenInput.current = null;
        };
      }
      const onReset = (): void => {
        const controlledValue = valueRef.current;
        if (controlledValue === undefined) {
          setInternalValue(defaultValueRef.current);
          return;
        }
        // A controlled selection belongs to the parent, so the reset leaves it
        // alone. The native reset still rewrites the input, and no rerender
        // follows to correct it, so restore the submitted value once the reset
        // has finished dispatching.
        queueMicrotask(() => {
          if (node.isConnected) node.value = controlledValue;
        });
      };
      form.addEventListener("reset", onReset);
      return () => {
        form.removeEventListener("reset", onReset);
        hiddenInput.current = null;
      };
    },
    // The setter is the stable useState one the hook hands back, so the ref
    // callback keeps its identity and never detaches the hidden input.
    [setInternalValue],
  );

  // A reset that lands while this control sits in a paused subtree, inside a
  // collapsed CollapsibleSection for example, restores the input's default in
  // the DOM without reaching the listener above, and React does not rewrite a
  // value prop it believes is unchanged. Resyncing here keeps the submitted
  // value equal to the selection the control displays.
  useLayoutEffect(() => {
    const node = hiddenInput.current;
    const selected = effectiveValue ?? "";
    if (node !== null && node.value !== selected) node.value = selected;
  });

  const select = (nextValue: Value): void => {
    commitValue(nextValue);
    onValueChange?.(nextValue);
    onChange?.(nextValue);
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
    // The focus modifier moves focus without changing the selection.
    if (!event[FOCUS_MOVE_MODIFIER]) select(nextOption.value);
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
      aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
    >
      <span
        id={labelId}
        className={
          groupLabelVisibility === "visible"
            ? "snui-segmented__legend"
            : "snui-visually-hidden"
        }
      >
        {groupLabel}
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
          disabled={disabled}
          name={name}
          value={effectiveValue ?? ""}
          readOnly
        />
      )}
    </div>
  );
}
