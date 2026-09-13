import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useFocusReturnOnClose } from "../hooks/use-focus-return.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { joinIdReferences, landmarkLabel } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { revealElement } from "../utils/focus.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { resolveLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { definedProps } from "../utils/props.js";
import { hasReactContent } from "../utils/react-node.js";
import { Button, type ButtonVariant } from "./Button.js";

export type InlineConfirmCancelReason = "cancel" | "escape";

const DEFAULT_CANCEL_LABEL = "Cancel";
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_TITLE = "Confirm action";

/**
 * Whether the generic destructive confirmation has been reported, so a panel
 * that ships the default label hears about it once rather than per render.
 */
let reportedGenericConfirm = false;

function warnGenericDestructiveConfirm(): void {
  if (!isDevelopment() || reportedGenericConfirm) return;
  reportedGenericConfirm = true;
  console.warn(
    `InlineConfirm renders a destructive confirmation labeled "${DEFAULT_CONFIRM_LABEL}", which names no consequence. Pass confirmLabel, such as "Delete route", wherever the region reaches a user.`,
  );
}

export interface InlineConfirmProps
  extends Omit<
      HTMLAttributes<HTMLElement>,
      "children" | "dangerouslySetInnerHTML" | "onCancel" | "title"
    >,
    RefAttributes<HTMLElement> {
  /**
   * Blocks Confirm while the confirmed action runs. Cancel and Escape stay
   * live: declining is the user's route out of the region, and work already
   * under way is not in conflict with it. `onCancel` may therefore fire while
   * `busy` is true, and the consumer decides what that means.
   *
   * It takes effect only on a controlled region. An uncontrolled one closes
   * itself on Confirm, so there is nothing left on screen to block.
   */
  readonly busy?: boolean | undefined;
  readonly cancelLabel?: ReactNode | undefined;
  /** The escape action is always available, so it never paints as danger. */
  readonly cancelVariant?:
    | Extract<ButtonVariant, "secondary" | "ghost">
    | undefined;
  /**
   * Names the consequence the user is accepting, such as "Delete route".
   * Required in practice for the default danger variant: the built-in
   * "Confirm" names nothing, and development reports a region that ships it.
   */
  readonly confirmLabel?: ReactNode | undefined;
  readonly confirmVariant?:
    | Extract<ButtonVariant, "primary" | "danger">
    | undefined;
  /** Sets the initial state only. Pass `open` to control the confirmation. */
  readonly defaultOpen?: boolean | undefined;
  /**
   * The title used when `title` is blank or absent. It exists so a localized
   * panel can replace the built-in "Confirm action" once, in a shared prop
   * bag, while each confirmation still passes the question it is asking as
   * its own `title`.
   */
  readonly fallbackTitle?: ReactNode | undefined;
  readonly headingLevel?: HeadingLevel | undefined;
  /** Focused on open instead of the region container. */
  readonly initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  /**
   * Removes the region landmark naming when false, including any
   * `aria-labelledby` the consumer passed: the region is then named by its
   * title in the ordinary way.
   */
  readonly landmark?: boolean | undefined;
  readonly message: ReactNode;
  readonly onCancel: (reason: InlineConfirmCancelReason) => void;
  readonly onConfirm: () => void;
  /** Reports every open-state change, including the region closing itself. */
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
  /** Receives focus after close instead of the previously focused element. */
  readonly returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  /** The question being asked. A blank title falls back to `fallbackTitle`. */
  readonly title?: ReactNode | undefined;
}

export function InlineConfirm({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  busy = false,
  cancelLabel,
  cancelVariant,
  className,
  confirmLabel,
  confirmVariant = "danger",
  defaultOpen = false,
  fallbackTitle,
  headingLevel = 2,
  initialFocusRef,
  landmark = true,
  message,
  onKeyDown,
  onCancel,
  onConfirm,
  onOpenChange,
  open,
  ref,
  returnFocusRef,
  title,
  ...props
}: InlineConfirmProps): React.JSX.Element | null {
  const titleId = useId();
  const messageId = useId();
  const containerRef = useRef<HTMLElement | null>(null);
  const [effectiveOpen, commitOpen] = useControllableState(
    open,
    defaultOpen,
    onOpenChange,
  );
  // Each string falls back once: a blank prop reads the same as an absent one,
  // and the panel's bundle stands between a missing prop and the default.
  const bundledLabels = usePanelLabels()?.inlineConfirm;
  const effectiveTitle = hasReactContent(title)
    ? title
    : hasReactContent(fallbackTitle)
      ? fallbackTitle
      : resolveLabel(bundledLabels?.fallbackTitle, DEFAULT_TITLE);
  const effectiveCancelLabel = hasReactContent(cancelLabel)
    ? cancelLabel
    : resolveLabel(bundledLabels?.cancel, DEFAULT_CANCEL_LABEL);
  const hasConfirmLabel = hasReactContent(confirmLabel);
  const effectiveConfirmLabel = hasConfirmLabel
    ? confirmLabel
    : resolveLabel(bundledLabels?.confirm, DEFAULT_CONFIRM_LABEL);
  const Heading = HEADING_ELEMENTS[headingLevel];

  if (confirmVariant === "danger" && !hasConfirmLabel) {
    warnGenericDestructiveConfirm();
  }

  const attachContainer = useNodeRef(containerRef, ref);

  useFocusReturnOnClose(containerRef, effectiveOpen, {
    capturePreviousFocus: true,
    returnFocusRef,
  });

  useEffect(() => {
    if (!effectiveOpen) return;

    const container = containerRef.current;
    if (container === null) return;

    // Keep the confirmation on screen before moving focus into it.
    revealElement(container);

    // Focus the labeled and described container so the message is conveyed on
    // open, unless the caller named a better first stop. Focusing Cancel first
    // would announce the button and skip the message it is asking the user to
    // act on.
    //
    // Nothing chases focus across the busy transition: Cancel stays live and
    // Confirm blocks activation through aria-disabled rather than leaving the
    // tab order, so whatever the user focused stays focused.
    (initialFocusRef?.current ?? container).focus();
  }, [effectiveOpen, initialFocusRef]);

  const cancel = (reason: InlineConfirmCancelReason): void => {
    commitOpen(false);
    onCancel(reason);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Escape survives busy: it is the keyboard route out of the region, and a
    // decision the user is declining has nothing to conflict with.
    if (event.key !== "Escape") return;
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
      aria-labelledby={landmarkLabel(landmark, ariaLabelledBy, titleId)}
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
        <Button
          {...definedProps({ variant: cancelVariant })}
          onClick={() => {
            cancel("cancel");
          }}
        >
          {effectiveCancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          loading={busy}
          onClick={() => {
            commitOpen(false);
            onConfirm();
          }}
        >
          {effectiveConfirmLabel}
        </Button>
      </div>
    </section>
  );
}
