import {
  Children,
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { classNames } from "../utils/class-names.js";
import { warnOnce } from "../utils/warn-once.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./CollapsibleSection.js";

export interface AccordionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue">,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  /**
   * Position of the section open at first render when uncontrolled, or null
   * for all shut. It defaults to the first child carrying `defaultOpen`.
   */
  readonly defaultOpenIndex?: number | null | undefined;
  /** Receives the position of the section now open, or null once all are shut. */
  readonly onOpenIndexChange?: ((index: number | null) => void) | undefined;
  /**
   * Position of the open section when controlled, or null for all shut. Give
   * it to open a section from outside, for example to reveal the one holding
   * a validation error, or to restore the section a panel had open.
   */
  readonly openIndex?: number | null | undefined;
}

/**
 * Coordinates a set of collapsible sections so at most one is open. The
 * accordion owns `open` for every child: a child's own `open` is ignored, and
 * its `onOpenChange` is called for every change the accordion makes, including
 * the close it performs on the section it is replacing. Keyboard behavior
 * remains per child. Sections default to `landmark={false}` here, because six
 * regions from one accordion would crowd the landmark list; a child can opt
 * back in.
 *
 * @remarks
 * Keep child order stable after the first render. The accordion tracks the
 * open section by its position, so inserting, removing, or reordering children
 * can transfer the open state to a different section.
 */
export function Accordion({
  children,
  className,
  defaultOpenIndex,
  onOpenIndexChange,
  openIndex,
  ref,
  ...props
}: AccordionProps): React.JSX.Element {
  const sections = Children.toArray(children).map((child) => {
    if (
      !isValidElement<CollapsibleSectionProps>(child) ||
      child.type !== CollapsibleSection
    ) {
      throw new Error(
        `Accordion accepts only CollapsibleSection children; received ${describeChild(child)}.`,
      );
    }
    if (child.props.open !== undefined) warnIgnoredOpen();
    return child;
  });

  const [effectiveIndex, commitIndex] = useControllableState(
    openIndex,
    defaultOpenIndex ?? initialOpenIndex(sections),
    onOpenIndexChange,
  );

  /*
   * The accordion, not the pressed section, decides what closes, so the
   * section it replaces hears its own close. A consumer mirroring per-section
   * state would otherwise never be told about it.
   */
  const reportOpen = (index: number, nextOpen: boolean): void => {
    if (nextOpen && effectiveIndex !== null && effectiveIndex !== index) {
      sections[effectiveIndex]?.props.onOpenChange?.(false);
    }
    sections[index]?.props.onOpenChange?.(nextOpen);
    commitIndex(nextOpen ? index : null);
  };

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-accordion", className)}
    >
      {sections.map((section, index) =>
        cloneElement(section, {
          landmark: section.props.landmark ?? false,
          open: effectiveIndex === index,
          onOpenChange: (nextOpen: boolean) => {
            reportOpen(index, nextOpen);
          },
        }),
      )}
    </div>
  );
}

/**
 * Position of the section a set of children opens with. Only one section is
 * open at a time, so the first `defaultOpen` wins and any later ones are
 * ignored.
 */
function initialOpenIndex(
  sections: readonly ReactElement<CollapsibleSectionProps>[],
): number | null {
  const initial = sections.findIndex(
    (section) => section.props.defaultOpen === true,
  );
  return initial === -1 ? null : initial;
}

/**
 * What a rejected child was, so the author can find it. A minified consumer
 * bundle points its stack at the accordion rather than at the element.
 */
function describeChild(child: ReactNode): string {
  if (!isValidElement(child)) return typeof child;
  const { type } = child;
  if (typeof type === "string") return `<${type}>`;
  if (typeof type === "function") {
    const named = type as { displayName?: string; name?: string };
    return `<${named.displayName ?? named.name ?? "anonymous component"}>`;
  }
  return "an element";
}

/**
 * A child element carries a new props object on every render, so the report is
 * keyed on the mistake rather than on the child, which would repeat it for
 * every frame the mistake survives.
 */
function warnIgnoredOpen(): void {
  warnOnce(
    "accordion-ignored-open",
    "Accordion owns the open state of every child, so the open prop on a CollapsibleSection inside it is ignored. Control the accordion through openIndex instead.",
  );
}
