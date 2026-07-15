import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly tone?: StatusTone;
}

export function StatusIndicator({
  children,
  className,
  tone = "neutral",
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  return (
    <span
      {...props}
      className={classNames("snui-status", `snui-status--${tone}`, className)}
    >
      <span className="snui-status__dot" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
