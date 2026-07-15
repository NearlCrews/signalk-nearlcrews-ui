import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";

export type CollapsibleMountStrategy = "retain" | "unmount";
export type CollapsibleSummaryPlacement = "below" | "header";

export interface CollapsibleSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "onToggle" | "title"> {
  readonly actions?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly headingLevel?: HeadingLevel;
  readonly mountStrategy?: CollapsibleMountStrategy;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly summary?: ReactNode;
  readonly summaryPlacement?: CollapsibleSummaryPlacement;
  readonly title: ReactNode;
}

export function CollapsibleSection({
  actions,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultOpen = false,
  disabled = false,
  headingLevel = 2,
  mountStrategy = "retain",
  onOpenChange,
  open,
  summary,
  summaryPlacement = "below",
  title,
  ...props
}: CollapsibleSectionProps): React.JSX.Element {
  const generatedId = useId();
  const contentId = `${generatedId}-content`;
  const titleId = `${generatedId}-title`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const effectiveOpen = open ?? internalOpen;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focusWasInside = useRef(false);
  const Heading = HEADING_ELEMENTS[headingLevel];

  useEffect(() => {
    const ownerDocument = contentRef.current?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (
      ownerDocument === undefined ||
      ownerWindow === null ||
      ownerWindow === undefined ||
      !effectiveOpen
    ) {
      return undefined;
    }

    const trackFocus = (event: FocusEvent): void => {
      focusWasInside.current =
        event.target instanceof ownerWindow.Node &&
        (contentRef.current?.contains(event.target) ?? false);
    };
    ownerDocument.addEventListener("focusin", trackFocus);
    return () => ownerDocument.removeEventListener("focusin", trackFocus);
  }, [effectiveOpen]);

  useEffect(() => {
    if (effectiveOpen || !focusWasInside.current) return;
    toggleRef.current?.focus();
    focusWasInside.current = false;
  }, [effectiveOpen]);

  const toggle = (): void => {
    if (disabled) return;
    const nextOpen = !effectiveOpen;
    if (!nextOpen && contentRef.current !== null) {
      const { activeElement } = contentRef.current.ownerDocument;
      if (
        activeElement !== null &&
        contentRef.current.contains(activeElement)
      ) {
        toggleRef.current?.focus();
      }
    }
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const renderChildren = mountStrategy === "retain" || effectiveOpen;
  const renderSummary = !effectiveOpen && hasReactContent(summary);

  return (
    <section
      {...props}
      className={classNames("snui-collapsible", className)}
      aria-labelledby={joinIdReferences(ariaLabelledBy, titleId)}
    >
      <header className="snui-collapsible__header">
        <Heading className="snui-collapsible__heading">
          <button
            ref={toggleRef}
            type="button"
            className="snui-collapsible__toggle"
            aria-controls={contentId}
            aria-expanded={effectiveOpen}
            disabled={disabled}
            onClick={toggle}
          >
            <span className="snui-collapsible__chevron" aria-hidden="true">
              ›
            </span>
            <span id={titleId} className="snui-collapsible__title">
              {title}
            </span>
          </button>
        </Heading>
        {renderSummary && summaryPlacement === "header" ? (
          <div className="snui-collapsible__summary snui-collapsible__summary--header">
            {summary}
          </div>
        ) : null}
        {hasReactContent(actions) ? (
          <div className="snui-collapsible__actions">{actions}</div>
        ) : null}
      </header>
      {renderSummary && summaryPlacement === "below" ? (
        <div className="snui-collapsible__summary snui-collapsible__summary--below">
          {summary}
        </div>
      ) : null}
      <div
        ref={contentRef}
        id={contentId}
        className="snui-collapsible__content"
        hidden={!effectiveOpen}
      >
        {renderChildren ? children : null}
      </div>
    </section>
  );
}
