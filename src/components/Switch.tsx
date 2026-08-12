import type { HTMLAttributes, ReactNode, RefAttributes } from "react";
import {
  type SwitchFieldProps as RACSwitchFieldProps,
  SwitchButton,
  SwitchField,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { requireContent } from "../utils/react-node.js";

export interface SwitchProps
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
  readonly children: ReactNode;
  readonly defaultChecked?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** Associates the switch with a form outside its DOM subtree. */
  readonly form?: string | undefined;
  /** Name submitted with the switch value while it is selected. */
  readonly name?: string | undefined;
  readonly onChange?: ((checked: boolean) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly required?: boolean | undefined;
  /** Submitted value while selected. Defaults to the browser's "on" value. */
  readonly value?: string | undefined;
}

export function Switch({
  checked,
  children,
  className,
  defaultChecked,
  disabled,
  form,
  name,
  onChange,
  readOnly,
  ref,
  required,
  value,
  ...props
}: SwitchProps): React.JSX.Element {
  requireContent(children, "Switch requires a non-empty label.");

  // See RadioGroup for why the DOM prop spread needs a boundary assertion.
  const domProps = props as RACSwitchFieldProps;

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
      {...(onChange === undefined ? {} : { onChange })}
    >
      <SwitchButton className="snui-switch__button">
        <span className="snui-switch__track" aria-hidden="true">
          <span className="snui-switch__thumb" />
        </span>
        <span className="snui-switch__label">{children}</span>
      </SwitchButton>
    </SwitchField>
  );
}
