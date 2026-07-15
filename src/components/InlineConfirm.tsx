import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";
import { Button, type ButtonVariant } from "./Button.js";

export interface InlineConfirmProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onCancel" | "title"> {
  readonly busy?: boolean;
  readonly cancelLabel?: ReactNode;
  readonly confirmLabel?: ReactNode;
  readonly confirmVariant?: Extract<ButtonVariant, "primary" | "danger">;
  readonly fallbackTitle?: ReactNode;
  readonly headingLevel?: HeadingLevel;
  readonly message: ReactNode;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly open: boolean;
  readonly rootRef?: Ref<HTMLElement | null>;
  readonly title?: ReactNode;
}

export function InlineConfirm({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  busy = false,
  cancelLabel = "Cancel",
  className,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  fallbackTitle = "Confirm action",
  headingLevel = 2,
  message,
  onKeyDown,
  onCancel,
  onConfirm,
  open,
  rootRef,
  title,
  ...props
}: InlineConfirmProps): React.JSX.Element | null {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const focusIsInside = useRef(false);
  const wasOpen = useRef(false);
  const wasBusy = useRef(busy);
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

  useImperativeHandle<HTMLElement | null, HTMLElement | null>(
    rootRef,
    () => containerRef.current,
  );

  useEffect(() => {
    if (!open) return undefined;

    const activeElement = containerRef.current?.ownerDocument.activeElement;
    previousFocus.current =
      activeElement !== null &&
      activeElement !== undefined &&
      "focus" in activeElement
        ? (activeElement as HTMLElement)
        : null;
    return () => {
      if (previousFocus.current?.isConnected === true) {
        previousFocus.current.focus();
      }
      previousFocus.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const container = containerRef.current;
    const ownerDocument = container?.ownerDocument;
    if (container === null || ownerDocument === undefined) return undefined;

    const trackFocus = (event: FocusEvent): void => {
      focusIsInside.current = event.composedPath().includes(container);
    };

    focusIsInside.current = container.contains(ownerDocument.activeElement);
    ownerDocument.addEventListener("focusin", trackFocus);
    return () => {
      ownerDocument.removeEventListener("focusin", trackFocus);
      focusIsInside.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      wasBusy.current = busy;
      return;
    }

    const container = containerRef.current;
    const activeElement = container?.ownerDocument.activeElement ?? null;
    const shouldMoveFocus =
      !wasOpen.current ||
      (busy !== wasBusy.current &&
        (focusIsInside.current ||
          (activeElement !== null &&
            container?.contains(activeElement) === true)));

    if (shouldMoveFocus) {
      if (busy) container?.focus();
      else cancelRef.current?.focus();
    }

    wasOpen.current = true;
    wasBusy.current = busy;
  }, [busy, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "Escape" || busy) return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  if (!open) return null;

  return (
    // The focusable region owns Escape handling for itself and its descendants.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      {...props}
      ref={containerRef}
      className={classNames("snui-inline-confirm", className)}
      aria-labelledby={joinIdReferences(ariaLabelledBy, titleId)}
      aria-describedby={joinIdReferences(ariaDescribedBy, messageId)}
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
        <Button ref={cancelRef} disabled={busy} onClick={onCancel}>
          {effectiveCancelLabel}
        </Button>
        <Button variant={confirmVariant} loading={busy} onClick={onConfirm}>
          {effectiveConfirmLabel}
        </Button>
      </div>
    </section>
  );
}
