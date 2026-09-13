import {
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
  useId,
} from "react";

import { landmarkLabel } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import type { HeadingLevel } from "../utils/heading.js";
import { useResolvedHeading } from "../utils/heading-level.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import type { Density } from "../utils/variants.js";

export interface SectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "title">,
    RefAttributes<HTMLElement> {
  readonly actions?: ReactNode | undefined;
  /**
   * Tightens the section's own gap and padding, so a panel themed compact can
   * tighten its sections the way it already tightens its cards, tables,
   * fields, and data grids.
   */
  readonly density?: Density | undefined;
  readonly description?: ReactNode | undefined;
  /**
   * Level of the section heading. It defaults to the level below a
   * `PanelShell` title, and to 2 outside one, so the ordinary panel nests
   * rather than repeating the level its own title already took.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /**
   * Receives the heading element, which takes `tabIndex={-1}` while the ref is
   * given so it can be focused. It is the destination to send focus to after
   * something inside the section goes away, such as a dismissed `Banner`, and
   * it reads the section's own name to whoever lands on it.
   */
  readonly headingRef?: Ref<HTMLHeadingElement> | undefined;
  /**
   * Removes the region landmark naming when false, including any
   * `aria-labelledby` the consumer passed: the section is then named by its
   * heading in the ordinary way.
   */
  readonly landmark?: boolean | undefined;
  readonly title: ReactNode;
}

export function Section({
  actions,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  density = "default",
  description,
  headingLevel,
  headingRef,
  landmark = true,
  ref,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  requireContent(title, "Section requires a non-empty title.");

  const titleId = useId();
  const { Heading } = useResolvedHeading(headingLevel);

  return (
    <section
      {...props}
      ref={ref}
      className={classNames(
        "snui-section",
        density === "compact" && "snui-section--compact",
        className,
      )}
      aria-labelledby={landmarkLabel(landmark, ariaLabelledBy, titleId)}
    >
      <header className="snui-section__header">
        <div className="snui-section__heading-group">
          <Heading
            ref={headingRef}
            id={titleId}
            className="snui-section__title"
            tabIndex={headingRef === undefined ? undefined : -1}
          >
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
