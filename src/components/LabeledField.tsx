import {
  type AriaAttributes,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { FieldError } from "./FieldError.js";

export interface FieldControlProps {
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"] | undefined;
  readonly "aria-errormessage"?:
    | AriaAttributes["aria-errormessage"]
    | undefined;
  readonly "aria-invalid"?: AriaAttributes["aria-invalid"] | undefined;
  readonly disabled?: boolean | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly required?: boolean | undefined;
}

export interface LabeledFieldControlProps extends FieldControlProps {
  readonly id: string;
  /** Present only when the field renders description content. */
  readonly descriptionId?: string | undefined;
  /** Present only when the field renders error content. */
  readonly errorId?: string | undefined;
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
  readonly density?: LabeledFieldDensity | undefined;
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: FieldErrorLive | undefined;
  readonly label: ReactNode;
  readonly layout?: LabeledFieldLayout | undefined;
  readonly name?: string | undefined;
  readonly optionalLabel?: ReactNode | undefined;
  readonly required?: boolean | undefined;
}

const LABELABLE_INTRINSIC_ELEMENTS = new Set([
  "button",
  "input",
  "meter",
  "output",
  "progress",
  "select",
  "textarea",
]);

function requireLabelableIntrinsicChild(
  child: ReactElement<FieldControlProps>,
): void {
  if (typeof child.type !== "string") return;
  if (
    !LABELABLE_INTRINSIC_ELEMENTS.has(child.type) ||
    (child.type === "input" &&
      (child.props as FieldControlProps & { readonly type?: string }).type ===
        "hidden")
  ) {
    throw new Error(
      "LabeledField element children must render a labelable form control. Use the render-prop form for composite controls.",
    );
  }
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
  if (elementChild !== undefined) {
    requireLabelableIntrinsicChild(elementChild);
  }
  const controlId = elementChild?.props.id ?? `${generatedId}-control`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = resolveDescriptionId(generatedId, hasDescription);
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
