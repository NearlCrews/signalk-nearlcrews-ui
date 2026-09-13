import {
  type FieldsetHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldRegions } from "../utils/field-error.js";
import {
  hasReactContent,
  resolveLabelContent,
  type WithLabel,
} from "../utils/react-node.js";
import { FieldError } from "./FieldError.js";

interface FieldGroupBaseProps
  // A fieldset tooltip competes with the legend and the description slot,
  // both of which stay on screen, so the group takes its heading through
  // `label` rather than through a hover-only native title.
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "title">,
    RefAttributes<HTMLFieldSetElement> {
  readonly actions?: ReactNode | undefined;
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  /**
   * Ids of elements outside the group that also describe it, such as a note
   * the whole section shares. They follow the description and the error the
   * group owns, the same reading order `LabeledField.controlDescribedBy`
   * applies, so one mental model carries across a field and a fieldset. Pass
   * one id or a list.
   */
  readonly groupDescribedBy?:
    | string
    | readonly (string | undefined)[]
    | undefined;
}

/**
 * `legend` names a real `<legend>` element inside the fieldset, which is why
 * the group takes that spelling as well as `label`. The radiogroup controls,
 * `RadioGroup` and `SegmentedControl`, are `div` groups with no `<legend>` to
 * name and take `label` alone.
 */
export type FieldGroupProps = FieldGroupBaseProps & WithLabel<"legend">;

/** Reads the one-or-many form of `groupDescribedBy` as a list of ids. */
function describedByIds(
  value: FieldGroupBaseProps["groupDescribedBy"],
): readonly (string | undefined)[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

export function FieldGroup({
  actions,
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  description,
  error,
  errorLive = "off",
  groupDescribedBy,
  label,
  legend,
  ref,
  ...props
}: FieldGroupProps): React.JSX.Element {
  const groupLabel = resolveLabelContent(
    label,
    legend,
    "FieldGroup requires a non-empty legend.",
  );

  const generatedId = useId();
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const { descriptionId, errorId, referencedErrorId, rendersError } =
    resolveFieldRegions(generatedId, hasDescription, hasError, errorLive);

  return (
    <fieldset
      {...props}
      ref={ref}
      className={classNames("snui-field-group", className)}
      // A fieldset exposes the group role, which supports neither
      // aria-invalid nor aria-errormessage, so the error joins the
      // description instead and screen readers read it on entering the group.
      aria-describedby={joinIdReferences(
        ariaDescribedBy,
        descriptionId,
        referencedErrorId,
        ...describedByIds(groupDescribedBy),
      )}
    >
      <legend className="snui-field-group__legend">{groupLabel}</legend>
      {hasDescription ? (
        <div id={descriptionId} className="snui-field-group__description">
          {description}
        </div>
      ) : null}
      {hasReactContent(actions) ? (
        <div className="snui-field-group__actions">{actions}</div>
      ) : null}
      <div className="snui-field-group__content">
        {children}
        {rendersError ? (
          <FieldError
            className="snui-field-group__error"
            error={error}
            hasError={hasError}
            id={errorId}
            live={errorLive}
          />
        ) : null}
      </div>
    </fieldset>
  );
}
