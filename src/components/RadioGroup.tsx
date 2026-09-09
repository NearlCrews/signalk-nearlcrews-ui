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
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import {
  hasReactContent,
  requireContent,
  type WithLabel,
} from "../utils/react-node.js";
import type { Orientation } from "../utils/variants.js";
import { FieldError } from "./FieldError.js";

/** @deprecated Use {@link Orientation}. */
export type RadioGroupOrientation = Orientation;
/** @deprecated Use {@link AnnouncementMode}. */
export type RadioGroupErrorLive = AnnouncementMode;

export interface RadioGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly defaultValue?: string | undefined;
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  readonly label: ReactNode;
  /** Applied to every radio input, so native form submission and reset work. */
  readonly name?: string | undefined;
  /**
   * Receives the selected value. Composed controls report values, not React
   * change events; the native inputs keep the event form.
   */
  readonly onValueChange?: ((value: string) => void) | undefined;
  /** @deprecated Use `onValueChange`. */
  readonly onChange?: ((value: string) => void) | undefined;
  readonly orientation?: Orientation | undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
  onChange,
  onValueChange,
  orientation = "vertical",
  ref,
  value,
  ...props
}: RadioGroupProps): React.JSX.Element {
  requireContent(label, "RadioGroup requires a non-empty label.");

  const generatedId = useId();
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const { errorId, referencedErrorId, rendersError } = resolveFieldError(
    generatedId,
    hasError,
    errorLive,
  );
  const describedBy = joinIdReferences(ariaDescribedBy, referencedErrorId);
  // react-aria's optional DOM props are not declared with `| undefined`,
  // which makes the target unexpressible for a React HTMLAttributes spread
  // under exactOptionalPropertyTypes. The rest props are plain DOM
  // attributes, so this boundary assertion is sound.
  const domProps = props as RACRadioGroupProps;
  const handleChange =
    onValueChange === undefined && onChange === undefined
      ? undefined
      : (next: string): void => {
          onValueChange?.(next);
          onChange?.(next);
        };

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
      {...(handleChange === undefined ? {} : { onChange: handleChange })}
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
        <FieldError
          className="snui-radio-group__error"
          error={error}
          hasError={hasError}
          id={errorId}
          live={errorLive}
        />
      ) : null}
    </RACRadioGroup>
  );
}

interface RadioBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onClick">,
    RefAttributes<HTMLDivElement> {
  readonly disabled?: boolean | undefined;
  readonly value: string;
}

/**
 * Visible label and accessible name through `label`, or through children,
 * which remain supported. One of the two is required.
 */
export type RadioProps = RadioBaseProps & WithLabel<"children">;

export function Radio({
  children,
  className,
  disabled,
  label,
  ref,
  value,
  ...props
}: RadioProps): React.JSX.Element {
  const labelContent = hasReactContent(label) ? label : children;
  requireContent(labelContent, "Radio requires a non-empty label.");

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
        <span className="snui-radio__label">{labelContent}</span>
      </RadioButton>
    </RadioField>
  );
}
