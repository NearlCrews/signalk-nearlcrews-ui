import type { DetailsHTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

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
  if (!hasReactContent(title)) {
    throw new Error("Disclosure requires a non-empty title.");
  }

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
        <span className="snui-disclosure__title">{title}</span>
      </summary>
      <div className="snui-disclosure__content">{children}</div>
    </details>
  );
}
