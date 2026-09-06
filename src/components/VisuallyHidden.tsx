import type { ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import {
  createPolymorphicElement,
  type PolymorphicProps,
} from "../utils/polymorphic.js";

export type VisuallyHiddenElement = "span" | "div" | "p" | "label" | "legend";

interface VisuallyHiddenOwnProps {
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export type VisuallyHiddenProps = PolymorphicProps<
  VisuallyHiddenElement,
  "span",
  VisuallyHiddenOwnProps
>;

/**
 * Takes content out of the visual flow while leaving it in the accessibility
 * tree. Use it for text that names or describes something a sighted user
 * already infers from layout. Never wrap a focusable control in it without a
 * visible focus treatment of its own.
 */
export function VisuallyHidden({
  as = "span",
  className,
  ...props
}: VisuallyHiddenProps): React.JSX.Element {
  return createPolymorphicElement(as, {
    ...props,
    className: classNames("snui-visually-hidden", className),
  });
}
