import { type HTMLAttributes, type ReactNode, useId } from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly headingLevel?: HeadingLevel;
  /** Removes the region landmark naming when false. */
  readonly landmark?: boolean;
  readonly title: ReactNode;
}

export function Section({
  actions,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  description,
  headingLevel = 2,
  landmark = true,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  if (!hasReactContent(title)) {
    throw new Error("Section requires a non-empty title.");
  }

  const titleId = useId();
  const Heading = HEADING_ELEMENTS[headingLevel];

  return (
    <section
      {...props}
      className={classNames("snui-section", className)}
      aria-labelledby={
        landmark ? joinIdReferences(ariaLabelledBy, titleId) : undefined
      }
    >
      <header className="snui-section__header">
        <div className="snui-section__heading-group">
          <Heading id={titleId} className="snui-section__title">
            {title}
          </Heading>
          {hasReactContent(description) ? (
            <div className="snui-section__description">{description}</div>
          ) : null}
        </div>
        {hasReactContent(actions) ? (
          <div className="snui-section__actions">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
