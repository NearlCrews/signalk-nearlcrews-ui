import type { HTMLAttributes, ReactNode, RefAttributes } from "react";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title">,
    RefAttributes<HTMLDivElement> {
  readonly action?: ReactNode | undefined;
  readonly description?: ReactNode | undefined;
  /** Decorative only: rendered inside an aria-hidden container. */
  readonly icon?: ReactNode | undefined;
  /** A styled div, not a heading: consumers own the outline around it. */
  readonly title: ReactNode;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  ref,
  title,
  ...props
}: EmptyStateProps): React.JSX.Element {
  if (!hasReactContent(title)) {
    throw new Error("EmptyState requires a non-empty title.");
  }

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-empty-state", className)}
    >
      {hasReactContent(icon) ? (
        <div className="snui-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="snui-empty-state__title">{title}</div>
      {hasReactContent(description) ? (
        <div className="snui-empty-state__description">{description}</div>
      ) : null}
      {hasReactContent(action) ? (
        <div className="snui-empty-state__action">{action}</div>
      ) : null}
    </div>
  );
}
