import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { useHeadingLevel } from "../utils/heading-level.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "title">,
    RefAttributes<HTMLElement> {
  readonly actions?: ReactNode | undefined;
  readonly description?: ReactNode | undefined;
  /**
   * Level of the section heading. It defaults to the level below a
   * `PanelShell` title, and to 2 outside one, so the ordinary panel nests
   * rather than repeating the level its own title already took.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /** Removes the region landmark naming when false. */
  readonly landmark?: boolean | undefined;
  readonly title: ReactNode;
}

export function Section({
  actions,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  description,
  headingLevel,
  landmark = true,
  ref,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  requireContent(title, "Section requires a non-empty title.");

  const titleId = useId();
  const shellHeadingLevel = useHeadingLevel();
  const Heading = HEADING_ELEMENTS[headingLevel ?? shellHeadingLevel];

  return (
    <section
      {...props}
      ref={ref}
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
