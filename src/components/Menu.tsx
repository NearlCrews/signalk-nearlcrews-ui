import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
} from "react";
import {
  MenuTrigger,
  Pressable,
  Header as RACHeader,
  Menu as RACMenu,
  MenuItem as RACMenuItem,
  type MenuItemProps as RACMenuItemProps,
  type MenuProps as RACMenuProps,
  MenuSection as RACMenuSection,
  type MenuSectionProps as RACMenuSectionProps,
  Popover as RACPopover,
  Separator as RACSeparator,
  type SeparatorProps as RACSeparatorProps,
} from "react-aria-components";
import { OVERLAY_STYLES } from "../styles/index.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { classNames } from "../utils/class-names.js";
import { overlayZIndex, useOverlayLayer } from "../utils/overlay-layer.js";
import { usePanelPortalContainerReady } from "../utils/portal.js";
import { requireContent } from "../utils/react-node.js";
import { Button, type ButtonSize, type ButtonVariant } from "./Button.js";
import {
  OVERLAY_PLACEMENTS,
  type OverlayOpenState,
  type OverlayPlacement,
  overlayOpenProps,
} from "./overlay-placement.js";

/**
 * The global events React Aria forwards to a collection element. `onClick`
 * is left out because the items and the list own press handling.
 */
type MenuElementEventName =
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onAuxClick"
  | "onContextMenu"
  | "onDoubleClick"
  | "onGotPointerCapture"
  | "onLostPointerCapture"
  | "onMouseDown"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onMouseMove"
  | "onMouseOut"
  | "onMouseOver"
  | "onMouseUp"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerMove"
  | "onPointerOut"
  | "onPointerOver"
  | "onPointerUp"
  | "onScroll"
  | "onTouchCancel"
  | "onTouchEnd"
  | "onTouchMove"
  | "onTouchStart"
  | "onTransitionEnd"
  | "onWheel";

/**
 * The HTML attributes React Aria forwards to a menu element: `style`,
 * `data-*`, the global attributes, and the global pointer, mouse, touch,
 * wheel, scroll, animation, and transition events. React Aria drops every
 * other attribute, so only what reaches the DOM is offered here. `id` is
 * the collection key on items, sections, and separators (React Aria consumes
 * it) and a DOM id on the list, so each component declares it separately.
 */
export type MenuElementAttributes<E extends HTMLElement> = Pick<
  HTMLAttributes<E>,
  | "dir"
  | "hidden"
  | "inert"
  | "lang"
  | "style"
  | "translate"
  | MenuElementEventName
> &
  Readonly<Record<`data-${string}`, string | number | boolean | undefined>>;

export interface MenuProps
  extends OverlayOpenState,
    MenuElementAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  /** DOM id of the menu list. */
  readonly id?: string | undefined;
  /** Visible trigger label; doubles as the menu's accessible name. */
  readonly label: ReactNode;
  readonly onAction?: ((id: string) => void) | undefined;
  readonly placement?: OverlayPlacement | undefined;
  readonly triggerSize?: ButtonSize | undefined;
  readonly triggerVariant?: ButtonVariant | undefined;
}

/**
 * A trigger button and its menu list. The ref and the HTML attributes belong
 * to the list (`role="menu"`), which exists while the menu is open; the
 * trigger is a library Button styled through `triggerSize` and
 * `triggerVariant`.
 */
export function Menu({
  children,
  className,
  defaultOpen,
  label,
  onAction,
  onOpenChange,
  open,
  placement = "bottom",
  ref,
  triggerSize,
  triggerVariant,
  ...props
}: MenuProps): React.JSX.Element {
  requireContent(
    label,
    "Menu requires a non-empty label to name its trigger button.",
  );

  useModuleStyles(OVERLAY_STYLES, "Menu");
  const portalReady = usePanelPortalContainerReady("Menu");
  const overlayLayer = useOverlayLayer();
  // react-aria's optional DOM props are not declared with `| undefined`,
  // which makes the target unexpressible for a React HTMLAttributes spread
  // under exactOptionalPropertyTypes. The rest props are plain DOM
  // attributes, so this boundary assertion is sound; the same holds for the
  // item, separator, and section below.
  const domProps = props as RACMenuProps<object>;

  return (
    <MenuTrigger {...overlayOpenProps({ open, defaultOpen, onOpenChange })}>
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
          style={{ zIndex: overlayZIndex(overlayLayer) }}
        >
          <RACMenu
            {...domProps}
            ref={ref}
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

interface TextBearingProps {
  readonly "aria-hidden"?: boolean | "true" | "false" | undefined;
  readonly children?: ReactNode;
  readonly hidden?: boolean | undefined;
}

/**
 * Concatenates the text a node renders, descending into element children and
 * skipping hidden and aria-hidden elements, as an accessible name would.
 * Components that render text internally contribute nothing, so an item made
 * of such components needs an explicit textValue.
 */
function reactNodeText(node: ReactNode): string {
  let text = "";
  for (const child of Children.toArray(node)) {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child);
    } else if (isValidElement<TextBearingProps>(child)) {
      const { "aria-hidden": ariaHidden, hidden } = child.props;
      if (ariaHidden === true || ariaHidden === "true" || hidden === true) {
        continue;
      }
      text += reactNodeText(child.props.children);
    }
  }
  return text;
}

export interface MenuItemProps
  extends MenuElementAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  /** Danger-tone styling for irreversible or destructive actions. */
  readonly destructive?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** Collection key reported to `onAction`; not a DOM id. */
  readonly id: string;
  /**
   * Text used for typeahead. Derived from the text inside the children when
   * omitted, including text nested in elements; children whose text comes
   * from a component's own rendering, or an icon-only item, need it set.
   */
  readonly textValue?: string | undefined;
}

export function MenuItem({
  children,
  className,
  destructive = false,
  disabled = false,
  id,
  ref,
  textValue,
  ...props
}: MenuItemProps): React.JSX.Element {
  const resolvedTextValue = textValue ?? reactNodeText(children).trim();
  const domProps = props as RACMenuItemProps;
  return (
    <RACMenuItem
      {...domProps}
      ref={ref}
      className={classNames(
        "snui-menu__item",
        destructive && "snui-menu__item--destructive",
        className,
      )}
      id={id}
      isDisabled={disabled}
      {...(resolvedTextValue === "" ? {} : { textValue: resolvedTextValue })}
    >
      {children}
    </RACMenuItem>
  );
}

export interface MenuSeparatorProps
  extends MenuElementAttributes<HTMLElement>,
    RefAttributes<HTMLElement> {
  readonly className?: string | undefined;
}

export function MenuSeparator({
  className,
  ref,
  ...props
}: MenuSeparatorProps): React.JSX.Element {
  const domProps = props as RACSeparatorProps;
  return (
    <RACSeparator
      {...domProps}
      ref={ref}
      className={classNames("snui-menu__separator", className)}
    />
  );
}

export interface MenuSectionProps
  extends MenuElementAttributes<HTMLElement>,
    RefAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly title?: ReactNode | undefined;
}

export function MenuSection({
  children,
  className,
  ref,
  title,
  ...props
}: MenuSectionProps): React.JSX.Element {
  const domProps = props as RACMenuSectionProps<object>;
  return (
    <RACMenuSection
      {...domProps}
      ref={ref}
      className={classNames("snui-menu__section", className)}
    >
      {title === undefined ? null : (
        <RACHeader className="snui-menu__section-header">{title}</RACHeader>
      )}
      {children}
    </RACMenuSection>
  );
}
