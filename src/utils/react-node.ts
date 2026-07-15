import { Children, Fragment, isValidElement, type ReactNode } from "react";

export function hasReactContent(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (isValidElement<{ children?: ReactNode }>(child)) {
      return child.type !== Fragment || hasReactContent(child.props.children);
    }
    return true;
  });
}
