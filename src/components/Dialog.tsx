import {
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";
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

export interface DialogProps
  extends RefAttributes<HTMLElement>,
    OverlayOpenState {
  /** Footer slot for the dialog actions, usually library Buttons. */
  readonly actions?: ReactNode | undefined;
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"] | undefined;
  readonly "aria-details"?: AriaAttributes["aria-details"] | undefined;
  readonly "aria-label"?: AriaAttributes["aria-label"] | undefined;
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"] | undefined;
  /** Adds a backdrop blur to the scrim behind the dialog. */
  readonly blurScrim?: boolean | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  readonly description?: ReactNode | undefined;
  /** Allows dismissal through Escape and scrim presses. Defaults to true. */
  readonly dismissable?: boolean | undefined;
  readonly headingLevel?: HeadingLevel | undefined;
  readonly id?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly title: ReactNode;
  readonly width?: DialogWidth | undefined;
}

export interface AlertDialogProps extends Omit<DialogProps, "actions"> {
  /** Supplemental actions, such as the destructive confirmation. */
  readonly actions?: ReactNode | undefined;
  /** Required label for the always-enabled escape action. */
  readonly cancelLabel: ReactNode;
  /** Defaults to secondary. */
  readonly cancelVariant?: ButtonVariant | undefined;
  readonly onCancel?: (() => void) | undefined;
}

interface DialogSurfaceProps extends Omit<DialogProps, "actions"> {
  readonly actions?: ReactNode | ((close: () => void) => ReactNode) | undefined;
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
  onOpenChange,
  open,
  ref,
  role,
  style,
  title,
  width = "standard",
}: DialogSurfaceProps): React.JSX.Element | null {
  requireContent(title, "Dialog requires a non-empty title.");

  const generatedId = useId();
  const portalReady = usePanelPortalContainerReady("Dialog");
  const parentOverlayLayer = useOverlayLayer();
  const dialogLayer = Math.max(1, parentOverlayLayer);

  const hasDescription = hasReactContent(description);
  const descriptionId = resolveDescriptionId(generatedId, hasDescription);
  const describedBy = joinIdReferences(ariaDescribedBy, descriptionId);
  const hasActions = typeof actions === "function" || hasReactContent(actions);

  if (!portalReady) return null;

  return (
    <ModalOverlay
      className={classNames("snui-scrim", blurScrim && "snui-scrim--blur")}
      isDismissable={dismissable}
      isKeyboardDismissDisabled={!dismissable}
      style={{ zIndex: overlayZIndex(dialogLayer) }}
      {...overlayOpenProps({ open, defaultOpen, onOpenChange })}
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
          {({ close }) => (
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
                  {typeof actions === "function" ? actions(close) : actions}
                </div>
              ) : null}
            </OverlayLayerProvider>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogSurface {...props} role="dialog" />;
}

export function AlertDialog({
  actions,
  cancelLabel,
  cancelVariant = "secondary",
  dismissable = false,
  onCancel,
  ...props
}: AlertDialogProps): React.JSX.Element {
  requireContent(
    cancelLabel,
    "AlertDialog requires a non-empty cancelLabel so the user always has an explicit way out.",
  );

  return (
    <DialogSurface
      {...props}
      actions={(close) => (
        <>
          <Button
            variant={cancelVariant}
            onClick={() => {
              onCancel?.();
              close();
            }}
          >
            {cancelLabel}
          </Button>
          {actions}
        </>
      )}
      dismissable={dismissable}
      role="alertdialog"
    />
  );
}
