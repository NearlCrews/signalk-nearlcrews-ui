import {
  Activity,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
  useId,
  useRef,
  useState,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useFocusReturnOnClose } from "../hooks/use-focus-return.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { landmarkLabel, requireIdToken } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import type { HeadingLevel } from "../utils/heading.js";
import { useResolvedHeading } from "../utils/heading-level.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import { ToneMark } from "./ToneMark.js";

export type CollapsibleMountStrategy = "lazy-retain" | "retain" | "unmount";
export type CollapsibleSummaryPlacement = "below" | "header";
export type CollapsibleSummaryVisibility = "always" | "collapsed";
export type CollapsibleVariant = "default" | "embedded";

export interface CollapsibleSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "onToggle" | "title">,
    RefAttributes<HTMLElement> {
  readonly actions?: ReactNode | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /**
   * Level of the section heading. It defaults to the level below a
   * `PanelShell` title, and to 2 outside one, so the ordinary panel nests
   * rather than repeating the level its own title already took.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  /**
   * Names the toggle, the title, and the content region: the toggle becomes
   * `<idPrefix>-toggle`, the title `<idPrefix>-title`, and the content
   * `<idPrefix>-content`. Reach for it when a harness or a deep link has to
   * know an id before the section renders.
   */
  readonly idPrefix?: string | undefined;
  /**
   * Removes the region landmark naming when false, including any
   * `aria-labelledby` the consumer passed: the section is then named by its
   * heading in the ordinary way. Accordion defaults it to false.
   */
  readonly landmark?: boolean | undefined;
  /**
   * Content placed before the heading, such as an enable checkbox. It sits
   * outside the toggle button, so it keeps its own semantics and hit area.
   */
  readonly leading?: ReactNode | undefined;
  /**
   * Decides what happens to hidden content. Under "lazy-retain" and "retain"
   * it stays mounted inside React `Activity`: state and refs survive, every
   * effect and layout effect in the subtree runs its cleanup on collapse, and
   * all of them run again on the next expand. An effect with an empty
   * dependency list therefore runs once per expand rather than once per
   * lifetime, so guard one-time work with a ref and keep each cleanup
   * symmetric with its own setup. Under "unmount" hidden content is removed
   * and its state is discarded. The API reference records the failure shapes.
   * `TabPanel` and `DisclosurePanel` spell "retain" differently: they leave
   * the children mounted and hidden with their effects still running.
   */
  readonly mountStrategy?: CollapsibleMountStrategy | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
  readonly summary?: ReactNode | undefined;
  readonly summaryPlacement?: CollapsibleSummaryPlacement | undefined;
  /** Keeps the summary rendered while open under "always". */
  readonly summaryVisibility?: CollapsibleSummaryVisibility | undefined;
  readonly title: ReactNode;
  /**
   * Marks the section with a tone, as `Card` does: a leading accent bar plus
   * the tone glyph and its announcement on the toggle, so a problem inside a
   * collapsed section is visible and spoken while the section is shut. The
   * embedded variant draws no chrome of its own, so it carries the glyph
   * alone.
   */
  readonly tone?: StatusTone | undefined;
  /** Accessible name announced for the tone. Blank falls back to the default name. */
  readonly toneLabel?: string | undefined;
  /**
   * Receives the toggle button, so a panel can focus the section it is
   * jumping to instead of querying the DOM for the heading's button.
   */
  readonly triggerRef?: Ref<HTMLButtonElement> | undefined;
  /** `"embedded"` drops the border, radius, and shadow for nesting inside a Card. */
  readonly variant?: CollapsibleVariant | undefined;
}

export function CollapsibleSection({
  actions,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultOpen = false,
  disabled = false,
  headingLevel,
  idPrefix,
  landmark = true,
  leading,
  mountStrategy = "retain",
  onOpenChange,
  open,
  ref,
  summary,
  summaryPlacement = "below",
  summaryVisibility = "collapsed",
  title,
  tone = "neutral",
  toneLabel,
  triggerRef,
  variant = "default",
  ...props
}: CollapsibleSectionProps): React.JSX.Element {
  requireContent(title, "CollapsibleSection requires a non-empty title.");

  const generatedId = useId();
  const baseId =
    idPrefix === undefined
      ? generatedId
      : requireIdToken(idPrefix, "CollapsibleSection idPrefix");
  const contentId = `${baseId}-content`;
  const titleId = `${baseId}-title`;
  const toggleId = `${baseId}-toggle`;
  const [effectiveOpen, commitOpen] = useControllableState(
    open,
    defaultOpen,
    onOpenChange,
  );
  const [hasOpened, setHasOpened] = useState(effectiveOpen);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const setToggleNode = useNodeRef(toggleRef, triggerRef);
  const { Heading, level } = useResolvedHeading(headingLevel);

  // Latch first-open for lazy-retain: guarded render-phase adjustment, so the
  // content mounts in the same commit that first opens the section. No other
  // strategy reads the latch, so no other strategy pays for the extra pass.
  if (mountStrategy === "lazy-retain" && effectiveOpen && !hasOpened) {
    setHasOpened(true);
  }

  // Closing a section that holds focus would drop the reader on the body, so
  // the toggle takes it back. The restore runs once the close is committed,
  // which keeps focus in place when a controlling owner declines it.
  useFocusReturnOnClose(contentRef, effectiveOpen, {
    returnFocusRef: toggleRef,
  });

  const toggle = (): void => {
    if (disabled) return;
    commitOpen(!effectiveOpen);
  };

  const childrenMounted =
    mountStrategy === "retain" ||
    effectiveOpen ||
    (mountStrategy === "lazy-retain" && hasOpened);
  const renderSummary =
    hasReactContent(summary) &&
    (summaryVisibility === "always" || !effectiveOpen);

  return (
    <section
      {...props}
      ref={ref}
      className={classNames(
        "snui-collapsible",
        `snui-collapsible--${variant}`,
        tone !== "neutral" && `snui-collapsible--${tone}`,
        className,
      )}
      aria-labelledby={landmarkLabel(landmark, ariaLabelledBy, titleId)}
    >
      <header className="snui-collapsible__header">
        {hasReactContent(leading) ? (
          <div className="snui-collapsible__leading">{leading}</div>
        ) : null}
        <Heading
          className={classNames(
            "snui-collapsible__heading",
            `snui-collapsible__heading--level-${String(level)}`,
          )}
        >
          <button
            ref={setToggleNode}
            type="button"
            id={toggleId}
            className="snui-collapsible__toggle"
            aria-controls={contentId}
            aria-expanded={effectiveOpen}
            disabled={disabled}
            onClick={toggle}
          >
            <span className="snui-collapsible__chevron" aria-hidden="true">
              ›
            </span>
            <ToneMark
              className="snui-collapsible__tone-glyph"
              tone={tone}
              toneLabel={toneLabel}
            />
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
        {childrenMounted ? (
          mountStrategy === "unmount" ? (
            children
          ) : (
            <Activity mode={effectiveOpen ? "visible" : "hidden"}>
              {children}
            </Activity>
          )
        ) : null}
      </div>
    </section>
  );
}
