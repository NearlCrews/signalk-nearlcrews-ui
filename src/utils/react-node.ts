import { Children, Fragment, isValidElement, type ReactNode } from "react";

/**
 * Throws when a required slot carries no rendered content. Blank text and
 * empty fragments count as absent, so a component never ships an unnamed
 * control or an untitled surface.
 */
export function requireContent(node: ReactNode, message: string): void {
  if (!hasReactContent(node)) throw new Error(message);
}

export function hasReactContent(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (isValidElement<{ children?: ReactNode }>(child)) {
      return child.type !== Fragment || hasReactContent(child.props.children);
    }
    return true;
  });
}

/**
 * Requires a control to carry a name at compile time. A component that accepts
 * `label` beside an older naming prop composes its base props with this, so
 * omitting both is a type error rather than a render-time throw. `Legacy` is
 * the older prop, `children` on most controls and `legend` on the ones that
 * once rendered a fieldset.
 */
export type WithLabel<Legacy extends string> =
  | ({ readonly label: ReactNode } & Partial<
      Readonly<Record<Legacy, ReactNode | undefined>>
    >)
  | ({ readonly label?: ReactNode | undefined } & Readonly<
      Record<Legacy, ReactNode>
    >);
