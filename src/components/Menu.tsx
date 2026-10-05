import {
  type AriaAttributes,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useMemo,
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
import { resolveAriaDisabled } from "../utils/activation.js";
import { classNames } from "../utils/class-names.js";
import { packageError } from "../utils/errors.js";
import { hasText, resolveBundledLabel } from "../utils/labels.js";
import { MENU_ITEM_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import type { DataAttributes } from "../utils/props.js";
import { racDomProps } from "../utils/react-aria.js";
import {
  hasReactContent,
  reactNodeText,
  requireContent,
} from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import {
  Button,
  type ButtonAsButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./Button.js";
import {
  type OverlayOpenState,
  type OverlayPlacement,
  overlayOpenProps,
} from "./overlay-placement.js";
import { OverlayPopover } from "./overlay-popover.js";

/**
 * Keys React Aria's menu trigger opens on by itself, alone or with Alt,
 * beside the activation keys the Button already refuses while blocked.
 */
const MENU_OPENING_ARROWS: ReadonlySet<string> = new Set([
  "ArrowDown",
  "ArrowUp",
]);

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
  DataAttributes;

/**
 * The trigger button's own props: `iconOnly` for the square target an icon
 * trigger takes, `ariaDisabled` with its `disabledReason`, `className`, `ref`,
 * `data-*` hooks, and the rest of a library Button. The words, the accessible
 * name, the size, and the variant have their own `Menu` props, and the menu
 * owns the press, so those are left out here.
 */
export type MenuTriggerProps = Omit<
  ButtonAsButtonProps,
  "aria-label" | "as" | "children" | "href" | "onClick" | "size" | "variant"
> &
  DataAttributes;

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
  /**
   * Props for the trigger button itself, such as `iconOnly` for an overflow
   * menu or `ariaDisabled` with a `disabledReason` for one that cannot open
   * yet. A blocked or loading trigger stays focusable and opens nothing: not
   * on a press, not on Enter or Space, and not on the arrow keys a menu
   * trigger otherwise opens on.
   */
  readonly triggerProps?: MenuTriggerProps | undefined;
  readonly triggerSize?: ButtonSize | undefined;
  readonly triggerVariant?: ButtonVariant | undefined;
}

/**
 * A trigger button and its menu list. The ref and the HTML attributes belong
 * to the list (`role="menu"`), which exists while the menu is open; the
 * trigger is a library Button styled through `triggerSize`,
 * `triggerVariant`, and `triggerProps`.
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
  triggerProps,
  triggerSize,
  triggerVariant,
  ...props
}: MenuProps): React.JSX.Element {
  requireContent(
    label,
    "Menu requires a non-empty label to name its trigger button.",
  );
  if (
    triggerLabel === undefined &&
    !hasText(triggerProps?.["aria-labelledby"]) &&
    !hasText(reactNodeText(label))
  ) {
    throw packageError(
      "Menu requires a triggerLabel when its label renders no text, so the trigger button is not left unnamed.",
    );
  }

  const portalReady = useModuleStyles(MENU_STYLES, "Menu") !== null;
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

  // The Button blocks its own click and activation keys, but React Aria
  // opens the menu from pointer events the Button never sees and from the
  // arrow keys, which are not activation keys, so both are refused here too.
  // Native `disabled` is included for an engine that still delivers pointer
  // events to a disabled button.
  const triggerBlocked =
    triggerProps?.disabled === true ||
    triggerProps?.loading === true ||
    resolveAriaDisabled(
      triggerProps?.ariaDisabled,
      triggerProps?.["aria-disabled"],
    );
  const consumerKeyDownCapture = triggerProps?.onKeyDownCapture;

  return (
    <MenuTrigger {...overlayOpenProps({ open, defaultOpen, onOpenChange })}>
      <Pressable isDisabled={triggerBlocked}>
        <Button
          {...triggerProps}
          aria-label={triggerLabel}
          size={triggerSize}
          variant={triggerVariant}
          onKeyDownCapture={(event) => {
            // The menu trigger opens on an arrow only when nothing handled the
            // key first, and a capture listener runs before its bubble one, so
            // marking the key handled here keeps a blocked menu shut.
            if (triggerBlocked && MENU_OPENING_ARROWS.has(event.key)) {
              event.preventDefault();
            }
            consumerKeyDownCapture?.(event);
          }}
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
  // string keystrokes are matched against. Walking the child tree is the
  // costly half of rendering an item, and the answer changes only when the
  // children do, so opening or closing the menu walks no item again.
  const resolvedTextValue = useMemo(
    () => textValue ?? reactNodeText(children),
    [children, textValue],
  );
  const danger = tone === "danger";
  const menuItemToneLabel = resolveBundledLabel(
    toneLabel,
    usePanelLabels()?.menuItem?.tone,
    MENU_ITEM_LABEL_DEFAULTS.tone,
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
