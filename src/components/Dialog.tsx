import {
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { DIALOG_STYLES } from "../styles/dialog.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { focusIsOnBody, focusPanelRoot } from "../utils/focus.js";
import type { HeadingLevel } from "../utils/heading.js";
import { SectionOutlineReset } from "../utils/heading-level.js";
import {
  OverlayLayerProvider,
  overlayZIndex,
  useOverlayLayer,
} from "../utils/overlay-layer.js";
import { usePanelPortalContainer } from "../utils/portal.js";
import { definedProps } from "../utils/props.js";
import {
  hasReactContent,
  reactNodeText,
  requireContent,
} from "../utils/react-node.js";
import {
  observePanelViewport,
  readViewportEdges,
  roundedLayoutValue,
} from "../utils/viewport.js";
import { warnOnce } from "../utils/warn-once.js";
import { Button, type ButtonVariant } from "./Button.js";
import {
  type OverlayOpenState,
  overlayOpenProps,
} from "./overlay-placement.js";

export type DialogWidth = "standard" | "wide";

/**
 * How the user declined. `"cancel"` is the AlertDialog cancel button or
 * another leading action, `"escape"` is the Escape key, and `"scrim"` is a
 * press outside the dialog.
 */
export type DialogCancelReason = "cancel" | "escape" | "scrim";

/**
 * The actions slot: nodes, or a function that receives `close` so an
 * uncontrolled dialog can close from its own action. Closing through `close`
 * is a completed action, so it does not call `onCancel`.
 */
export type DialogActions = ReactNode | ((close: () => void) => ReactNode);

export interface DialogProps
  extends RefAttributes<HTMLElement>,
    OverlayOpenState {
  /**
   * Footer slot for the dialog actions, usually library Buttons. On an
   * `AlertDialog` these are the supplemental actions, such as the destructive
   * confirmation, and they follow its cancel button.
   */
  readonly actions?: DialogActions | undefined;
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"] | undefined;
  readonly "aria-details"?: AriaAttributes["aria-details"] | undefined;
  readonly "aria-label"?: AriaAttributes["aria-label"] | undefined;
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"] | undefined;
  /** Adds a backdrop blur to the scrim behind the dialog. */
  readonly blurScrim?: boolean | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly description?: ReactNode | undefined;
  /**
   * Allows dismissal by pressing the scrim. Defaults to true. Turned off on a
   * dialog without actions, it leaves Escape as the only way out, which a
   * touch screen reader cannot send, and development builds warn.
   */
  readonly dismissable?: boolean | undefined;
  /**
   * Level of the dialog title, default 2. The sections inside take the level
   * below it, and a confirmation directly inside nests below it too.
   */
  readonly headingLevel?: HeadingLevel | undefined;
  readonly id?: string | undefined;
  /** Allows dismissal with Escape. Defaults to true, for AlertDialog too. */
  readonly keyboardDismissable?: boolean | undefined;
  /**
   * Called when the user declines, with the route they took: Escape, a scrim
   * press, or the AlertDialog cancel button. Not called when an action closes
   * through `close` or when a controlled `open` changes.
   */
  readonly onCancel?: ((reason: DialogCancelReason) => void) | undefined;
  readonly style?: CSSProperties | undefined;
  readonly title: ReactNode;
  readonly width?: DialogWidth | undefined;
}

export interface AlertDialogProps extends DialogProps {
  /** Required label for the always-enabled escape action. */
  readonly cancelLabel: ReactNode;
  /**
   * Defaults to secondary. The escape action is always available, so it never
   * paints as danger.
   */
  readonly cancelVariant?:
    | Extract<ButtonVariant, "secondary" | "ghost">
    | undefined;
}

interface DialogSurfaceProps extends DialogProps {
  /**
   * Rendered before `actions`; receives the plain close, which counts as a
   * cancellation.
   */
  readonly leadingActions?: ((cancel: () => void) => ReactNode) | undefined;
  readonly role: "dialog" | "alertdialog";
}

/**
 * Warns about a dialog with no actions whose scrim does not close it. React
 * Aria renders its visually hidden dismiss button only for a dismissable
 * overlay, so Escape is then the one exit left, and a touch screen reader on a
 * helm tablet cannot send Escape.
 */
function warnNoRouteOut(
  componentName: string,
  title: ReactNode,
  keyboardDismissable: boolean,
): void {
  // Named by its title, so two such dialogs in one panel are both reported.
  const dialog = `${componentName} ${JSON.stringify(reactNodeText(title).trim())}`;
  if (keyboardDismissable) {
    warnOnce(
      `dialog-escape-only:${dialog}`,
      `${dialog} refuses the scrim and renders no actions, so Escape is its only way out, which a touch screen reader cannot send. Pass actions, or render a close control in children.`,
    );
    return;
  }
  warnOnce(
    `dialog-no-route-out:${dialog}`,
    `${dialog} refuses both the scrim and Escape and renders no actions, so the user may have no way out. Pass actions, or render a close control in children.`,
  );
}

/**
 * Sizes the dialog against the visible viewport for as long as it is mounted.
 *
 * An on-screen keyboard shrinks the visual viewport without changing the
 * layout viewport, so a dialog measured in layout units puts its actions
 * behind the keyboard on a tablet. The height is written onto the dialog
 * itself, where its own `max-height` reads it, and the stylesheet falls back
 * to `100dvh` before the first measurement.
 */
function trackVisualViewportHeight(dialog: HTMLElement): () => void {
  const ownerWindow = dialog.ownerDocument.defaultView;
  if (ownerWindow === null) return () => undefined;

  const measure = (): void => {
    const { bottom, top } = readViewportEdges(ownerWindow);
    dialog.style.setProperty(
      "--snui-visual-viewport-height",
      `${String(roundedLayoutValue(bottom - top))}px`,
    );
  };

  measure();
  return observePanelViewport(dialog, measure);
}

interface DialogFocusBackstopProps {
  readonly panelRoot: HTMLElement;
}

/**
 * Keeps focus inside the panel when a dialog closes and react-aria has
 * nowhere to put it back.
 *
 * Confirming a delete from a dialog the deleted row's own button opened
 * leaves react-aria's restore with a disconnected element and no enclosing
 * scope, which drops the reader on the document body and makes them tab in
 * from the top of the host page. That restore runs on the animation frame
 * after the dialog unmounts and skips itself unless focus is on the body, so
 * the correction waits for the frame after it and reads the same signal.
 */
function DialogFocusBackstop({ panelRoot }: DialogFocusBackstopProps): null {
  useEffect(
    () => () => {
      const ownerDocument = panelRoot.ownerDocument;
      const ownerWindow = ownerDocument.defaultView;
      ownerWindow?.requestAnimationFrame(() => {
        if (!focusIsOnBody(ownerDocument)) return;
        if (!panelRoot.isConnected) return;
        focusPanelRoot(panelRoot);
      });
    },
    [panelRoot],
  );
  return null;
}

function DialogSurface({
  actions,
  "aria-describedby": ariaDescribedBy,
  "aria-details": ariaDetails,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  blurScrim = false,
  children,
  className,
  defaultOpen,
  description,
  dismissable = true,
  headingLevel = 2,
  id,
  keyboardDismissable = true,
  leadingActions,
  onCancel,
  onOpenChange,
  open,
  ref,
  role,
  style,
  title,
  width = "standard",
}: DialogSurfaceProps): React.JSX.Element | null {
  const componentName = role === "dialog" ? "Dialog" : "AlertDialog";
  requireContent(title, `${componentName} requires a non-empty title.`);

  useModuleStyles(DIALOG_STYLES, componentName);
  const generatedId = useId();
  const panelRoot = usePanelPortalContainer(componentName);
  const parentOverlayLayer = useOverlayLayer();
  // A dialog always paints in the modal band, so the outermost one starts at
  // layer 1 even with no overlay above it.
  const dialogLayer = Math.max(1, parentOverlayLayer);
  // React Aria reports every close through onOpenChange. The flag tells a
  // close that came from an action's `close` apart from Escape, a scrim
  // press, or the cancel button, which are the cancellations.
  const closedByActionRef = useRef(false);
  // The route the user took out, read once by the close it caused. Escape is
  // recorded as the key travels up from the dialog, before react-aria closes
  // from the overlay above it, and a leading action records itself; a scrim
  // press is what remains.
  const cancelReasonRef = useRef<DialogCancelReason>("scrim");
  const dialogRef = useRef<HTMLElement | null>(null);

  const hasDescription = hasReactContent(description);
  const hasBody = hasReactContent(children);
  const descriptionId = resolveDescriptionId(generatedId, hasDescription);
  // An alert dialog asks the user to accept a consequence, so the message it
  // renders is its description when the consumer named no other one.
  const bodyId =
    role === "alertdialog" && hasBody && !hasDescription
      ? `${generatedId}-body`
      : undefined;
  const describedBy = joinIdReferences(ariaDescribedBy, descriptionId, bodyId);

  // Gated here rather than in warnOnce, because naming the dialog walks its
  // title, which a production render has no reason to pay for.
  if (
    isDevelopment() &&
    !dismissable &&
    actions === undefined &&
    leadingActions === undefined
  ) {
    warnNoRouteOut(componentName, title, keyboardDismissable);
  }

  // The listener below is attached once per mount, so the gate it reads is
  // held in a ref rather than captured when the listener was built.
  const keyboardDismissableRef = useRef(keyboardDismissable);
  useEffect(() => {
    keyboardDismissableRef.current = keyboardDismissable;
  }, [keyboardDismissable]);

  // Built once and reading only refs, so the node keeps one listener and one
  // measurement per mount.
  const onDialogAttached = useCallback((node: HTMLElement): (() => void) => {
    // react-aria closes on Escape from the overlay above the dialog and
    // reports no reason for the close, so the key is recorded here on the way
    // up. A native listener on the dialog element sees it before React
    // dispatches the synthetic event that closes, which is what makes the
    // order reliable.
    const recordEscape = (event: KeyboardEvent): void => {
      if (keyboardDismissableRef.current && event.key === "Escape") {
        cancelReasonRef.current = "escape";
      }
    };
    node.addEventListener("keydown", recordEscape);
    const stopMeasuring = trackVisualViewportHeight(node);
    return () => {
      stopMeasuring();
      node.removeEventListener("keydown", recordEscape);
    };
  }, []);

  const attachDialog = useNodeRef(dialogRef, ref, onDialogAttached);

  const scrimStyle = useMemo<CSSProperties>(
    () => ({ zIndex: overlayZIndex(dialogLayer) }),
    [dialogLayer],
  );

  const handleOpenChange = (next: boolean): void => {
    const reason = cancelReasonRef.current;
    cancelReasonRef.current = "scrim";
    if (!next && !closedByActionRef.current) onCancel?.(reason);
    closedByActionRef.current = false;
    onOpenChange?.(next);
  };

  if (panelRoot === null) return null;

  return (
    <ModalOverlay
      className={classNames("snui-scrim", blurScrim && "snui-scrim--blur")}
      isDismissable={dismissable}
      isKeyboardDismissDisabled={!keyboardDismissable}
      style={scrimStyle}
      {...overlayOpenProps({ open, defaultOpen })}
      onOpenChange={handleOpenChange}
    >
      <Modal className="snui-dialog-frame">
        <AriaDialog
          ref={attachDialog}
          role={role}
          className={classNames(
            "snui-dialog",
            `snui-dialog--${width}`,
            className,
          )}
          {...definedProps({
            "aria-describedby": describedBy,
            "aria-details": ariaDetails,
            "aria-label": ariaLabel,
            "aria-labelledby": ariaLabelledBy,
            id,
            style,
          })}
        >
          {({ close }) => {
            // The surface renders only while the dialog is open, so a flag
            // left set by a close that reported nothing, an action closing an
            // already dismissed dialog, cannot outlive this open and swallow
            // the next cancellation.
            closedByActionRef.current = false;
            const closeFromAction = (): void => {
              closedByActionRef.current = true;
              close();
            };
            const cancelFromAction = (): void => {
              cancelReasonRef.current = "cancel";
              close();
            };
            const leading = leadingActions?.(cancelFromAction);
            const resolved =
              typeof actions === "function"
                ? actions(closeFromAction)
                : actions;
            return (
              <OverlayLayerProvider value={dialogLayer + 1}>
                {/*
                  Portaled to the panel root, but React context still hands
                  the dialog the outline of the section it was opened from,
                  so the dialog starts its own below its title.
                */}
                <SectionOutlineReset level={headingLevel}>
                  <DialogFocusBackstop panelRoot={panelRoot} />
                  <Heading
                    slot="title"
                    level={headingLevel}
                    className="snui-dialog__title"
                  >
                    {title}
                  </Heading>
                  {hasDescription ? (
                    <div
                      id={descriptionId}
                      className="snui-dialog__description"
                    >
                      {description}
                    </div>
                  ) : null}
                  {hasBody ? (
                    <div id={bodyId} className="snui-dialog__body">
                      {children}
                    </div>
                  ) : null}
                  {hasReactContent(leading) || hasReactContent(resolved) ? (
                    <div className="snui-dialog__actions">
                      {leading}
                      {resolved}
                    </div>
                  ) : null}
                </SectionOutlineReset>
              </OverlayLayerProvider>
            );
          }}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogSurface {...props} role="dialog" />;
}

/**
 * A modal that interrupts for a decision. Its cancel button, Escape, and
 * (when `dismissable` is set) a scrim press all route through `onCancel`, so
 * one handler sees every way the user declined and which one it was. A scrim
 * press is ignored by default because a stray click must not discard a
 * destructive decision; Escape stays enabled because a keyboard user expects
 * it to decline.
 */
export function AlertDialog({
  cancelLabel,
  cancelVariant = "secondary",
  dismissable = false,
  ...props
}: AlertDialogProps): React.JSX.Element {
  requireContent(
    cancelLabel,
    "AlertDialog requires a non-empty cancelLabel so the user always has an explicit way out.",
  );

  return (
    <DialogSurface
      {...props}
      dismissable={dismissable}
      leadingActions={(cancel) => (
        <Button variant={cancelVariant} onClick={cancel}>
          {cancelLabel}
        </Button>
      )}
      role="alertdialog"
    />
  );
}
