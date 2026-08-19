import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { hasReactContent } from "../utils/react-node.js";
import { composeRef } from "../utils/ref.js";
import { Button, type ButtonVariant } from "./Button.js";

export type InlineConfirmCancelReason = "cancel" | "escape";

export interface InlineConfirmProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onCancel" | "title">,
    RefAttributes<HTMLElement> {
  readonly busy?: boolean | undefined;
  readonly cancelLabel?: ReactNode | undefined;
  readonly cancelVariant?: ButtonVariant | undefined;
  readonly confirmLabel?: ReactNode | undefined;
  readonly confirmVariant?:
    | Extract<ButtonVariant, "primary" | "danger">
    | undefined;
  /** Sets the initial state only. Pass `open` to control the confirmation. */
  readonly defaultOpen?: boolean | undefined;
  readonly fallbackTitle?: ReactNode | undefined;
  readonly headingLevel?: HeadingLevel | undefined;
  /** Focused on open instead of the region container. */
  readonly initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  /** Removes the region landmark and its naming when false. */
  readonly landmark?: boolean | undefined;
  readonly message: ReactNode;
  readonly onCancel: (reason: InlineConfirmCancelReason) => void;
  readonly onConfirm: () => void;
  readonly open?: boolean | undefined;
  /** Receives focus after close instead of the previously focused element. */
  readonly returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly title?: ReactNode | undefined;
}

export function InlineConfirm({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  busy = false,
  cancelLabel = "Cancel",
  cancelVariant,
  className,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  defaultOpen = false,
  fallbackTitle = "Confirm action",
  headingLevel = 2,
  initialFocusRef,
  landmark = true,
  message,
  onKeyDown,
  onCancel,
  onConfirm,
  open,
  ref,
  returnFocusRef,
  title,
  ...props
}: InlineConfirmProps): React.JSX.Element | null {
  const titleId = useId();
  const messageId = useId();
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const focusIsInside = useRef(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const effectiveOpen = open ?? internalOpen;
  const effectiveTitle = hasReactContent(title)
    ? title
    : hasReactContent(fallbackTitle)
      ? fallbackTitle
      : "Confirm action";
  const effectiveCancelLabel = hasReactContent(cancelLabel)
    ? cancelLabel
    : "Cancel";
  const effectiveConfirmLabel = hasReactContent(confirmLabel)
    ? confirmLabel
    : "Confirm";
  const Heading = HEADING_ELEMENTS[headingLevel];

  // One callback ref owns the node so a caller ref is attached and released
  // exactly once per mount, instead of on every commit.
  const attachContainer = useCallback(
    (node: HTMLElement): (() => void) => {
      containerRef.current = node;
      const releaseRef = composeRef(ref, node);
      return () => {
        containerRef.current = null;
        releaseRef();
      };
    },
    [ref],
  );

  const capturePreviousFocus = useEffectEvent((): void => {
    const activeElement = containerRef.current?.ownerDocument.activeElement;
    previousFocus.current =
      activeElement !== null &&
      activeElement !== undefined &&
      "focus" in activeElement
        ? (activeElement as HTMLElement)
        : null;
  });

  const restorePreviousFocus = useEffectEvent((): void => {
    const destination = returnFocusRef?.current ?? previousFocus.current;
    if (focusIsInside.current && destination?.isConnected === true) {
      destination.focus();
    }
    previousFocus.current = null;
  });

  useEffect(() => {
    if (!effectiveOpen) return undefined;

    capturePreviousFocus();
    return restorePreviousFocus;
  }, [effectiveOpen]);

  const trackFocus = useEffectEvent((event: FocusEvent): void => {
    const container = containerRef.current;
    focusIsInside.current =
      container !== null && event.composedPath().includes(container);
  });

  useEffect(() => {
    if (!effectiveOpen) return undefined;

    const container = containerRef.current;
    const ownerDocument = container?.ownerDocument;
    if (container === null || ownerDocument === undefined) return undefined;

    focusIsInside.current = container.contains(ownerDocument.activeElement);
    ownerDocument.addEventListener("focusin", trackFocus);
    return () => {
      ownerDocument.removeEventListener("focusin", trackFocus);
      focusIsInside.current = false;
    };
  }, [effectiveOpen]);

  useEffect(() => {
    if (!effectiveOpen) return;

    const container = containerRef.current;
    if (container === null) return;

    // Keep the confirmation on screen before moving focus into it. Reduced
    // motion users get an instant jump instead of a smooth scroll. jsdom does
    // not implement scrollIntoView, so it is feature detected rather than
    // assumed.
    const reduceMotion = prefersReducedMotion(
      container.ownerDocument.defaultView,
    );
    const scrollable = container as {
      scrollIntoView?: (options: ScrollIntoViewOptions) => void;
    };
    scrollable.scrollIntoView?.({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });

    // Focus the labelled and described container so the message is conveyed on
    // open, unless the caller named a better first stop. Focusing Cancel first
    // would announce the button and skip the message it is asking the user to
    // act on.
    //
    // Nothing chases focus across the busy transition: both actions block
    // activation through aria-disabled rather than leaving the tab order, so
    // whatever the user focused stays focused.
    (initialFocusRef?.current ?? container).focus();
  }, [effectiveOpen, initialFocusRef]);

  const close = (): void => {
    if (open === undefined) setInternalOpen(false);
  };

  const cancel = (reason: InlineConfirmCancelReason): void => {
    close();
    onCancel(reason);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "Escape" || busy) return;
    event.preventDefault();
    event.stopPropagation();
    cancel("escape");
  };

  if (!effectiveOpen) return null;

  return (
    // The focusable region owns Escape handling for itself and its descendants.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <section
      {...props}
      ref={attachContainer}
      className={classNames("snui-inline-confirm", className)}
      aria-labelledby={
        landmark ? joinIdReferences(ariaLabelledBy, titleId) : undefined
      }
      aria-describedby={joinIdReferences(ariaDescribedBy, messageId)}
      aria-keyshortcuts="Escape"
      aria-busy={busy || undefined}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <Heading id={titleId} className="snui-inline-confirm__title">
        {effectiveTitle}
      </Heading>
      <div id={messageId} className="snui-inline-confirm__message">
        {message}
      </div>
      <div className="snui-inline-confirm__actions">
        <Button
          variant={cancelVariant}
          ariaDisabled={busy}
          onClick={() => cancel("cancel")}
        >
          {effectiveCancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          loading={busy}
          onClick={() => {
            close();
            onConfirm();
          }}
        >
          {effectiveConfirmLabel}
        </Button>
      </div>
    </section>
  );
}
