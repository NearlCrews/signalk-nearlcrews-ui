import {
  Children,
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
  useState,
} from "react";
import { classNames } from "../utils/class-names.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./CollapsibleSection.js";

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

/**
 * Coordinates a set of collapsible sections so at most one is open. Each
 * child stays a controlled section: opening one closes the others, and
 * keyboard behavior remains per child. Sections default to `landmark={false}`
 * here, because six regions from one accordion would crowd the landmark list;
 * a child can opt back in.
 *
 * @remarks
 * Keep child order stable after the first render. The accordion tracks the
 * open section by its position, so inserting, removing, or reordering children
 * can transfer the open state to a different section.
 */
export function Accordion({
  children,
  className,
  ref,
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
    // Only one section is open at a time, so the first defaultOpen wins and
    // any later ones are ignored.
    const initial = sections.findIndex(
      (section) => section.props.defaultOpen === true,
    );
    return initial === -1 ? null : initial;
  });

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-accordion", className)}
    >
      {sections.map((section, index) =>
        cloneElement(section, {
          landmark: section.props.landmark ?? false,
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
