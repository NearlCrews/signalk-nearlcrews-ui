import {
  Children,
  createElement,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import {
  isSemanticTone,
  resolveToneLabel,
  type StatusTone,
  TONE_GLYPHS,
} from "../utils/tone.js";
import { ToneAnnouncement } from "./ToneAnnouncement.js";

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

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: LayoutAlignment;
  readonly as?: StackElement;
  readonly gap?: SpaceScale;
}

export function Stack({
  align = "stretch",
  as = "div",
  children,
  className,
  gap = 4,
  ...props
}: StackProps): React.JSX.Element {
  return createElement(
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

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: LayoutAlignment;
  readonly as?: ClusterElement;
  readonly gap?: SpaceScale;
  readonly justify?:
    | "start"
    | "center"
    | "end"
    | "between"
    | "around"
    | "evenly";
}

export function Cluster({
  align = "center",
  as = "div",
  children,
  className,
  gap = 2,
  justify = "start",
  ...props
}: ClusterProps): React.JSX.Element {
  return createElement(
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

export type InputGroupDensity = "comfortable" | "compact";

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  readonly density?: InputGroupDensity;
}

export function InputGroup({
  className,
  density = "comfortable",
  ...props
}: InputGroupProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-input-group",
        `snui-input-group--${density}`,
        className,
      )}
    />
  );
}

export type InputGroupControlWidth = "fixed" | "grow";

export interface InputGroupControlProps extends HTMLAttributes<HTMLDivElement> {
  readonly width?: InputGroupControlWidth;
}

export function InputGroupControl({
  className,
  width = "grow",
  ...props
}: InputGroupControlProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-input-group__control",
        `snui-input-group__control--${width}`,
        className,
      )}
    />
  );
}

export type InputGroupAddonProps = HTMLAttributes<HTMLSpanElement>;

export function InputGroupAddon({
  className,
  ...props
}: InputGroupAddonProps): React.JSX.Element {
  return (
    <span
      {...props}
      className={classNames("snui-input-group__addon", className)}
    />
  );
}

export type CardElement = "div" | "section" | "nav";
export type CardDensity = "default" | "compact";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly as?: CardElement;
  readonly density?: CardDensity;
  readonly footer?: ReactNode;
  readonly header?: ReactNode;
}

export function Card({
  as = "div",
  children,
  className,
  density = "default",
  footer,
  header,
  ...props
}: CardProps): React.JSX.Element {
  return createElement(
    as,
    {
      ...props,
      className: classNames("snui-card", `snui-card--${density}`, className),
    },
    hasReactContent(header) ? (
      <div className="snui-card__header">{header}</div>
    ) : null,
    children,
    hasReactContent(footer) ? (
      <div className="snui-card__footer">{footer}</div>
    ) : null,
  );
}

export type MetricGridElement = "div" | "ul" | "ol";

export interface MetricGridProps extends HTMLAttributes<HTMLDivElement> {
  readonly as?: MetricGridElement;
}

export function MetricGrid({
  as = "div",
  children,
  className,
  ...props
}: MetricGridProps): React.JSX.Element {
  return createElement(
    as,
    { ...props, className: classNames("snui-metric-grid", className) },
    renderListItems(as, children),
  );
}

export interface MetricProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
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
  tone = "neutral",
  toneLabel,
  unit,
  value,
  ...props
}: MetricProps): React.JSX.Element {
  requireContent(label, "Metric requires a non-empty label.");

  const labelId = useId();
  const semantic = isSemanticTone(tone);
  const effectiveToneLabel = semantic
    ? resolveToneLabel(tone, toneLabel)
    : undefined;
  const valueRegion = liveRegionProps(live);

  return (
    // biome-ignore lint/a11y/useSemanticElements: Metrics may render outside MetricGrid, and fieldset would imply form controls.
    <div
      {...props}
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
        {semantic ? (
          <span className="snui-metric__tone-glyph" aria-hidden="true">
            {TONE_GLYPHS[tone]}
          </span>
        ) : null}
        <ToneAnnouncement label={effectiveToneLabel} />
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

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

export function Badge({
  children,
  className,
  tone = "neutral",
  toneLabel,
  ...props
}: BadgeProps): React.JSX.Element {
  const semantic = isSemanticTone(tone);
  const effectiveToneLabel = semantic
    ? resolveToneLabel(tone, toneLabel)
    : undefined;

  return (
    <span
      {...props}
      className={classNames("snui-badge", `snui-badge--${tone}`, className)}
    >
      {semantic ? (
        <span className="snui-badge__tone-glyph" aria-hidden="true">
          {TONE_GLYPHS[tone]}
        </span>
      ) : null}
      <ToneAnnouncement label={effectiveToneLabel} />
      {children}
    </span>
  );
}
