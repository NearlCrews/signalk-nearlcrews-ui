import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import {
  Label,
  type RadioFieldProps as RACRadioFieldProps,
  RadioGroup as RACRadioGroup,
  type RadioGroupProps as RACRadioGroupProps,
  RadioButton,
  RadioField,
  Text,
} from "react-aria-components";
import {
  type AnnouncementMode,
  announcementRole,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type RadioGroupOrientation = "horizontal" | "vertical";
export type RadioGroupErrorLive = AnnouncementMode;

export interface RadioGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly defaultValue?: string | undefined;
  readonly description?: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly error?: ReactNode;
  readonly errorLive?: RadioGroupErrorLive | undefined;
  readonly label: ReactNode;
  /** Applied to every radio input, so native form submission and reset work. */
  readonly name?: string | undefined;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly orientation?: RadioGroupOrientation | undefined;
  readonly value?: string | undefined;
}

export function RadioGroup({
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  defaultValue,
  description,
  disabled,
  error,
  errorLive = "off",
  label,
  name,
  onChange,
  orientation = "vertical",
  ref,
  value,
  ...props
}: RadioGroupProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error("RadioGroup requires a non-empty label.");
  }

  const generatedId = useId();
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  // A live region must exist before its content arrives, so the container is
  // mounted whenever announcements are requested and only its text varies.
  const announcesErrors = errorLive !== "off";
  const rendersError = hasError || announcesErrors;
  const errorId = rendersError ? `${generatedId}-error` : undefined;
  const referencedErrorId = hasError ? errorId : undefined;
  const describedBy = joinIdReferences(ariaDescribedBy, referencedErrorId);
  // react-aria's optional DOM props are not declared with `| undefined`,
  // which makes the target unexpressible for a React HTMLAttributes spread
  // under exactOptionalPropertyTypes. The rest props are plain DOM
  // attributes, so this boundary assertion is sound.
  const domProps = props as RACRadioGroupProps;

  return (
    <RACRadioGroup
      {...domProps}
      ref={ref}
      className={classNames("snui-radio-group", className)}
      isDisabled={disabled ?? false}
      isInvalid={hasError}
      orientation={orientation}
      {...(name === undefined ? {} : { name })}
      {...(value === undefined ? {} : { value })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(onChange === undefined ? {} : { onChange })}
      {...(describedBy === undefined
        ? {}
        : { "aria-describedby": describedBy })}
      {...(referencedErrorId === undefined
        ? {}
        : { "aria-errormessage": referencedErrorId })}
    >
      <Label className="snui-radio-group__label">{label}</Label>
      {hasDescription ? (
        <Text slot="description" className="snui-radio-group__description">
          {description}
        </Text>
      ) : null}
      <div className="snui-radio-group__options">{children}</div>
      {rendersError ? (
        <div
          id={errorId}
          className="snui-radio-group__error"
          role={announcementRole(errorLive)}
          aria-live={errorLive}
        >
          {hasError ? error : null}
        </div>
      ) : null}
    </RACRadioGroup>
  );
}

export interface RadioProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onClick">,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly value: string;
}

export function Radio({
  children,
  className,
  disabled,
  ref,
  value,
  ...props
}: RadioProps): React.JSX.Element {
  if (!hasReactContent(children)) {
    throw new Error("Radio requires a non-empty label.");
  }

  // See RadioGroup for why the DOM prop spread needs a boundary assertion.
  const domProps = props as RACRadioFieldProps;

  return (
    <RadioField
      {...domProps}
      ref={ref}
      className={classNames("snui-radio", className)}
      isDisabled={disabled ?? false}
      value={value}
    >
      <RadioButton className="snui-radio__button">
        <span className="snui-radio__control" aria-hidden="true" />
        <span className="snui-radio__label">{children}</span>
      </RadioButton>
    </RadioField>
  );
}
