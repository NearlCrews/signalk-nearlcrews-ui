import {
  type AriaAttributes,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
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
  Separator as RACSeparator,
  type SeparatorProps as RACSeparatorProps,
} from "react-aria-components";
import { MENU_STYLES } from "../styles/menu.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { classNames } from "../utils/class-names.js";
import { resolveBundledLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { usePanelPortalContainerReady } from "../utils/portal.js";
import { definedProps } from "../utils/props.js";
import { racDomProps } from "../utils/react-aria.js";
import {
  hasReactContent,
  reactNodeText,
  requireContent,
} from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import { Button, type ButtonSize, type ButtonVariant } from "./Button.js";
import {
  type OverlayOpenState,
  type OverlayPlacement,
  overlayOpenProps,
} from "./overlay-placement.js";
import { OverlayPopover } from "./overlay-popover.js";

/** Default accessible name added to a destructive menu item. */
const DEFAULT_MENU_ITEM_TONE_LABEL = "Destructive action";

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
 * `data-*`, the naming attributes, the global attributes, and the global
 * pointer, mouse, touch, wheel, scroll, animation, and transition events.
 * React Aria drops every other attribute, so only what reaches the DOM is
 * offered here. `id` is the collection key on items, sections, and separators
 * (React Aria consumes it) and a DOM id on the list, so each component
 * declares it separately.
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
  Pick<AriaAttributes, "aria-label" | "aria-labelledby"> &
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
  /**
   * Accessible name for the trigger button. Required when `label` renders no
   * text of its own, an icon-only trigger being the case that needs it, and
   * otherwise left unset so the visible words are the name.
   */
  readonly triggerLabel?: string | undefined;
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
  triggerLabel,
  triggerSize,
  triggerVariant,
  ...props
}: MenuProps): React.JSX.Element {
  requireContent(
    label,
    "Menu requires a non-empty label to name its trigger button.",
  );
  if (triggerLabel === undefined && reactNodeText(label).trim() === "") {
    throw new Error(
      "Menu requires a triggerLabel when its label renders no text, so the trigger button is not left unnamed.",
    );
  }

  useModuleStyles(MENU_STYLES, "Menu");
  const portalReady = usePanelPortalContainerReady("Menu");
  const domProps = racDomProps<RACMenuProps<object>>(props);

  // React Aria's collection keys are strings or numbers; the library reports
  // the string it was given. Memoized so the collection is not handed a new
  // callback on every render of the panel around it.
  const handleAction = useCallback(
    (key: string | number) => {
      onAction?.(String(key));
    },
    [onAction],
  );

  return (
    <MenuTrigger {...overlayOpenProps({ open, defaultOpen, onOpenChange })}>
      <Pressable>
        <Button
          {...definedProps({
            "aria-label": triggerLabel,
            size: triggerSize,
            variant: triggerVariant,
          })}
        >
          {label}
        </Button>
      </Pressable>
      <OverlayPopover
        className="snui-menu-popover"
        placement={placement}
        ready={portalReady}
      >
        <RACMenu
          {...domProps}
          ref={ref}
          className={classNames("snui-menu", className)}
          {...(onAction === undefined ? {} : { onAction: handleAction })}
        >
          {children}
        </RACMenu>
      </OverlayPopover>
    </MenuTrigger>
  );
}

/**
 * The tones a menu item paints. An item is either ordinary or destructive,
 * so the shared status vocabulary narrows to those two here.
 */
export type MenuItemTone = Extract<StatusTone, "neutral" | "danger">;

export interface MenuItemProps
  extends MenuElementAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly disabled?: boolean | undefined;
  /** Collection key reported to `onAction`; not a DOM id. */
  readonly id: string;
  /**
   * Text used for typeahead. Derived from the text inside the children when
   * omitted, including text nested in elements; children whose text comes
   * from a component's own rendering need it set. An icon-only item needs it
   * as well as `aria-label`, because typeahead and the accessible name are
   * separate values.
   */
  readonly textValue?: string | undefined;
  /** `"danger"` marks an irreversible or destructive action. */
  readonly tone?: MenuItemTone | undefined;
  /**
   * Accessible name of the danger tone, announced after the item's own words
   * so the destruction is not a sighted-only cue. Defaults to "Destructive
   * action"; set it to localize.
   */
  readonly toneLabel?: string | undefined;
}

export function MenuItem({
  children,
  className,
  disabled = false,
  id,
  ref,
  textValue,
  tone,
  toneLabel,
  ...props
}: MenuItemProps): React.JSX.Element {
  // Derived from the children alone, so the tone name below never joins the
  // string keystrokes are matched against.
  const resolvedTextValue = textValue ?? reactNodeText(children).trim();
  const danger = tone === "danger";
  const menuItemToneLabel = resolveBundledLabel(
    toneLabel,
    usePanelLabels()?.menuItem?.tone,
    DEFAULT_MENU_ITEM_TONE_LABEL,
  );
  const domProps = racDomProps<RACMenuItemProps>(props);
  return (
    <RACMenuItem
      {...domProps}
      ref={ref}
      className={classNames(
        "snui-menu__item",
        danger && "snui-menu__item--destructive",
        className,
      )}
      id={id}
      isDisabled={disabled}
      {...(resolvedTextValue === "" ? {} : { textValue: resolvedTextValue })}
    >
      {children}
      {danger ? (
        // Trailing, because the accessible name reads in document order and a
        // leading qualifier would announce the tone before the action. The
        // leading space keeps the two apart in engines that concatenate the
        // name without one.
        <span className="snui-visually-hidden"> {menuItemToneLabel}.</span>
      ) : null}
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
  const domProps = racDomProps<RACSeparatorProps>(props);
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
  const domProps = racDomProps<RACMenuSectionProps<object>>(props);
  return (
    <RACMenuSection
      {...domProps}
      ref={ref}
      className={classNames("snui-menu__section", className)}
    >
      {hasReactContent(title) ? (
        <RACHeader className="snui-menu__section-header">{title}</RACHeader>
      ) : null}
      {children}
    </RACMenuSection>
  );
}
