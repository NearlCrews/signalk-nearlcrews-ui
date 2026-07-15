import {
  type AriaAttributes,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import {
  type AnnouncementMode,
  announcementRole,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface FieldControlProps {
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"];
  readonly "aria-errormessage"?: AriaAttributes["aria-errormessage"];
  readonly "aria-invalid"?: AriaAttributes["aria-invalid"];
  readonly id?: string;
  readonly required?: boolean;
}

export interface LabeledFieldControlProps extends FieldControlProps {
  readonly id: string;
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
  readonly error?: ReactNode;
  readonly errorLive?: FieldErrorLive;
  readonly label: ReactNode;
  readonly layout?: LabeledFieldLayout;
  readonly required?: boolean;
}

export function LabeledField({
  children,
  className,
  density = "comfortable",
  description,
  error,
  errorLive = "off",
  label,
  layout = "stacked",
  required = false,
  ...props
}: LabeledFieldProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error("LabeledField requires a non-empty label.");
  }

  const generatedId = useId();
  const elementChild = typeof children === "function" ? undefined : children;
  const controlId = elementChild?.props.id ?? `${generatedId}-control`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined;
  const errorId = hasError ? `${generatedId}-error` : undefined;
  const describedBy = joinIdReferences(
    elementChild?.props["aria-describedby"],
    descriptionId,
    errorId,
  );
  const errorMessage = joinIdReferences(
    elementChild?.props["aria-errormessage"],
    errorId,
  );

  const controlProps: LabeledFieldControlProps = {
    id: controlId,
    ...(describedBy === undefined ? {} : { "aria-describedby": describedBy }),
    ...(errorId === undefined
      ? {}
      : {
          "aria-errormessage": errorMessage ?? errorId,
          "aria-invalid": true,
        }),
    ...(required ? { required: true } : {}),
  };
  const control =
    typeof children === "function"
      ? children(controlProps)
      : cloneElement(children, controlProps);

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
        ) : null}
      </label>
      {hasDescription ? (
        <div id={descriptionId} className="snui-field__description">
          {description}
        </div>
      ) : null}
      <div className="snui-field__control">{control}</div>
      {hasError ? (
        <div
          id={errorId}
          className="snui-field__error"
          role={announcementRole(errorLive)}
          aria-live={errorLive}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
