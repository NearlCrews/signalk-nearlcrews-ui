import {
  type AriaAttributes,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
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

export interface LabeledFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children: ReactElement<FieldControlProps>;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly label: ReactNode;
  readonly required?: boolean;
}

export function LabeledField({
  children,
  className,
  description,
  error,
  label,
  required = false,
  ...props
}: LabeledFieldProps): React.JSX.Element {
  const generatedId = useId();
  const controlId = children.props.id ?? `${generatedId}-control`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined;
  const errorId = hasError ? `${generatedId}-error` : undefined;
  const describedBy = joinIdReferences(
    children.props["aria-describedby"],
    descriptionId,
    errorId,
  );
  const errorMessage = joinIdReferences(
    children.props["aria-errormessage"],
    errorId,
  );

  const control = cloneElement(children, {
    id: controlId,
    ...(describedBy === undefined ? {} : { "aria-describedby": describedBy }),
    ...(errorId === undefined
      ? {}
      : {
          "aria-errormessage": errorMessage ?? errorId,
          "aria-invalid": true,
        }),
    ...(required ? { required: true } : {}),
  });

  return (
    <div {...props} className={classNames("snui-field", className)}>
      <label className="snui-field__label" htmlFor={controlId}>
        {label}{" "}
        {required ? (
          <>
            <span className="snui-required-mark" aria-hidden="true">
              *
            </span>
            <span className="snui-visually-hidden"> (required)</span>
          </>
        ) : null}
      </label>
      {hasDescription ? (
        <div id={descriptionId} className="snui-field__description">
          {description}
        </div>
      ) : null}
      {control}
      {hasError ? (
        <div id={errorId} className="snui-field__error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
