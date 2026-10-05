import {
  Children,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { hasAccessibleName, joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { trimmedText } from "../utils/labels.js";
import {
  createPolymorphicElement,
  type PolymorphicProps,
} from "../utils/polymorphic.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { useAnnouncingTiming } from "../utils/repeat-announcement.js";
import {
  isSemanticTone,
  type SemanticTone,
  type StatusTone,
} from "../utils/tone.js";
import { hasUnitContent, renderUnit, type UnitContent } from "../utils/unit.js";
import type { Density, SpaceScale } from "../utils/variants.js";
import { ToneEchoRegion } from "./ToneEchoRegion.js";
import { ToneGlyph, ToneMark } from "./ToneMark.js";

export type { SpaceScale };
export type LayoutAlignment = "start" | "center" | "end" | "stretch";
/** How a `Cluster` distributes its items along the inline axis. */
export type LayoutJustification =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";

/**
 * List elements need real list items; wrap each child so ul and ol stay valid.
 * A child that renders nothing is dropped rather than wrapped: `Children.map`
 * calls back for the null, undefined, and boolean a `{ready && <Row/>}` leaves
 * behind, and each of those would otherwise become an empty list item that a
 * screen reader counts and the grid gap paints a blank row for.
 */
function renderListItems(
  as: StackElement | ClusterElement | MetricGridElement,
  children: ReactNode,
): ReactNode {
  if (as !== "ul" && as !== "ol") return children;
  return Children.map(children, (child) =>
    child === null ||
    child === undefined ||
    typeof child === "boolean" ? null : (
      <li>{child}</li>
    ),
  );
}

export type StackElement = "div" | "ul" | "ol" | "form" | "section" | "nav";

interface StackOwnProps {
  readonly align?: LayoutAlignment | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly gap?: SpaceScale | undefined;
}

interface DividedStackOwnProps extends StackOwnProps {
  /**
   * Draws a rule between the items, the separator a list of rows or report
   * entries needs, with the gap split evenly above and below it. Items the
   * page hides, and visually hidden ones such as a `LiveRegion`, draw no rule
   * and take none. For rows inside a card, put the stack inside a `Card` with
   * `density="flush"`.
   */
  readonly divided?: boolean | undefined;
}

/**
 * Discriminated on `as`: a form stack accepts form attributes and its ref
 * resolves to the form element. See {@link PolymorphicProps}.
 */
export type StackProps = PolymorphicProps<
  StackElement,
  "div",
  DividedStackOwnProps
>;

export function Stack({
  align = "stretch",
  as = "div",
  children,
  className,
  divided = false,
  gap = 4,
  ...props
}: StackProps): React.JSX.Element {
  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames(
        "snui-stack",
        `snui-stack--gap-${String(gap)}`,
        divided && "snui-stack--divided",
        `snui-layout--align-${align}`,
        className,
      ),
    },
    renderListItems(as, children),
  );
}

export type ClusterElement = "div" | "ul" | "ol" | "section" | "nav";

interface ClusterOwnProps extends StackOwnProps {
  readonly justify?: LayoutJustification | undefined;
}

export type ClusterProps = PolymorphicProps<
  ClusterElement,
  "div",
  ClusterOwnProps
>;

export function Cluster({
  align = "center",
  as = "div",
  children,
  className,
  gap = 2,
  justify = "start",
  ...props
}: ClusterProps): React.JSX.Element {
  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames(
        "snui-cluster",
        `snui-cluster--gap-${String(gap)}`,
        `snui-layout--align-${align}`,
        `snui-layout--justify-${justify}`,
        className,
      ),
    },
    renderListItems(as, children),
  );
}

export interface InputGroupProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly density?: Density | undefined;
}

export function InputGroup({
  className,
  density = "default",
  ref,
  ...props
}: InputGroupProps): React.JSX.Element {
  return (
    <div
      {...props}
      ref={ref}
      className={classNames(
        "snui-input-group",
        // Only the non-default step names itself: the default is what the
        // block class already paints, and a modifier no rule answers is a
        // hook the package never promised.
        density !== "default" && `snui-input-group--${density}`,
        className,
      )}
    />
  );
}

export type InputGroupControlWidth = "fixed" | "grow";

export interface InputGroupControlProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  /**
   * How the slot shares the row: `"grow"` takes the remaining space and
   * `"fixed"` keeps its content's width. It is not a length, which is why it
   * is not spelled `width`: on `PanelRoot` and `Dialog` that name means a size
   * token and on `Popover` a CSS length.
   */
  readonly controlWidth?: InputGroupControlWidth | undefined;
}

export function InputGroupControl({
  className,
  controlWidth = "grow",
  ref,
  ...props
}: InputGroupControlProps): React.JSX.Element {
  return (
    <div
      {...props}
      ref={ref}
      className={classNames(
        "snui-input-group__control",
        `snui-input-group__control--${controlWidth}`,
        className,
      )}
    />
  );
}

export interface InputGroupAddonProps
  extends HTMLAttributes<HTMLSpanElement>,
    RefAttributes<HTMLSpanElement> {}

export function InputGroupAddon({
  className,
  ref,
  ...props
}: InputGroupAddonProps): React.JSX.Element {
  return (
    <span
      {...props}
      ref={ref}
      className={classNames("snui-input-group__addon", className)}
    />
  );
}

export type CardElement = "div" | "section" | "nav";
/** Card admits `"flush"` (no padding) beside the shared density values. */
export type CardDensity = Density | "flush";

interface CardOwnProps {
  /**
   * Paints the leading bar in a tone color without the glyph or announcement,
   * for a card whose meaning another element inside it already announces.
   * Ignored when `tone` is semantic.
   */
  readonly accent?: SemanticTone | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly density?: CardDensity | undefined;
  readonly footer?: ReactNode | undefined;
  readonly header?: ReactNode | undefined;
  /**
   * Names the card and groups what it holds, for a repeated row a reader
   * should be able to tell from its neighbours. Plain text, because it becomes
   * the accessible name. The native `aria-label` and `aria-labelledby` name
   * and group the card the same way, the latter by something already on
   * screen. Only a div card becomes a group: a card rendered as `nav` or
   * `section` keeps the landmark its element already is, which the name
   * completes. A card that supplies its own `role` keeps it.
   */
  readonly label?: string | undefined;
  /** Paints a leading accent bar and marks the card with the tone glyph. */
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

export type CardProps = PolymorphicProps<CardElement, "div", CardOwnProps>;

export function Card({
  accent,
  as = "div",
  children,
  className,
  density = "default",
  footer,
  header,
  label,
  tone = "neutral",
  toneLabel,
  ...props
}: CardProps): React.JSX.Element {
  const hasHeader = hasReactContent(header);
  // A semantic tone owns the accent bar and the glyph, so it wins over `accent`.
  const semantic = isSemanticTone(tone);
  // Built only where it is rendered: a neutral card with no header discards it,
  // and a neutral tone renders nothing anyway.
  const mark =
    hasHeader || semantic ? (
      <ToneMark
        className="snui-card__tone-glyph"
        tone={tone}
        toneLabel={toneLabel}
      />
    ) : null;
  /*
   * A named div card is a group: the name would otherwise sit on a plain div
   * and reach nobody, and a repeated row is exactly where a reader needs to be
   * told which one it is in. A nav or section card is already a landmark once
   * named, and a group role would replace it, which ARIA does not even allow
   * on nav, so only the div takes one. The native attributes name it the same
   * way the prop does, since every other component takes them, and `label`
   * stands in for a blank `aria-label`. A caller-supplied role wins.
   */
  const ariaLabel =
    trimmedText(props["aria-label"]) || trimmedText(label) || undefined;
  const ariaLabelledBy = trimmedText(props["aria-labelledby"]) || undefined;
  const groupProps =
    as === "div" && hasAccessibleName(ariaLabel, ariaLabelledBy)
      ? { role: "group" }
      : {};

  return createPolymorphicElement(
    as,
    {
      ...groupProps,
      ...props,
      // Written after the spread, so a blank name the consumer passed is
      // dropped rather than rendered as an empty attribute.
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      className: classNames(
        "snui-card",
        // Only the steps that change something: the default carries no rule,
        // so emitting it puts a class in the DOM that styles nothing and
        // invites an override that will never win anything.
        density !== "default" && `snui-card--${density}`,
        semantic && `snui-card--${tone}`,
        !semantic && accent !== undefined && `snui-card--accent-${accent}`,
        className,
      ),
    },
    hasHeader ? (
      <div className="snui-card__header">
        {mark}
        {header}
      </div>
    ) : null,
    hasHeader || !semantic ? (
      children
    ) : (
      // Without a header the mark would be a grid item of its own, putting the
      // cue on a row above the content it marks. One flow container keeps the
      // glyph on the first line of the body instead.
      <div className="snui-card__body">
        {mark}
        {children}
      </div>
    ),
    hasReactContent(footer) ? (
      <div className="snui-card__footer">
        <div className="snui-card__footer-content">{footer}</div>
      </div>
    ) : null,
  );
}

export type MetricGridElement = "div" | "ul" | "ol";

interface MetricGridOwnProps {
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export type MetricGridProps = PolymorphicProps<
  MetricGridElement,
  "div",
  MetricGridOwnProps
>;

export function MetricGrid({
  as = "div",
  children,
  className,
  ...props
}: MetricGridProps): React.JSX.Element {
  return createPolymorphicElement(
    as,
    { ...props, className: classNames("snui-metric-grid", className) },
    renderListItems(as, children),
  );
}

export interface MetricProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  /**
   * Holds a reading the metric mounts with for one beat, so its value region
   * exists before the reading arrives and a screen reader observes it.
   * Defaults to true on a polite metric and false on an assertive one. Set it
   * to false where the reading at mount is not news, such as a figure present
   * when the panel loads. Meaningful only on an announcing metric.
   */
  readonly deferFirstMessage?: boolean | undefined;
  readonly detail?: ReactNode | undefined;
  readonly label: ReactNode;
  /**
   * Announces the value's own updates. Render the metric whenever the panel
   * can produce a reading and let `value` go empty until one arrives, rather
   * than mounting the metric beside its first value; an empty announcing
   * value region occupies no space.
   */
  readonly live?: AnnouncementMode | undefined;
  /**
   * Milliseconds a changed reading has to stay the same before it is spoken.
   * The visible value still changes at once; a visually hidden region inside
   * the value speaks it once it settles, so the value element itself no
   * longer carries the role. Anything but a positive number speaks each
   * change at once. Meaningful only on an announcing metric.
   */
  readonly settleMs?: number | undefined;
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
  /**
   * Unit shown after the value. Pass `{ symbol, name }` to show a compact
   * symbol and speak its name, so "kn" reads as "12 knots" rather than letter
   * by letter. Source both, and any conversion behind them, from the
   * consumer's own resolution of the server's unit preferences: this package
   * neither fetches nor selects units.
   */
  readonly unit?: UnitContent | undefined;
  readonly value: ReactNode;
}

export function Metric({
  "aria-labelledby": ariaLabelledBy,
  className,
  deferFirstMessage,
  detail,
  label,
  live,
  ref,
  settleMs,
  tone = "neutral",
  toneLabel,
  unit,
  value,
  ...props
}: MetricProps): React.JSX.Element {
  requireContent(label, "Metric requires a non-empty label.");

  const labelId = useId();
  /*
   * An announcing value keeps its region mounted so a screen reader observes
   * it before the first reading arrives. With no reading the region renders
   * empty, and the stylesheet takes it out of the flow, so the label stands
   * alone rather than over a tone glyph or a bare unit. A metric that does not
   * announce holds its region empty for the same reason: a warning glyph and a
   * unit with no number read as a measured state rather than a missing one.
   */
  const hasValue = hasReactContent(value);
  const hasUnit = hasUnitContent(unit);
  const attributes = liveRegionProps(live);
  // A reading present on the first render is held for a beat, so the region
  // exists empty before the number arrives. A settling value speaks through a
  // region of its own, which owns the hold, so the visible reading never waits.
  const { defers, echoes, holding } = useAnnouncingTiming(attributes, {
    deferFirstMessage,
    hasContent: hasValue,
    settleMs,
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: Metrics may render outside MetricGrid, and fieldset would imply form controls.
    <div
      {...props}
      ref={ref}
      className={classNames("snui-metric", `snui-metric--${tone}`, className)}
      role="group"
      aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
    >
      <div id={labelId} className="snui-metric__label">
        {label}
      </div>
      {echoes ? (
        <div className="snui-metric__value">
          {hasValue ? (
            <>
              <ToneGlyph className="snui-metric__tone-glyph" tone={tone} />
              <span aria-hidden="true">{value}</span>
              {hasUnit ? (
                <>
                  {" "}
                  <span className="snui-metric__unit" aria-hidden="true">
                    {renderUnit(unit)}
                  </span>
                </>
              ) : null}
            </>
          ) : null}
          <ToneEchoRegion
            className="snui-metric__region"
            defers={defers}
            live={live}
            settleMs={settleMs}
            tone={tone}
            toneLabel={toneLabel}
          >
            {hasValue ? (
              <>
                {value}
                {hasUnit ? <> {renderUnit(unit)}</> : null}
              </>
            ) : null}
          </ToneEchoRegion>
        </div>
      ) : (
        <div
          className="snui-metric__value"
          role={attributes.role}
          aria-live={attributes["aria-live"]}
        >
          {hasValue && !holding ? (
            <>
              <ToneMark
                className="snui-metric__tone-glyph"
                tone={tone}
                toneLabel={toneLabel}
              />
              {value}
              {hasUnit ? (
                <>
                  {" "}
                  <span className="snui-metric__unit">{renderUnit(unit)}</span>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      )}
      {hasReactContent(detail) ? (
        <div className="snui-metric__detail">{detail}</div>
      ) : null}
    </div>
  );
}

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    RefAttributes<HTMLSpanElement> {
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

/**
 * A count or a short state, as a pill. It is not interactive and does not
 * become interactive: a chip that jumps to the thing it counts is a control,
 * and a control has to carry the package's target-size floor, which a badge
 * does not. Render a compact `Button` for that, beside the badges reporting
 * the same count.
 */
export function Badge({
  children,
  className,
  ref,
  tone = "neutral",
  toneLabel,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      {...props}
      ref={ref}
      className={classNames("snui-badge", `snui-badge--${tone}`, className)}
    >
      <ToneMark
        className="snui-badge__tone-glyph"
        tone={tone}
        toneLabel={toneLabel}
      />
      {children}
    </span>
  );
}
