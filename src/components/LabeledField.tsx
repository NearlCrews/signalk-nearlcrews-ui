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
import { idReferenceList, joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { resolveFieldRegions } from "../utils/field-error.js";
import { forwardsFieldControlProps } from "../utils/field-forwarding.js";
import { definedProps } from "../utils/props.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { type Density, resolveDensity } from "../utils/variants.js";
import { warnOnce } from "../utils/warn-once.js";
import { FieldError } from "./FieldError.js";
import { FieldMarker } from "./FieldMarker.js";

export interface FieldControlProps {
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"] | undefined;
  readonly "aria-errormessage"?:
    | AriaAttributes["aria-errormessage"]
    | undefined;
  readonly "aria-invalid"?: AriaAttributes["aria-invalid"] | undefined;
  /**
   * Exposes the required state on a control the native attribute cannot
   * describe. A composite control renders a div, a fieldset, or an element
   * with a group role, none of which expose `required`, so the field injects
   * this beside it.
   */
  readonly "aria-required"?: AriaAttributes["aria-required"] | undefined;
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
  readonly controlProps: Omit<
    LabeledFieldControlProps,
    "descriptionId" | "errorId"
  >;
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

export type LabeledFieldChild =
  | ReactElement<FieldControlProps>
  | ((controlProps: LabeledFieldControlProps) => ReactNode);

export interface LabeledFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  readonly children: LabeledFieldChild;
  /**
   * Ids of elements outside the field that also describe the control, such as
   * a note the whole section shares. They follow the description and the error
   * the field owns, so the control receives one merged `aria-describedby` and
   * no caller writes the join. Pass one id or a list.
   */
  readonly controlDescribedBy?:
    | string
    | readonly (string | undefined)[]
    | undefined;
  readonly density?: Density | undefined;
  readonly description?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  readonly label: ReactNode;
  readonly layout?: LabeledFieldLayout | undefined;
  readonly name?: string | undefined;
  readonly optionalLabel?: ReactNode | undefined;
  readonly required?: boolean | undefined;
  /**
   * Marker drawn after the label when the field is required, so a panel can
   * localize it or key it to a legend of its own. Blank content draws none.
   */
  readonly requiredLabel?: ReactNode | undefined;
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

/**
 * Elements that expose no required or disabled state of their own. React
 * renders both as bare HTML attributes on any host element, so injecting them
 * here would paint the label as required or disabled while the control
 * announced nothing.
 */
const STATELESS_LABELABLE_ELEMENTS = new Set(["meter", "output", "progress"]);

/**
 * Checks the one child form this component can check.
 *
 * An intrinsic element is either labelable or it is not, and a wrong one is
 * refused outright. A composite child is opaque: nothing here can tell whether
 * it forwards the injected id and ARIA props down to a real control, so it is
 * reported in development rather than accepted in silence, and the render-prop
 * form stays the supported way to wire one. The package's own text controls
 * carry a mark saying they forward the props, so the shipped pattern is quiet.
 */
function requireLabelableIntrinsicChild(
  child: ReactElement<FieldControlProps>,
): void {
  if (typeof child.type !== "string") {
    if (forwardsFieldControlProps(child.type)) return;
    // The report is built only in a development build, where warnOnce is the
    // only thing that reads it.
    if (isDevelopment()) {
      const name =
        typeof child.type === "function" && child.type.name !== ""
          ? child.type.name
          : "an anonymous component";
      warnOnce(
        `labeled-field-composite:${name}`,
        `LabeledField received ${name} as its child, which it cannot check for the injected id and description props. A component that does not forward them leaves the label pointing at nothing; use the render-prop form for a composite control.`,
      );
    }
    return;
  }
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
  requiredLabel = "*",
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
  const { descriptionId, errorId, referencedErrorId, rendersError } =
    resolveFieldRegions(generatedId, hasDescription, hasError, errorLive);
  // The field's own text is read first, then whatever the caller added,
  // whichever route it arrived by: an `aria-describedby` already on the child
  // element and the ids in `controlDescribedBy` both follow the description
  // and the error rather than displacing them.
  const describedBy = joinIdReferences(
    descriptionId,
    referencedErrorId,
    elementChild?.props["aria-describedby"],
    ...idReferenceList(controlDescribedBy),
  );
  const errorMessage = joinIdReferences(
    elementChild?.props["aria-errormessage"],
    referencedErrorId,
  );

  const controlName = elementChild?.props.name ?? name;
  const controlDisabled = elementChild?.props.disabled ?? disabled;
  // The child decides for itself here too, the way it does for name and
  // disabled, so a control that is already required is not drawn as optional.
  const controlRequired = elementChild?.props.required ?? required;
  // meter, output, and progress carry neither state, so the field wires their
  // ids and messages and leaves the two attributes off.
  const statelessChild =
    typeof elementChild?.type === "string" &&
    STATELESS_LABELABLE_ELEMENTS.has(elementChild.type);
  const injectedProps: FieldControlProps & { readonly id: string } = {
    id: controlId,
    ...definedProps({
      "aria-describedby": describedBy,
      name: controlName,
    }),
    ...(referencedErrorId === undefined
      ? {}
      : {
          "aria-errormessage": errorMessage,
          "aria-invalid": true,
        }),
    ...(controlDisabled && !statelessChild ? { disabled: true } : {}),
    ...(controlRequired && !statelessChild
      ? // The ARIA state travels beside the native attribute, because a
        // composite control renders an element that exposes no required state
        // of its own and would otherwise announce as optional.
        { "aria-required": true, required: true }
      : {}),
  };
  const control =
    typeof children === "function"
      ? children({
          ...injectedProps,
          ...definedProps({ descriptionId, errorId: referencedErrorId }),
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
        {label}
        <FieldMarker
          optionalLabel={optionalLabel}
          required={controlRequired}
          requiredLabel={requiredLabel}
        />
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
