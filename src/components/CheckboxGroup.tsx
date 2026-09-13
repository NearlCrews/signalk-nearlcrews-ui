import {
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { observeFormReset } from "../utils/form-reset.js";
import { requireNonEmptyUniqueOptions } from "../utils/options.js";
import { hasReactContent } from "../utils/react-node.js";
import { resolveSelectAllState, selectAllTarget } from "../utils/select-all.js";
import { FieldGroup, type FieldGroupProps } from "./FieldGroup.js";
import { Checkbox } from "./Inputs.js";
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
  readonly label: ReactNode;
  readonly value: Value;
}

/** "grid" fills columns as the panel allows; "stack" keeps one per row. */
export type CheckboxGroupLayout = "grid" | "stack";

/**
 * A multi-select group.
 *
 * The group is a real `<fieldset>`, so it is named by the `legend` it
 * inherits from {@link FieldGroupProps} and not by the `label` the
 * single-choice groups take: `RadioGroup` and `SegmentedControl` are `div`
 * groups with no `<legend>` element to name them.
 */
export interface CheckboxGroupProps<Value extends string>
  extends Omit<FieldGroupProps, "children" | "defaultValue" | "name"> {
  /** Controls rendered above the options, inside the group. */
  readonly children?: ReactNode | undefined;
  readonly defaultValue?: readonly Value[] | undefined;
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
  emptyWarning,
  emptyWarningLive = "polite",
  label,
  layout = "grid",
  legend,
  name,
  onValueChange,
  options,
  ref,
  selectAllLabel,
  value,
  ...groupProps
}: CheckboxGroupProps<Value>): React.JSX.Element {
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

  // The reset listener reads the latest props through refs so the callback
  // ref below keeps its identity: a selection change must not detach and
  // reattach the listener on every render.
  const valueRef = useRef(value);
  const defaultValueRef = useRef(defaultValue);
  useLayoutEffect(() => {
    valueRef.current = value;
    defaultValueRef.current = defaultValue;
  }, [defaultValue, value]);

  const fieldset = useRef<HTMLFieldSetElement | null>(null);
  const restoreDefaultValue = useCallback(
    (node: HTMLFieldSetElement) =>
      observeFormReset(node, () => {
        // Each box restores its own checkedness from the checked prop it was
        // given, which is this group's current selection, so the group is the
        // one that has to return to its default. A controlled selection
        // belongs to the parent, which observes the same reset.
        if (valueRef.current === undefined) {
          setSelectedValues(defaultValueRef.current ?? []);
        }
      }),
    [setSelectedValues],
  );
  const attachFieldset = useNodeRef(fieldset, ref, restoreDefaultValue);

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
  const selectAll = hasReactContent(selectAllLabel) ? (
    <Checkbox
      className="snui-checkbox-group__select-all"
      label={selectAllLabel}
      checked={selectAllState === "all"}
      indeterminate={selectAllState === "some"}
      // A group with nothing left to reach keeps its box focusable and
      // refuses the change: native `disabled` on the box the user is standing
      // on would destroy their focus.
      ariaDisabled={enabled.length === 0}
      onChange={() => setAll(selectAllTarget(enabledSelected, enabled.length))}
    />
  ) : null;

  return (
    <FieldGroup
      {...groupProps}
      ref={attachFieldset}
      legend={hasReactContent(legend) ? legend : label}
      className={classNames("snui-checkbox-group", className)}
      aria-describedby={joinIdReferences(
        ariaDescribedBy,
        warningActive ? warningId : undefined,
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
