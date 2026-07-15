import { type HTMLAttributes, type ReactNode, useId } from "react";

import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { StatusTone } from "./StatusIndicator.js";

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

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: LayoutAlignment;
  readonly gap?: SpaceScale;
}

export function Stack({
  align = "stretch",
  className,
  gap = 4,
  ...props
}: StackProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-stack",
        `snui-stack--${GAP_CLASSES[gap]}`,
        `snui-layout--align-${align}`,
        className,
      )}
    />
  );
}

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: LayoutAlignment;
  readonly gap?: SpaceScale;
  readonly justify?: "start" | "center" | "end" | "between";
}

export function Cluster({
  align = "center",
  className,
  gap = 2,
  justify = "start",
  ...props
}: ClusterProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={classNames(
        "snui-cluster",
        `snui-cluster--${GAP_CLASSES[gap]}`,
        `snui-layout--align-${align}`,
        `snui-layout--justify-${justify}`,
        className,
      )}
    />
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

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps): React.JSX.Element {
  return <div {...props} className={classNames("snui-card", className)} />;
}

export type MetricGridProps = HTMLAttributes<HTMLDivElement>;

export function MetricGrid({
  className,
  ...props
}: MetricGridProps): React.JSX.Element {
  return (
    <div {...props} className={classNames("snui-metric-grid", className)} />
  );
}

export interface MetricProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly detail?: ReactNode;
  readonly label: ReactNode;
  readonly tone?: StatusTone;
  readonly value: ReactNode;
}

export function Metric({
  "aria-labelledby": ariaLabelledBy,
  className,
  detail,
  label,
  tone = "neutral",
  value,
  ...props
}: MetricProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error("Metric requires a non-empty label.");
  }

  const labelId = useId();

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
      <div className="snui-metric__value">{value}</div>
      {hasReactContent(detail) ? (
        <div className="snui-metric__detail">{detail}</div>
      ) : null}
    </div>
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: StatusTone;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      {...props}
      className={classNames("snui-badge", `snui-badge--${tone}`, className)}
    />
  );
}
