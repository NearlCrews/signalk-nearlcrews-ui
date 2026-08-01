import {
  type FieldsetHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { announcementRole } from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { FieldErrorLive } from "./LabeledField.js";

export interface FieldGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "title">,
    RefAttributes<HTMLFieldSetElement> {
  readonly actions?: ReactNode | undefined;
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: FieldErrorLive | undefined;
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
  if (!hasReactContent(legend)) {
    throw new Error("FieldGroup requires a non-empty legend.");
  }

  const generatedId = useId();
  const hasDescription = hasReactContent(description);
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined;
  const hasError = hasReactContent(error);
  // A live region must exist before its content arrives, so the container is
  // mounted whenever announcements are requested and only its text varies.
  const announcesErrors = errorLive !== "off";
  const rendersError = hasError || announcesErrors;
  const errorId = rendersError ? `${generatedId}-error` : undefined;
  const referencedErrorId = hasError ? errorId : undefined;

  return (
    <fieldset
      {...props}
      ref={ref}
      className={classNames("snui-field-group", className)}
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
          <div
            id={errorId}
            className="snui-field-group__error"
            role={announcementRole(errorLive)}
            aria-live={errorLive}
          >
            {hasError ? error : null}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
