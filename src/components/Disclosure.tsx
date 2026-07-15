import type { DetailsHTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";

export interface DisclosureProps
  extends Omit<
    DetailsHTMLAttributes<HTMLDetailsElement>,
    "onToggle" | "title"
  > {
  readonly onOpenChange?: (open: boolean) => void;
  readonly title: ReactNode;
}

export function Disclosure({
  children,
  className,
  onOpenChange,
  title,
  ...props
}: DisclosureProps): React.JSX.Element {
  return (
    <details
      {...props}
      className={classNames("snui-disclosure", className)}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary className="snui-disclosure__summary">
        <span className="snui-disclosure__chevron" aria-hidden="true">
          ›
        </span>
        <span>{title}</span>
      </summary>
      <div className="snui-disclosure__content">{children}</div>
    </details>
  );
}
