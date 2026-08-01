import type { HTMLAttributes, ReactNode, RefAttributes } from "react";
import {
  type SwitchFieldProps as RACSwitchFieldProps,
  SwitchButton,
  SwitchField,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

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
  readonly onChange?: ((checked: boolean) => void) | undefined;
}

export function Switch({
  checked,
  children,
  className,
  defaultChecked,
  disabled,
  onChange,
  ref,
  ...props
}: SwitchProps): React.JSX.Element {
  if (!hasReactContent(children)) {
    throw new Error("Switch requires a non-empty label.");
  }

  // react-aria's optional DOM props are not declared with `| undefined`,
  // which makes the target unexpressible for a React HTMLAttributes spread
  // under exactOptionalPropertyTypes. The rest props are plain DOM
  // attributes, so this boundary assertion is sound.
  const domProps = props as RACSwitchFieldProps;

  return (
    <SwitchField
      {...domProps}
      ref={ref}
      className={classNames("snui-switch", className)}
      isDisabled={disabled ?? false}
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
