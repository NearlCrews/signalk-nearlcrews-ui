import { type ReactNode, useId } from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { liveRegionProps } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
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

export interface CheckboxGroupProps<Value extends string>
  extends Omit<FieldGroupProps, "children" | "defaultValue" | "name"> {
  /** Controls rendered above the options, inside the group. */
  readonly children?: ReactNode | undefined;
  readonly defaultValue?: readonly Value[] | undefined;
  /**
   * Shown, and announced politely, while no option is selected. Use it when
   * an enabled feature with nothing selected would silently do nothing.
   */
  readonly emptyWarning?: ReactNode | undefined;
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
   */
  readonly selectAllLabel?: ReactNode | undefined;
  readonly value?: readonly Value[] | undefined;
}

export function CheckboxGroup<Value extends string>({
  actions,
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  defaultValue,
  emptyWarning,
  layout = "grid",
  name,
  onValueChange,
  options,
  selectAllLabel,
  value,
  ...groupProps
}: CheckboxGroupProps<Value>): React.JSX.Element {
  if (options.length === 0) {
    throw new Error("CheckboxGroup requires at least one option.");
  }
  const optionValues = new Set<Value>();
  for (const option of options) {
    if (optionValues.has(option.value)) {
      throw new Error(
        `CheckboxGroup option values must be unique; received duplicate value "${option.value}".`,
      );
    }
    optionValues.add(option.value);
  }

  const warningId = useId();
  const [selectedValues, commitValues] = useControllableState<readonly Value[]>(
    value,
    defaultValue ?? [],
    onValueChange,
  );
  const selected = new Set(selectedValues);

  const commit = (next: ReadonlySet<Value>): void => {
    // Option order keeps the reported array stable however the boxes were
    // toggled.
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

  const enabledOptions = options.filter(
    (option) => option.disabled !== true && option.ariaDisabled !== true,
  );
  const enabledSelected = enabledOptions.filter((option) =>
    selected.has(option.value),
  ).length;
  const allEnabledSelected =
    enabledOptions.length > 0 && enabledSelected === enabledOptions.length;
  const setAll = (checked: boolean): void => {
    const next = new Set(selected);
    for (const option of enabledOptions) {
      if (checked) next.add(option.value);
      else next.delete(option.value);
    }
    commit(next);
  };

  const showsWarning = hasReactContent(emptyWarning);
  const warningActive = showsWarning && selected.size === 0;
  const selectAll = hasReactContent(selectAllLabel) ? (
    <Checkbox
      className="snui-checkbox-group__select-all"
      label={selectAllLabel}
      checked={allEnabledSelected}
      indeterminate={enabledSelected > 0 && !allEnabledSelected}
      disabled={enabledOptions.length === 0}
      onChange={() => setAll(!allEnabledSelected)}
    />
  ) : null;

  return (
    <FieldGroup
      {...groupProps}
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
          {...liveRegionProps("polite")}
        >
          {warningActive ? (
            <StatusIndicator tone="warning">{emptyWarning}</StatusIndicator>
          ) : null}
        </div>
      ) : null}
    </FieldGroup>
  );
}
