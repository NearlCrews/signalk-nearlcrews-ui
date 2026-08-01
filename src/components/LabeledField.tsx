import {
  type AriaAttributes,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { FieldError } from "./FieldError.js";

export interface FieldControlProps {
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"];
  readonly "aria-errormessage"?: AriaAttributes["aria-errormessage"];
  readonly "aria-invalid"?: AriaAttributes["aria-invalid"];
  readonly disabled?: boolean;
  readonly id?: string;
  readonly name?: string;
  readonly required?: boolean;
}

export interface LabeledFieldControlProps extends FieldControlProps {
  readonly id: string;
  /** Present only when the field renders description content. */
  readonly descriptionId?: string;
  /** Present only when the field renders error content. */
  readonly errorId?: string;
}

export type LabeledFieldLayout = "stacked" | "inline";
export type LabeledFieldDensity = "comfortable" | "compact";
export type FieldErrorLive = AnnouncementMode;

export type LabeledFieldChild =
  | ReactElement<FieldControlProps>
  | ((controlProps: LabeledFieldControlProps) => ReactNode);

export interface LabeledFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children: LabeledFieldChild;
  readonly density?: LabeledFieldDensity;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly error?: ReactNode;
  readonly errorLive?: FieldErrorLive;
  readonly label: ReactNode;
  readonly layout?: LabeledFieldLayout;
  readonly name?: string;
  readonly optionalLabel?: ReactNode;
  readonly required?: boolean;
}

export function LabeledField({
  children,
  className,
  density = "comfortable",
  description,
  disabled,
  error,
  errorLive = "off",
  label,
  layout = "stacked",
  name,
  optionalLabel,
  required = false,
  ...props
}: LabeledFieldProps): React.JSX.Element {
  requireContent(label, "LabeledField requires a non-empty label.");

  const generatedId = useId();
  const elementChild = typeof children === "function" ? undefined : children;
  const controlId = elementChild?.props.id ?? `${generatedId}-control`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined;
  const { errorId, referencedErrorId, rendersError } = resolveFieldError(
    generatedId,
    hasError,
    errorLive,
  );
  const describedBy = joinIdReferences(
    elementChild?.props["aria-describedby"],
    descriptionId,
    referencedErrorId,
  );
  const errorMessage = joinIdReferences(
    elementChild?.props["aria-errormessage"],
    referencedErrorId,
  );

  const controlName = elementChild?.props.name ?? name;
  const controlDisabled = elementChild?.props.disabled ?? disabled;
  const injectedProps: FieldControlProps & { readonly id: string } = {
    id: controlId,
    ...(describedBy === undefined ? {} : { "aria-describedby": describedBy }),
    ...(referencedErrorId === undefined
      ? {}
      : {
          "aria-errormessage": errorMessage ?? referencedErrorId,
          "aria-invalid": true,
        }),
    ...(controlName === undefined ? {} : { name: controlName }),
    ...(controlDisabled ? { disabled: true } : {}),
    ...(required ? { required: true } : {}),
  };
  const control =
    typeof children === "function"
      ? children({
          ...injectedProps,
          ...(descriptionId === undefined ? {} : { descriptionId }),
          ...(referencedErrorId === undefined
            ? {}
            : { errorId: referencedErrorId }),
        })
      : cloneElement(children, injectedProps);

  return (
    <div
      {...props}
      className={classNames(
        "snui-field",
        `snui-field--${layout}`,
        `snui-field--${density}`,
        className,
      )}
    >
      <label className="snui-field__label" htmlFor={controlId}>
        {label}{" "}
        {required ? (
          <span className="snui-required-mark" aria-hidden="true">
            *
          </span>
        ) : hasReactContent(optionalLabel) ? (
          <span className="snui-optional-mark" aria-hidden="true">
            {optionalLabel}
          </span>
        ) : null}
      </label>
      {hasDescription ? (
        <div id={descriptionId} className="snui-field__description">
          {description}
        </div>
      ) : null}
      <div className="snui-field__control">{control}</div>
      {rendersError ? (
        <FieldError
          className="snui-field__error"
          error={error}
          hasError={hasError}
          id={errorId}
          live={errorLive}
        />
      ) : null}
    </div>
  );
}
