import type { HTMLAttributes, RefAttributes } from "react";
import {
  type SwitchFieldProps as RACSwitchFieldProps,
  SwitchButton,
  SwitchField,
} from "react-aria-components";
import { SWITCH_STYLES } from "../styles/switch.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import { classNames } from "../utils/class-names.js";
import {
  hasReactContent,
  requireContent,
  type WithLabel,
} from "../utils/react-node.js";

interface SwitchBaseProps
  extends Omit<
      HTMLAttributes<HTMLDivElement>,
      "children" | "onChange" | "onClick"
    >,
    RefAttributes<HTMLDivElement> {
  /**
   * Mirrors the Checkbox naming: maps to react-aria's isSelected, and
   * defaultChecked maps to defaultSelected.
   */
  readonly checked?: boolean | undefined;
  readonly defaultChecked?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** Associates the switch with a form outside its DOM subtree. */
  readonly form?: string | undefined;
  /** Name submitted with the switch value while it is selected. */
  readonly name?: string | undefined;
  /**
   * Receives the next checked state. Composed controls report values, not
   * React change events; the native Checkbox keeps the event form.
   */
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
  /** @deprecated Use `onCheckedChange`. */
  readonly onChange?: ((checked: boolean) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly required?: boolean | undefined;
  /** Submitted value while selected. Defaults to the browser's "on" value. */
  readonly value?: string | undefined;
}

/**
 * Visible label and accessible name through `label`, or through children,
 * which remain supported. One of the two is required.
 */
export type SwitchProps = SwitchBaseProps & WithLabel<"children">;

export function Switch({
  checked,
  children,
  className,
  defaultChecked,
  disabled,
  form,
  label,
  name,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
  onChange,
  onCheckedChange,
  readOnly,
  ref,
  required,
  value,
  ...props
}: SwitchProps): React.JSX.Element {
  useOptionalModuleStyles(SWITCH_STYLES);

  const labelContent = hasReactContent(label) ? label : children;
  requireContent(labelContent, "Switch requires a non-empty label.");

  // See RadioGroup for why the DOM prop spread needs a boundary assertion.
  const domProps = props as RACSwitchFieldProps;
  const handleChange =
    onCheckedChange === undefined && onChange === undefined
      ? undefined
      : (next: boolean): void => {
          onCheckedChange?.(next);
          onChange?.(next);
        };

  return (
    <SwitchField
      {...domProps}
      ref={ref}
      className={classNames("snui-switch", className)}
      {...(form === undefined ? {} : { form })}
      isDisabled={disabled ?? false}
      isReadOnly={readOnly ?? false}
      isRequired={required ?? false}
      {...(name === undefined ? {} : { name })}
      {...(value === undefined ? {} : { value })}
      {...(checked === undefined ? {} : { isSelected: checked })}
      {...(defaultChecked === undefined
        ? {}
        : { defaultSelected: defaultChecked })}
      {...(handleChange === undefined ? {} : { onChange: handleChange })}
    >
      <SwitchButton className="snui-switch__button">
        <span className="snui-switch__track" aria-hidden="true">
          <span className="snui-switch__thumb" />
        </span>
        <span className="snui-switch__label">{labelContent}</span>
      </SwitchButton>
    </SwitchField>
  );
}
