import { type ReactNode, useId, useMemo } from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useResettableControl } from "../hooks/use-resettable-control.js";
import {
  blockedWithoutReasonKey,
  blockedWithoutReasonMessage,
} from "../utils/activation.js";
import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { requireNonEmptyUniqueOptions } from "../utils/options.js";
import {
  hasReactContent,
  reactNodeText,
  resolveLabelContent,
} from "../utils/react-node.js";
import { resolveSelectAllState, selectAllTarget } from "../utils/select-all.js";
import { warnOnce } from "../utils/warn-once.js";
import { FieldGroup, type FieldGroupProps } from "./FieldGroup.js";
import { Checkbox, type CheckboxReasonVisibility } from "./Inputs.js";
import { StatusIndicator } from "./StatusIndicator.js";

export interface CheckboxGroupOption<Value extends string> {
  /**
   * Blocks this option's change while its box stays focusable and keeps its
   * value, the way `Checkbox.ariaDisabled` does. Reach for it where the
   * option cannot change right now, such as the last remaining selection;
   * `disabled` takes the box out of the tab order instead.
   */
  readonly ariaDisabled?: boolean | undefined;
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  /**
   * Why the option refuses while `ariaDisabled` holds, read as its box's
   * description, the way `Checkbox.disabledReason` is.
   */
  readonly disabledReason?: ReactNode | undefined;
  readonly label: ReactNode;
  readonly value: Value;
}

/** "grid" fills columns as the panel allows; "stack" keeps one per row. */
export type CheckboxGroupLayout = "grid" | "stack";

/**
 * A multi-select group.
 *
 * The group is a real `<fieldset>`, so it is named the way
 * {@link FieldGroupProps} names one: by `label`, or by its permanent alias
 * `legend`, with `label` deciding when both are given. `RadioGroup` and
 * `SegmentedControl` are `div` groups with no `<legend>` element to name them
 * and take `label` alone.
 */
export interface CheckboxGroupProps<Value extends string>
  extends Omit<FieldGroupProps, "children" | "defaultValue" | "name"> {
  /** Controls rendered above the options, inside the group. */
  readonly children?: ReactNode | undefined;
  readonly defaultValue?: readonly Value[] | undefined;
  /**
   * Whether the blocked reasons of the options and of the select-all box are
   * drawn under their labels as well as read. Defaults to `"hidden"`.
   */
  readonly disabledReasonVisibility?: CheckboxReasonVisibility | undefined;
  /**
   * Shown while no option is selected. Use it when an enabled feature with
   * nothing selected would silently do nothing.
   */
  readonly emptyWarning?: ReactNode | undefined;
  /** How the empty warning is announced. Defaults to `"polite"`. */
  readonly emptyWarningLive?: AnnouncementMode | undefined;
  readonly layout?: CheckboxGroupLayout | undefined;
  /** Applied to every checkbox, so native form data lists the selected values. */
  readonly name?: string | undefined;
  /** Receives the selected values in option order. */
  readonly onValueChange?: ((values: readonly Value[]) => void) | undefined;
  readonly options: readonly CheckboxGroupOption<Value>[];
  /**
   * Adds a tri-state select-all checkbox to the legend row with this label.
   * It completes a partial selection and clears a full one, and it leaves
   * blocked options as they are, whether they are `disabled` or
   * `ariaDisabled`: an option the user cannot change is not one select-all
   * may change for them.
   *
   * Name it after what it selects, "All layers" or "All sources", so the row
   * reads as a summary of the group rather than as a command. There is no
   * default, because only the consumer knows the noun.
   */
  readonly selectAllLabel?: ReactNode | undefined;
  /**
   * Why the select-all box refuses when no option can change, read as its
   * description. The box stays focusable then, so it needs a reason the way
   * any blocked box does, such as "Turn on chart import first."
   */
  readonly selectAllDisabledReason?: ReactNode | undefined;
  /**
   * The selected values. A value no option carries is dropped the first time
   * any box is toggled, because the group reports the selection its own
   * options describe.
   */
  readonly value?: readonly Value[] | undefined;
}

/**
 * The values a record of flags selects, in the order the options list them.
 *
 * A plugin schema usually stores a multi-select as one boolean per key, and
 * this is the half of that translation the group reads. The pair is exported
 * so every panel does not write and test its own adapter.
 */
export function toCheckboxGroupValue<Value extends string>(
  flags: Partial<Readonly<Record<Value, boolean>>>,
  options: readonly CheckboxGroupOption<Value>[],
): readonly Value[] {
  return options
    .filter((option) => flags[option.value] === true)
    .map((option) => option.value);
}

/**
 * The record a selection writes back: every option's key is present, so a
 * value the user cleared is stored as `false` rather than dropped, which is
 * what a schema with a boolean per key expects.
 */
export function applyCheckboxGroupValue<Value extends string>(
  values: readonly Value[],
  options: readonly CheckboxGroupOption<Value>[],
): Readonly<Record<Value, boolean>> {
  const selected = new Set(values);
  const flags = {} as Record<Value, boolean>;
  for (const option of options) {
    flags[option.value] = selected.has(option.value);
  }
  return flags;
}

export function CheckboxGroup<Value extends string>({
  actions,
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  defaultValue,
  disabledReasonVisibility,
  emptyWarning,
  emptyWarningLive = "polite",
  label,
  layout = "grid",
  legend,
  name,
  onValueChange,
  options,
  ref,
  selectAllDisabledReason,
  selectAllLabel,
  value,
  ...groupProps
}: CheckboxGroupProps<Value>): React.JSX.Element {
  // Resolved here rather than left to the fieldset, so a blank name is
  // reported against the component the consumer rendered.
  const groupLabel = resolveLabelContent(
    label,
    legend,
    "CheckboxGroup requires a non-empty label or legend.",
  );
  // One pass per option list rather than three per render: the validation can
  // only fail on a caller mistake, and the enabled scan answers both the
  // select-all state and what select-all may reach.
  const enabled = useMemo(() => {
    requireNonEmptyUniqueOptions(options, "CheckboxGroup");
    return options
      .filter(
        (option) => option.disabled !== true && option.ariaDisabled !== true,
      )
      .map((option) => option.value);
  }, [options]);

  const warningId = useId();
  const [selectedValues, commitValues, setSelectedValues] =
    useControllableState<readonly Value[]>(
      value,
      defaultValue ?? [],
      onValueChange,
    );
  const selected = useMemo(() => new Set(selectedValues), [selectedValues]);

  const fieldsetRef = useResettableControl(ref, groupProps.form, () => {
    // Each box restores its own checkedness from the checked prop it was
    // given, which is this group's current selection, so the group is the
    // one that has to return to its default. A controlled selection belongs
    // to the parent, which observes the same reset.
    if (value === undefined) setSelectedValues(defaultValue ?? []);
  });

  const commit = (next: ReadonlySet<Value>): void => {
    // Option order keeps the reported array stable however the boxes were
    // toggled, and a value no option carries is not the group's to report.
    const ordered = options
      .filter((option) => next.has(option.value))
      .map((option) => option.value);
    commitValues(ordered);
  };

  const toggle = (optionValue: Value, checked: boolean): void => {
    const next = new Set(selected);
    if (checked) next.add(optionValue);
    else next.delete(optionValue);
    commit(next);
  };

  let enabledSelected = 0;
  for (const enabledValue of enabled) {
    if (selected.has(enabledValue)) enabledSelected += 1;
  }
  const selectAllState = resolveSelectAllState(enabledSelected, enabled.length);
  const setAll = (checked: boolean): void => {
    const next = new Set(selected);
    for (const enabledValue of enabled) {
      if (checked) next.add(enabledValue);
      else next.delete(enabledValue);
    }
    commit(next);
  };

  const showsWarning = hasReactContent(emptyWarning);
  const warningActive = showsWarning && selected.size === 0;
  const selectAllBlocked = enabled.length === 0;
  if (isDevelopment()) {
    // Both warnings go under the key the box itself would use, so the box's
    // own warning, which names aria-describedby, a route neither the
    // select-all box nor an option offers the consumer, is not repeated.
    if (
      selectAllBlocked &&
      hasReactContent(selectAllLabel) &&
      !hasReactContent(selectAllDisabledReason)
    ) {
      const name = reactNodeText(selectAllLabel);
      warnOnce(
        blockedWithoutReasonKey("Checkbox", name),
        `CheckboxGroup select-all box ${JSON.stringify(name)} is blocked because no option can change, but says nothing about why. Pass selectAllDisabledReason.`,
      );
    }
    for (const option of options) {
      if (
        option.ariaDisabled === true &&
        option.disabled !== true &&
        !hasReactContent(option.disabledReason)
      ) {
        const name = reactNodeText(option.label);
        warnOnce(
          blockedWithoutReasonKey("Checkbox", name),
          blockedWithoutReasonMessage(
            `CheckboxGroup option ${JSON.stringify(name)}`,
            "Pass disabledReason on the option.",
          ),
        );
      }
    }
  }
  const selectAll = hasReactContent(selectAllLabel) ? (
    <Checkbox
      className="snui-checkbox-group__select-all"
      label={selectAllLabel}
      checked={selectAllState === "all"}
      indeterminate={selectAllState === "some"}
      // A group with nothing left to reach keeps its box focusable and
      // refuses the change: native `disabled` on the box the user is standing
      // on would destroy their focus.
      ariaDisabled={selectAllBlocked}
      disabledReason={selectAllDisabledReason}
      disabledReasonVisibility={disabledReasonVisibility}
      onChange={() => setAll(selectAllTarget(enabledSelected, enabled.length))}
    />
  ) : null;

  return (
    <FieldGroup
      {...groupProps}
      ref={fieldsetRef}
      label={groupLabel}
      className={classNames("snui-checkbox-group", className)}
      // The warning is the group's own text, so it joins the description and
      // the error ahead of the ids the caller adds.
      aria-describedby={joinIdReferences(
        warningActive ? warningId : undefined,
        ariaDescribedBy,
      )}
      actions={
        selectAll === null && !hasReactContent(actions) ? undefined : (
          <>
            {selectAll}
            {actions}
          </>
        )
      }
    >
      {children}
      <div
        className={classNames(
          "snui-checkbox-group__options",
          `snui-checkbox-group__options--${layout}`,
        )}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            ariaDisabled={option.ariaDisabled}
            checked={selected.has(option.value)}
            description={option.description}
            disabled={option.disabled}
            disabledReason={option.disabledReason}
            disabledReasonVisibility={disabledReasonVisibility}
            label={option.label}
            name={name}
            value={option.value}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
        ))}
      </div>
      {showsWarning ? (
        // The region is mounted before the warning arrives so the
        // announcement is not lost; liveRegionProps sets role alone.
        <div
          id={warningId}
          className="snui-checkbox-group__warning"
          {...liveRegionProps(emptyWarningLive)}
        >
          {warningActive ? (
            <StatusIndicator tone="warning">{emptyWarning}</StatusIndicator>
          ) : null}
        </div>
      ) : null}
    </FieldGroup>
  );
}
