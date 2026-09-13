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
import { RADIO_STYLES } from "../styles/radio.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { racDomProps } from "../utils/react-aria.js";
import {
  hasReactContent,
  requireContent,
  resolveLabelContent,
  type WithLabel,
} from "../utils/react-node.js";
import type { Orientation } from "../utils/variants.js";
import { FieldError } from "./FieldError.js";

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
  readonly orientation?: Orientation | undefined;
  /**
   * Blocks the selection from changing while every radio stays focusable and
   * in the roving tab order. Reach for it where the choice is real but cannot
   * be changed right now; `disabled` takes the group out of the tab order
   * instead, which destroys focus if it lands on the radio the user is
   * standing on. React Aria owns the blocking, as it does for `Switch`.
   */
  readonly readOnly?: boolean | undefined;
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
  onValueChange,
  orientation = "vertical",
  readOnly,
  ref,
  value,
  ...props
}: RadioGroupProps): React.JSX.Element {
  // The group and its options share one module, and the install is
  // reference-counted, so either one bundled alone still reaches its rules.
  useOptionalModuleStyles(RADIO_STYLES);

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
  const domProps = racDomProps<RACRadioGroupProps>(props);

  return (
    <RACRadioGroup
      {...domProps}
      ref={ref}
      className={classNames("snui-radio-group", className)}
      isDisabled={disabled ?? false}
      isReadOnly={readOnly ?? false}
      isInvalid={hasError}
      orientation={orientation}
      {...(name === undefined ? {} : { name })}
      {...(value === undefined ? {} : { value })}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(onValueChange === undefined ? {} : { onChange: onValueChange })}
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
  useOptionalModuleStyles(RADIO_STYLES);

  const labelContent = resolveLabelContent(
    label,
    children,
    "Radio requires a non-empty label.",
  );
  const domProps = racDomProps<RACRadioFieldProps>(props);

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
