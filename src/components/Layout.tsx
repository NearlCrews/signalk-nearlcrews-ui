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
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import {
  createPolymorphicElement,
  type PolymorphicProps,
} from "../utils/polymorphic.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { isSemanticTone, type StatusTone } from "../utils/tone.js";
import { type Density, resolveDensity } from "../utils/variants.js";
import { ToneMark } from "./ToneMark.js";

export type SpaceScale = 1 | 2 | 3 | 4 | 5 | 6;
export type LayoutAlignment = "start" | "center" | "end" | "stretch";

const GAP_CLASSES = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
} as const satisfies Readonly<Record<SpaceScale, string>>;

/** List elements need real list items; wrap each child so ul and ol stay valid. */
function renderListItems(as: string, children: ReactNode): ReactNode {
  if (as !== "ul" && as !== "ol") return children;
  return Children.map(children, (child) => <li>{child}</li>);
}

export type StackElement = "div" | "ul" | "ol" | "form" | "section" | "nav";

interface StackOwnProps {
  readonly align?: LayoutAlignment | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly gap?: SpaceScale | undefined;
}

/**
 * Discriminated on `as`: a form stack accepts form attributes and its ref
 * resolves to the form element. See {@link PolymorphicProps}.
 */
export type StackProps = PolymorphicProps<StackElement, "div", StackOwnProps>;

export function Stack({
  align = "stretch",
  as = "div",
  children,
  className,
  gap = 4,
  ...props
}: StackProps): React.JSX.Element {
  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames(
        "snui-stack",
        `snui-stack--${GAP_CLASSES[gap]}`,
        `snui-layout--align-${align}`,
        className,
      ),
    },
    renderListItems(as, children),
  );
}

export type ClusterElement = "div" | "ul" | "ol" | "section" | "nav";

interface ClusterOwnProps extends StackOwnProps {
  readonly justify?:
    | "start"
    | "center"
    | "end"
    | "between"
    | "around"
    | "evenly"
    | undefined;
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
        `snui-cluster--${GAP_CLASSES[gap]}`,
        `snui-layout--align-${align}`,
        `snui-layout--justify-${justify}`,
        className,
      ),
    },
    renderListItems(as, children),
  );
}

/** @deprecated Use `Density`; `"comfortable"` maps to `"default"`. */
export type InputGroupDensity = Density | "comfortable";

export interface InputGroupProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  /** `"comfortable"` is a deprecated alias of `"default"`. */
  readonly density?: Density | "comfortable" | undefined;
}

export function InputGroup({
  className,
  density = "default",
  ref,
  ...props
}: InputGroupProps): React.JSX.Element {
  const effectiveDensity = resolveDensity(density);
  return (
    <div
      {...props}
      ref={ref}
      className={classNames(
        "snui-input-group",
        `snui-input-group--${effectiveDensity}`,
        className,
      )}
    />
  );
}

export type InputGroupControlWidth = "fixed" | "grow";

export interface InputGroupControlProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly width?: InputGroupControlWidth | undefined;
}

export function InputGroupControl({
  className,
  ref,
  width = "grow",
  ...props
}: InputGroupControlProps): React.JSX.Element {
  return (
    <div
      {...props}
      ref={ref}
      className={classNames(
        "snui-input-group__control",
        `snui-input-group__control--${width}`,
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
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly density?: CardDensity | undefined;
  readonly footer?: ReactNode | undefined;
  readonly header?: ReactNode | undefined;
  /** Paints a leading accent bar and marks the card with the tone glyph. */
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

export type CardProps = PolymorphicProps<CardElement, "div", CardOwnProps>;

export function Card({
  as = "div",
  children,
  className,
  density = "default",
  footer,
  header,
  tone = "neutral",
  toneLabel,
  ...props
}: CardProps): React.JSX.Element {
  const hasHeader = hasReactContent(header);
  const mark = isSemanticTone(tone) ? (
    <ToneMark
      className="snui-card__tone-glyph"
      tone={tone}
      toneLabel={toneLabel}
    />
  ) : null;

  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames(
        "snui-card",
        `snui-card--${density}`,
        isSemanticTone(tone) && `snui-card--${tone}`,
        className,
      ),
    },
    hasHeader ? (
      <div className="snui-card__header">
        {mark}
        {header}
      </div>
    ) : (
      mark
    ),
    children,
    hasReactContent(footer) ? (
      <div className="snui-card__footer">{footer}</div>
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
  readonly detail?: ReactNode | undefined;
  readonly label: ReactNode;
  readonly live?: AnnouncementMode | undefined;
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
  readonly unit?: ReactNode | undefined;
  readonly value: ReactNode;
}

export function Metric({
  "aria-labelledby": ariaLabelledBy,
  className,
  detail,
  label,
  live,
  ref,
  tone = "neutral",
  toneLabel,
  unit,
  value,
  ...props
}: MetricProps): React.JSX.Element {
  requireContent(label, "Metric requires a non-empty label.");

  const labelId = useId();
  const valueRegion = liveRegionProps(live);

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
      <div
        className="snui-metric__value"
        role={valueRegion.role}
        aria-live={valueRegion["aria-live"]}
      >
        <ToneMark
          className="snui-metric__tone-glyph"
          tone={tone}
          toneLabel={toneLabel}
        />
        {value}
        {hasReactContent(unit) ? (
          <>
            {" "}
            <span className="snui-metric__unit">{unit}</span>
          </>
        ) : null}
      </div>
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
