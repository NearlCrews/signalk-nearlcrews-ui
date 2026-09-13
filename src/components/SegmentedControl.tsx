import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { blockedActivationProps } from "../utils/activation.js";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isRightToLeft } from "../utils/direction.js";
import { resolveFieldRegions } from "../utils/field-error.js";
import { observeFormReset } from "../utils/form-reset.js";
import { requireNonEmptyUniqueOptions } from "../utils/options.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { nextRovingIndex } from "../utils/roving.js";
import type { Orientation, Visibility } from "../utils/variants.js";
import { FieldError } from "./FieldError.js";

/** Alias of the shared {@link Visibility} vocabulary. */
export type SegmentedControlLabelVisibility = Visibility;

/**
 * Holding the platform's focus modifier moves focus without changing the
 * selection: Cmd on macOS, Ctrl elsewhere. The affordance is borrowed from
 * the listbox and grid patterns, where a modifier decouples focus from
 * selection; the APG radio group pattern itself defines no such key, so this
 * is an addition rather than a rule from it.
 *
 * The platform is read from the user agent string alone. `navigator.platform`
 * answers the same question, and adds nothing: engines freeze it to a
 * generic value, so the user agent is the fallback either way, and
 * `navigator.userAgentData` is absent in two engines and undefined outside a
 * secure context, which is how a panel is normally reached over a boat LAN.
 */
const platformHint =
  typeof navigator === "undefined" ? "" : navigator.userAgent;
const FOCUS_MOVE_MODIFIER: "ctrlKey" | "metaKey" = /Mac/i.test(platformHint)
  ? "metaKey"
  : "ctrlKey";

/**
 * The axis a key travels along, whatever the group's own orientation.
 *
 * The radio pattern binds both axes, so Down moves to the next option in a
 * horizontal group too. Only the horizontal pair mirrors in a right-to-left
 * panel, which is exactly what asking the shared step for a vertical group
 * expresses.
 */
const KEY_AXIS: Readonly<Record<string, Orientation>> = {
  ArrowDown: "vertical",
  ArrowLeft: "horizontal",
  ArrowRight: "horizontal",
  ArrowUp: "vertical",
};

const OPTION_SELECTOR = '[role="radio"]';

/**
 * Moves focus to the option at a position in the group the pressed option
 * belongs to. Reading the buttons from the DOM keeps their order authoritative
 * without registering each one, and the positions match the option list
 * because the group renders one button per option in that order.
 */
function focusOption(pressed: HTMLButtonElement, index: number): void {
  const group = pressed.parentElement;
  if (group === null) return;
  group.querySelectorAll<HTMLButtonElement>(OPTION_SELECTOR)[index]?.focus();
}

export interface SegmentedControlOption<Value extends string> {
  readonly disabled?: boolean | undefined;
  readonly label: ReactNode;
  readonly value: Value;
}

export interface SegmentedControlProps<Value extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly defaultValue?: Value | undefined;
  /** Guidance under the group name, read as part of the group's description. */
  readonly description?: ReactNode | undefined;
  /**
   * Takes every option out of the tab order. Reach for `readOnly` instead
   * where the choice is real but cannot be changed right now.
   */
  readonly disabled?: boolean | undefined;
  /** Validation message under the options. Marks the group invalid while set. */
  readonly error?: ReactNode | undefined;
  /** How the error is announced. Defaults to `"off"`. */
  readonly errorLive?: AnnouncementMode | undefined;
  /**
   * Accessible name of the group. The group is a `role="radiogroup"` div, not
   * a fieldset, so the name is not a `<legend>` element.
   */
  readonly label: ReactNode;
  /** Whether the group name is drawn. Defaults to `"hidden"`. */
  readonly labelVisibility?: SegmentedControlLabelVisibility | undefined;
  /** Carries the selection into native form submission and form reset. */
  readonly name?: string | undefined;
  /**
   * Receives the selected value. Composed controls report values, not React
   * change events; the native inputs keep the event form.
   */
  readonly onValueChange?: ((value: Value) => void) | undefined;
  readonly options: readonly SegmentedControlOption<Value>[];
  readonly orientation?: Orientation | undefined;
  /**
   * Blocks the selection from changing while every option keeps its tab stop
   * and refuses activation. Reach for it where the choice is real but cannot
   * be changed right now, such as while a save is in flight; `disabled` takes
   * the group out of the tab order instead, which destroys focus if it lands
   * on the option the user is standing on.
   */
  readonly readOnly?: boolean | undefined;
  readonly value?: Value | undefined;
}

export function SegmentedControl<Value extends string>({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  className,
  defaultValue,
  description,
  disabled = false,
  error,
  errorLive = "off",
  label,
  labelVisibility = "hidden",
  name,
  onValueChange,
  options,
  orientation = "horizontal",
  readOnly = false,
  ref,
  value,
  ...props
}: SegmentedControlProps<Value>): React.JSX.Element {
  requireContent(label, "SegmentedControl requires a non-empty label.");
  // One pass per option list rather than one per render: the checks can only
  // fail on a caller mistake, and the keyboard walk needs the same pass.
  const enabledOptions = useMemo(() => {
    requireNonEmptyUniqueOptions(options, "SegmentedControl");
    for (const option of options) {
      requireContent(
        option.label,
        "SegmentedControl options require non-empty labels.",
      );
    }
    return options.filter((option) => option.disabled !== true);
  }, [options]);

  const groupId = useId();
  const labelId = `${groupId}-label`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const { descriptionId, errorId, referencedErrorId, rendersError } =
    resolveFieldRegions(groupId, hasDescription, hasError, errorLive);
  const describedBy = joinIdReferences(
    ariaDescribedBy,
    descriptionId,
    referencedErrorId,
  );
  const [effectiveValue, select, setInternalValue] = useControllableState<
    Value | undefined
  >(
    value,
    defaultValue,
    // The control only ever commits one of its own option values; the wider
    // signature is what the shared hook states for a value that may be unset.
    onValueChange as ((next: Value | undefined) => void) | undefined,
  );
  const selectedEnabled = enabledOptions.some(
    (option) => option.value === effectiveValue,
  );
  const fallbackValue = enabledOptions[0]?.value;

  // The reset listener reads the latest value props through refs so the
  // callback ref below stays stable: a controlled selection change must not
  // detach and reattach the hidden input on every render.
  const valueRef = useRef(value);
  const defaultValueRef = useRef(defaultValue);
  const hiddenInput = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    valueRef.current = value;
    defaultValueRef.current = defaultValue;
    // The input's own default follows the prop, so a default changed after
    // mount cannot leave a native reset restoring the one captured then.
    const node = hiddenInput.current;
    if (node !== null) node.defaultValue = defaultValue ?? "";
  }, [defaultValue, value]);

  // Mirror platform radio groups by restoring the selection on a form reset.
  const restoreOnReset = useCallback(
    (node: HTMLInputElement) =>
      observeFormReset(node, (input) => {
        const controlledValue = valueRef.current;
        if (controlledValue === undefined) {
          setInternalValue(defaultValueRef.current);
          return;
        }
        // A controlled selection belongs to the parent, so the reset leaves it
        // alone. The native reset still rewrites the input, and no rerender
        // follows to correct it, so the submitted value is restored here.
        input.value = controlledValue;
      }),
    // The setter is the stable useState one the hook hands back, so the ref
    // callback keeps its identity and never detaches the hidden input.
    [setInternalValue],
  );
  const attachHiddenInput = useNodeRef(hiddenInput, undefined, restoreOnReset);

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

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentValue: Value,
  ): void => {
    const axis = KEY_AXIS[event.key] ?? orientation;
    const nextIndex = nextRovingIndex({
      count: enabledOptions.length,
      currentIndex: enabledOptions.findIndex(
        (option) => option.value === currentValue,
      ),
      key: event.key,
      orientation: axis,
      // Resolved for the mirroring pair alone, so an unrelated key press does
      // not read a computed style.
      rtl:
        KEY_AXIS[event.key] === "horizontal" &&
        isRightToLeft(event.currentTarget),
    });
    if (nextIndex === null) return;
    const nextOption = enabledOptions[nextIndex];
    if (nextOption === undefined) return;

    event.preventDefault();
    // The focus modifier moves focus without changing the selection, and a
    // read-only group never changes it at all.
    if (!readOnly && !event[FOCUS_MOVE_MODIFIER]) select(nextOption.value);
    focusOption(event.currentTarget, options.indexOf(nextOption));
  };

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-segmented", className)}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      aria-invalid={hasError || undefined}
      aria-orientation={orientation}
      aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
      {...(describedBy === undefined
        ? {}
        : { "aria-describedby": describedBy })}
      {...(referencedErrorId === undefined
        ? {}
        : { "aria-errormessage": referencedErrorId })}
    >
      <span
        id={labelId}
        className={
          labelVisibility === "visible"
            ? "snui-segmented__legend"
            : "snui-visually-hidden"
        }
      >
        {label}
      </span>
      {hasDescription ? (
        <span id={descriptionId} className="snui-segmented__description">
          {description}
        </span>
      ) : null}
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
              type="button"
              role="radio"
              className="snui-segmented__option"
              aria-checked={checked}
              disabled={optionDisabled}
              tabIndex={!optionDisabled && (checked || firstEnabled) ? 0 : -1}
              {...blockedActivationProps<HTMLButtonElement>({
                blocked: readOnly,
                disabled: optionDisabled,
                onClick: () => {
                  select(option.value);
                },
                onKeyDown: (event) => {
                  moveSelection(event, option.value);
                },
              })}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {rendersError ? (
        <FieldError
          className="snui-segmented__error"
          error={error}
          hasError={hasError}
          id={errorId}
          live={errorLive}
        />
      ) : null}
      {name === undefined ? null : (
        <input
          ref={attachHiddenInput}
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
