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
import {
  SectionOutlineProvider,
  useResolvedHeading,
  useWithinPackageLandmark,
} from "../utils/heading-level.js";
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
   * Level of the section heading. It defaults to the level below the title of
   * an enclosing `PanelShell`, `Dialog`, or `AlertDialog`, and to 2 outside
   * them, so the ordinary panel nests rather than repeating the level its own
   * title already took.
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
   * Names the section as a region landmark. Defaults to true, and to false
   * for a section nested inside another package region, because a landmark
   * per nested row crowds the list a reader navigates by; an explicit value
   * always decides. False removes the naming, including any `aria-labelledby`
   * the consumer passed: the section is then named by its heading in the
   * ordinary way.
   */
  readonly landmark?: boolean | undefined;
  /**
   * Content placed before the heading on the title line, such as the
   * plugin's glyph. It sits outside the heading, so it is not part of the
   * section's name and keeps its own semantics: mark a decorative glyph
   * `aria-hidden` yourself.
   */
  readonly leading?: ReactNode | undefined;
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
  landmark,
  leading,
  ref,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  requireContent(title, "Section requires a non-empty title.");

  const titleId = useId();
  const { Heading, depth, level } = useResolvedHeading(headingLevel);
  const withinLandmark = useWithinPackageLandmark();
  const effectiveLandmark = landmark ?? !withinLandmark;
  const heading = (
    <Heading
      ref={headingRef}
      id={titleId}
      className={classNames(
        "snui-section__title",
        depth === 0 && "snui-section__title--top",
      )}
      tabIndex={headingRef === undefined ? undefined : -1}
    >
      {title}
    </Heading>
  );

  return (
    <section
      {...props}
      ref={ref}
      className={classNames(
        "snui-section",
        density === "compact" && "snui-section--compact",
        className,
      )}
      aria-labelledby={landmarkLabel(
        effectiveLandmark,
        ariaLabelledBy,
        titleId,
      )}
    >
      <SectionOutlineProvider landmark={effectiveLandmark} level={level}>
        <header className="snui-section__header">
          <div className="snui-section__heading-group">
            {/* The row exists only for leading content, so a section without
                any keeps the markup it has always had. */}
            {hasReactContent(leading) ? (
              <div className="snui-section__title-row">
                <div className="snui-section__leading">{leading}</div>
                {heading}
              </div>
            ) : (
              heading
            )}
            {hasReactContent(description) ? (
              <div className="snui-section__description">{description}</div>
            ) : null}
          </div>
          {hasReactContent(actions) ? (
            <div className="snui-section__actions">{actions}</div>
          ) : null}
        </header>
        {children}
      </SectionOutlineProvider>
    </section>
  );
}
