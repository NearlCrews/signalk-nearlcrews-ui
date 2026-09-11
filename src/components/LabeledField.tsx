import {
  type AriaAttributes,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { type Density, resolveDensity } from "../utils/variants.js";
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

/** The render-prop argument split into DOM attributes and the region ids. */
export interface SplitLabeledFieldControlProps {
  /** Attributes safe to spread onto the control element. */
  readonly controlProps: FieldControlProps & { readonly id: string };
  readonly descriptionId: string | undefined;
  readonly errorId: string | undefined;
}

/**
 * Separates the render-prop argument into the attributes a control element
 * accepts and the two region ids, which are lookups rather than attributes.
 * Spread `controlProps` onto the control and wire secondary controls to the
 * ids with `aria-describedby`.
 */
export function splitLabeledFieldControlProps({
  descriptionId,
  errorId,
  ...controlProps
}: LabeledFieldControlProps): SplitLabeledFieldControlProps {
  return { controlProps, descriptionId, errorId };
}

export type LabeledFieldLayout = "stacked" | "inline";
/** @deprecated Use {@link Density}; "comfortable" maps to "default". */
export type LabeledFieldDensity = Density | "comfortable";
/** @deprecated Use {@link AnnouncementMode}. */
export type FieldErrorLive = AnnouncementMode;

export type LabeledFieldChild =
  | ReactElement<FieldControlProps>
  | ((controlProps: LabeledFieldControlProps) => ReactNode);

export interface LabeledFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  readonly children: LabeledFieldChild;
  /**
   * Ids of elements outside the field that also describe the control, such as
   * a note the whole section shares. They join the description and error the
   * field owns, so the control receives one merged `aria-describedby` and no
   * caller writes the join. Pass one id or a list.
   */
  readonly controlDescribedBy?:
    | string
    | readonly (string | undefined)[]
    | undefined;
  /** "comfortable" is accepted as a deprecated alias of "default". */
  readonly density?: Density | "comfortable" | undefined;
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
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

/** Reads the one-or-many form of `controlDescribedBy` as a list of ids. */
function describedByIds(
  value: LabeledFieldProps["controlDescribedBy"],
): readonly (string | undefined)[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

export function LabeledField({
  children,
  className,
  controlDescribedBy,
  density,
  description,
  disabled,
  error,
  errorLive = "off",
  label,
  layout = "stacked",
  name,
  optionalLabel,
  ref,
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
  // The field's own text is read first, then whatever the caller added, so a
  // unit or a shared note follows the description and the error rather than
  // displacing them.
  const describedBy = joinIdReferences(
    elementChild?.props["aria-describedby"],
    descriptionId,
    referencedErrorId,
    ...describedByIds(controlDescribedBy),
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
      ref={ref}
      className={classNames(
        "snui-field",
        `snui-field--${layout}`,
        `snui-field--${resolveDensity(density)}`,
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
          // The optional marker stays in the accessible name so what the
          // user hears matches what the user sees. The required asterisk is
          // hidden instead because the native attribute already carries it.
          <span className="snui-optional-mark">{optionalLabel}</span>
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
