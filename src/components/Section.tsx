import { type HTMLAttributes, type ReactNode, useId } from "react";

import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly headingLevel?: HeadingLevel;
  readonly title: ReactNode;
}

export function Section({
  actions,
  children,
  className,
  description,
  headingLevel = 2,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  const titleId = useId();
  const Heading = HEADING_ELEMENTS[headingLevel];

  return (
    <section
      {...props}
      className={classNames("snui-section", className)}
      aria-labelledby={titleId}
    >
      <header className="snui-section__header">
        <div>
          <Heading id={titleId} className="snui-section__title">
            {title}
          </Heading>
          {hasReactContent(description) ? (
            <p className="snui-section__description">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
