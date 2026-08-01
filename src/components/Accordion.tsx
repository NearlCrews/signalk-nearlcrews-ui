import {
  Children,
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useState,
} from "react";
import { classNames } from "../utils/class-names.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./CollapsibleSection.js";

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children: ReactNode;
}

/**
 * Coordinates a set of collapsible sections so at most one is open. Each
 * child stays a controlled section: opening one closes the others, and
 * keyboard behavior remains per child.
 */
export function Accordion({
  children,
  className,
  ...props
}: AccordionProps): React.JSX.Element {
  const sections = Children.toArray(children).map((child) => {
    if (
      !isValidElement<CollapsibleSectionProps>(child) ||
      child.type !== CollapsibleSection
    ) {
      throw new Error("Accordion accepts only CollapsibleSection children.");
    }
    return child;
  });

  const [openIndex, setOpenIndex] = useState<number | null>(() => {
    const initial = sections.findIndex(
      (section) => section.props.defaultOpen === true,
    );
    return initial === -1 ? null : initial;
  });

  return (
    <div {...props} className={classNames("snui-accordion", className)}>
      {sections.map((section, index) =>
        cloneElement(section, {
          open: openIndex === index,
          onOpenChange: (nextOpen: boolean): void => {
            section.props.onOpenChange?.(nextOpen);
            setOpenIndex(nextOpen ? index : null);
          },
        }),
      )}
    </div>
  );
}
