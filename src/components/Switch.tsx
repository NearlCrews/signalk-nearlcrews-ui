import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import {
  type SwitchFieldProps as RACSwitchFieldProps,
  SwitchButton,
  SwitchField,
  Text,
} from "react-aria-components";
import { SWITCH_STYLES } from "../styles/switch.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldRegions } from "../utils/field-error.js";
import { definedProps } from "../utils/props.js";
import { racDomProps } from "../utils/react-aria.js";
import { resolveLabelContent, type WithLabel } from "../utils/react-node.js";
import { FieldError } from "./FieldError.js";

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
  /** Guidance under the label, read as the switch's description. */
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  /**
   * Validation message under the switch. Marks the switch invalid while set.
   */
  readonly error?: ReactNode | undefined;
  /** How the error is announced. Defaults to `"off"`. */
  readonly errorLive?: AnnouncementMode | undefined;
  /** Associates the switch with a form outside its DOM subtree. */
  readonly form?: string | undefined;
  /** Name submitted with the switch value while it is selected. */
  readonly name?: string | undefined;
  /**
   * Receives the next checked state. Composed controls report values, not
   * React change events; the native Checkbox keeps the event form.
   */
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
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
  "aria-describedby": ariaDescribedBy,
  checked,
  children,
  className,
  defaultChecked,
  description,
  disabled,
  error,
  errorLive = "off",
  form,
  label,
  name,
  onCheckedChange,
  readOnly,
  ref,
  required,
  value,
  ...props
}: SwitchProps): React.JSX.Element {
  useOptionalModuleStyles(SWITCH_STYLES);

  const labelContent = resolveLabelContent(
    label,
    children,
    "Switch requires a non-empty label.",
  );
  const domProps = racDomProps<RACSwitchFieldProps>(props);

  const generatedId = useId();
  // React Aria wires the description slot onto the input itself, so only the
  // error half of the resolved regions reaches the switch here, the way
  // RadioGroup takes it.
  const regions = resolveFieldRegions(
    generatedId,
    description,
    error,
    errorLive,
  );
  const { hasDescription, hasError, referencedErrorId } = regions;

  return (
    <SwitchField
      {...domProps}
      ref={ref}
      className={classNames("snui-switch", className)}
      isDisabled={disabled ?? false}
      isInvalid={hasError}
      isReadOnly={readOnly ?? false}
      isRequired={required ?? false}
      {...definedProps({
        form,
        name,
        value,
        isSelected: checked,
        defaultSelected: defaultChecked,
        onChange: onCheckedChange,
        // The field's own error is read before the ids the caller adds, the
        // order LabeledField keeps.
        "aria-describedby": joinIdReferences(
          referencedErrorId,
          ariaDescribedBy,
        ),
        "aria-errormessage": referencedErrorId,
      })}
    >
      <SwitchButton className="snui-switch__button">
        <span className="snui-switch__track" aria-hidden="true">
          <span className="snui-switch__thumb" />
        </span>
        <span className="snui-switch__label">{labelContent}</span>
      </SwitchButton>
      {/*
       * Both messages sit outside the label that toggles the switch, as
       * Checkbox keeps its own, so pressing a message to read it cannot
       * flip the setting.
       */}
      {hasDescription ? (
        <Text slot="description" className="snui-switch__description">
          {description}
        </Text>
      ) : null}
      <FieldError
        as="span"
        className="snui-switch__error"
        error={error}
        live={errorLive}
        region={regions}
      />
    </SwitchField>
  );
}
