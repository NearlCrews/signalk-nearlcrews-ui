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
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import type { HeadingLevel } from "../utils/heading.js";
import { usePortalContainerReady } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";

export type DialogWidth = "standard" | "wide";

export interface DialogProps extends RefAttributes<HTMLElement> {
  /** Footer slot for the dialog actions, usually library Buttons. */
  readonly actions?: ReactNode;
  readonly "aria-describedby"?: AriaAttributes["aria-describedby"];
  readonly "aria-details"?: AriaAttributes["aria-details"];
  readonly "aria-label"?: AriaAttributes["aria-label"];
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"];
  /** Adds a backdrop blur to the scrim behind the dialog. */
  readonly blurScrim?: boolean;
  readonly children?: ReactNode;
  readonly className?: string;
  /** Sets the initial state only. Pass `open` to control the dialog. */
  readonly defaultOpen?: boolean;
  readonly description?: ReactNode;
  /** Allows dismissal through Escape and scrim presses. Defaults to true. */
  readonly dismissable?: boolean;
  readonly headingLevel?: HeadingLevel;
  readonly id?: string;
  readonly onOpenChange?: (open: boolean) => void;
  /** Controls the dialog when set. Wins over `defaultOpen`. */
  readonly open?: boolean;
  readonly style?: CSSProperties;
  readonly title: ReactNode;
  readonly width?: DialogWidth;
}

export type AlertDialogProps = DialogProps;

interface DialogSurfaceProps extends DialogProps {
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
  const portalReady = usePortalContainerReady();

  const hasDescription = hasReactContent(description);
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined;
  const describedBy = joinIdReferences(ariaDescribedBy, descriptionId);
  const hasActions = hasReactContent(actions);

  if (!portalReady) return null;

  return (
    <ModalOverlay
      className={classNames("snui-scrim", blurScrim && "snui-scrim--blur")}
      isDismissable={dismissable}
      isKeyboardDismissDisabled={!dismissable}
      {...(open === undefined ? {} : { isOpen: open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
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
            <div className="snui-dialog__actions">{actions}</div>
          ) : null}
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
  dismissable = false,
  ...props
}: AlertDialogProps): React.JSX.Element {
  requireContent(
    actions,

    "AlertDialog requires non-empty actions: an alert dialog must give the user an explicit way out.",
  );

  return (
    <DialogSurface
      {...props}
      actions={actions}
      dismissable={dismissable}
      role="alertdialog"
    />
  );
}
