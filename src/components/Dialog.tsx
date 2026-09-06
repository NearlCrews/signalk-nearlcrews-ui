import {
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  type RefAttributes,
  useId,
  useRef,
} from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { OVERLAY_STYLES } from "../styles/index.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import type { HeadingLevel } from "../utils/heading.js";
import {
  OverlayLayerProvider,
  overlayZIndex,
  useOverlayLayer,
} from "../utils/overlay-layer.js";
import { usePanelPortalContainerReady } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { Button, type ButtonVariant } from "./Button.js";
import {
  type OverlayOpenState,
  overlayOpenProps,
} from "./overlay-placement.js";

export type DialogWidth = "standard" | "wide";

/**
 * The actions slot: nodes, or a function that receives `close` so an
 * uncontrolled dialog can close from its own action. Closing through `close`
 * is a completed action, so it does not call `onCancel`.
 */
export type DialogActions = ReactNode | ((close: () => void) => ReactNode);

export interface DialogProps
  extends RefAttributes<HTMLElement>,
    OverlayOpenState {
  /** Footer slot for the dialog actions, usually library Buttons. */
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
  /** Allows dismissal by pressing the scrim. Defaults to true. */
  readonly dismissable?: boolean | undefined;
  readonly headingLevel?: HeadingLevel | undefined;
  readonly id?: string | undefined;
  /** Allows dismissal with Escape. Defaults to true, for AlertDialog too. */
  readonly keyboardDismissable?: boolean | undefined;
  /**
   * Called when the user declines: Escape, a scrim press, or the AlertDialog
   * cancel button. Not called when an action closes through `close` or when a
   * controlled `open` changes.
   */
  readonly onCancel?: (() => void) | undefined;
  readonly style?: CSSProperties | undefined;
  readonly title: ReactNode;
  readonly width?: DialogWidth | undefined;
}

export interface AlertDialogProps extends DialogProps {
  /** Supplemental actions, such as the destructive confirmation. */
  readonly actions?: DialogActions | undefined;
  /** Required label for the always-enabled escape action. */
  readonly cancelLabel: ReactNode;
  /** Defaults to secondary. */
  readonly cancelVariant?: ButtonVariant | undefined;
}

interface DialogSurfaceProps extends DialogProps {
  /**
   * Rendered before `actions`; receives the plain close, which counts as a
   * cancellation.
   */
  readonly leadingActions?: ((cancel: () => void) => ReactNode) | undefined;
  readonly role: "dialog" | "alertdialog";
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
  requireContent(title, "Dialog requires a non-empty title.");

  useModuleStyles(OVERLAY_STYLES, role === "dialog" ? "Dialog" : "AlertDialog");
  const generatedId = useId();
  const portalReady = usePanelPortalContainerReady("Dialog");
  const parentOverlayLayer = useOverlayLayer();
  const dialogLayer = Math.max(1, parentOverlayLayer);
  // React Aria reports every close through onOpenChange. The flag tells a
  // close that came from an action's `close` apart from Escape, a scrim
  // press, or the cancel button, which are the cancellations.
  const closedByActionRef = useRef(false);

  const hasDescription = hasReactContent(description);
  const descriptionId = resolveDescriptionId(generatedId, hasDescription);
  const describedBy = joinIdReferences(ariaDescribedBy, descriptionId);
  const hasActions =
    leadingActions !== undefined ||
    typeof actions === "function" ||
    hasReactContent(actions);

  const handleOpenChange = (next: boolean): void => {
    if (!next && !closedByActionRef.current) onCancel?.();
    closedByActionRef.current = false;
    onOpenChange?.(next);
  };

  if (!portalReady) return null;

  return (
    <ModalOverlay
      className={classNames("snui-scrim", blurScrim && "snui-scrim--blur")}
      isDismissable={dismissable}
      isKeyboardDismissDisabled={!keyboardDismissable}
      style={{ zIndex: overlayZIndex(dialogLayer) }}
      {...overlayOpenProps({ open, defaultOpen })}
      onOpenChange={handleOpenChange}
    >
      <Modal className="snui-dialog-frame">
        <AriaDialog
          ref={ref}
          role={role}
          className={classNames(
            "snui-dialog",
            `snui-dialog--${width}`,
            className,
          )}
          {...(id === undefined ? {} : { id })}
          {...(style === undefined ? {} : { style })}
          {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
          {...(ariaLabelledBy === undefined
            ? {}
            : { "aria-labelledby": ariaLabelledBy })}
          {...(describedBy === undefined
            ? {}
            : { "aria-describedby": describedBy })}
          {...(ariaDetails === undefined
            ? {}
            : { "aria-details": ariaDetails })}
        >
          {({ close }) => {
            const closeFromAction = (): void => {
              closedByActionRef.current = true;
              close();
            };
            return (
              <OverlayLayerProvider value={dialogLayer + 1}>
                <Heading
                  slot="title"
                  level={headingLevel}
                  className="snui-dialog__title"
                >
                  {title}
                </Heading>
                {hasDescription ? (
                  <div id={descriptionId} className="snui-dialog__description">
                    {description}
                  </div>
                ) : null}
                <div className="snui-dialog__body">{children}</div>
                {hasActions ? (
                  <div className="snui-dialog__actions">
                    {leadingActions?.(close)}
                    {typeof actions === "function"
                      ? actions(closeFromAction)
                      : actions}
                  </div>
                ) : null}
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
 * one handler sees every way the user declined. A scrim press is ignored by
 * default because a stray click must not discard a destructive decision;
 * Escape stays enabled because a keyboard user expects it to decline.
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
