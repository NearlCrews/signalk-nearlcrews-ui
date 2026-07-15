import {
  type FieldsetHTMLAttributes,
  forwardRef,
  type ReactNode,
  useId,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface FieldGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "title"> {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly legend: ReactNode;
}

export const FieldGroup = forwardRef<HTMLFieldSetElement, FieldGroupProps>(
  function FieldGroup(
    {
      actions,
      "aria-describedby": ariaDescribedBy,
      children,
      className,
      description,
      legend,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const hasDescription = hasReactContent(description);
    const descriptionId = hasDescription
      ? `${generatedId}-description`
      : undefined;

    return (
      <fieldset
        {...props}
        ref={ref}
        className={classNames("snui-field-group", className)}
        aria-describedby={joinIdReferences(ariaDescribedBy, descriptionId)}
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
        <div className="snui-field-group__content">{children}</div>
      </fieldset>
    );
  },
);
