import { type ReactNode, useLayoutEffect, useReducer } from "react";
import {
  MenuTrigger,
  Pressable,
  Header as RACHeader,
  Menu as RACMenu,
  MenuItem as RACMenuItem,
  MenuSection as RACMenuSection,
  Popover as RACPopover,
  Separator as RACSeparator,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import { Button, type ButtonSize, type ButtonVariant } from "./Button.js";
import { OVERLAY_PLACEMENTS, type OverlayPlacement } from "./Popover.js";

export interface MenuProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly defaultOpen?: boolean | undefined;
  /** Visible trigger label; doubles as the menu's accessible name. */
  readonly label: ReactNode;
  readonly onAction?: ((id: string) => void) | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
  readonly placement?: OverlayPlacement | undefined;
  readonly triggerSize?: ButtonSize | undefined;
  readonly triggerVariant?: ButtonVariant | undefined;
}

export function Menu({
  children,
  className,
  defaultOpen,
  label,
  onAction,
  onOpenChange,
  open,
  placement = "bottom",
  triggerSize,
  triggerVariant,
}: MenuProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error(
      "Menu requires a non-empty label to name its trigger button.",
    );
  }

  /*
   * PanelRoot's portal container reads its root element lazily, so it is
   * null on the very first render, before refs attach. Defer the overlay
   * by one commit so RAC's PopoverInner mounts against a resolved
   * container. See Popover for details.
   */
  const [portalReady, resolvePortalContainer] = useReducer(() => true, false);
  useLayoutEffect(() => {
    resolvePortalContainer();
  }, []);

  return (
    <MenuTrigger
      {...(open === undefined ? {} : { isOpen: open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      <Pressable>
        <Button
          {...(triggerSize === undefined ? {} : { size: triggerSize })}
          {...(triggerVariant === undefined ? {} : { variant: triggerVariant })}
        >
          {label}
        </Button>
      </Pressable>
      {portalReady ? (
        <RACPopover
          className="snui-menu-popover"
          placement={OVERLAY_PLACEMENTS[placement]}
        >
          <RACMenu
            className={classNames("snui-menu", className)}
            {...(onAction === undefined
              ? {}
              : {
                  onAction: (key: string | number) => {
                    onAction(String(key));
                  },
                })}
          >
            {children}
          </RACMenu>
        </RACPopover>
      ) : null}
    </MenuTrigger>
  );
}

export interface MenuItemProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  /** Danger-tone styling for irreversible or destructive actions. */
  readonly destructive?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly id: string;
  readonly textValue?: string | undefined;
}

export function MenuItem({
  children,
  className,
  destructive = false,
  disabled = false,
  id,
  textValue,
}: MenuItemProps): React.JSX.Element {
  const resolvedTextValue =
    textValue ?? (typeof children === "string" ? children : undefined);
  return (
    <RACMenuItem
      className={classNames(
        "snui-menu__item",
        destructive && "snui-menu__item--destructive",
        className,
      )}
      id={id}
      isDisabled={disabled}
      {...(resolvedTextValue === undefined
        ? {}
        : { textValue: resolvedTextValue })}
    >
      {children}
    </RACMenuItem>
  );
}

export interface MenuSeparatorProps {
  readonly className?: string | undefined;
}

export function MenuSeparator({
  className,
}: MenuSeparatorProps): React.JSX.Element {
  return (
    <RACSeparator className={classNames("snui-menu__separator", className)} />
  );
}

export interface MenuSectionProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly title?: ReactNode | undefined;
}

export function MenuSection({
  children,
  className,
  title,
}: MenuSectionProps): React.JSX.Element {
  return (
    <RACMenuSection className={classNames("snui-menu__section", className)}>
      {title === undefined ? null : (
        <RACHeader className="snui-menu__section-header">{title}</RACHeader>
      )}
      {children}
    </RACMenuSection>
  );
}
