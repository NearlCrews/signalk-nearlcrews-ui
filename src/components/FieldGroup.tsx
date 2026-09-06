import {
  type FieldsetHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { FieldError } from "./FieldError.js";

export interface FieldGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "title">,
    RefAttributes<HTMLFieldSetElement> {
  readonly actions?: ReactNode | undefined;
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  readonly legend: ReactNode;
}

export function FieldGroup({
  actions,
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  description,
  error,
  errorLive = "off",
  legend,
  ref,
  ...props
}: FieldGroupProps): React.JSX.Element {
  requireContent(legend, "FieldGroup requires a non-empty legend.");

  const generatedId = useId();
  const hasDescription = hasReactContent(description);
  const descriptionId = resolveDescriptionId(generatedId, hasDescription);
  const hasError = hasReactContent(error);
  const { errorId, referencedErrorId, rendersError } = resolveFieldError(
    generatedId,
    hasError,
    errorLive,
  );

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
      )}
    >
      <legend className="snui-field-group__legend">{legend}</legend>
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
