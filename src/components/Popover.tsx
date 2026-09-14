import type {
  AriaAttributes,
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { DialogTrigger, Pressable } from "react-aria-components";
import { POPOVER_STYLES } from "../styles/popover.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import { classNames } from "../utils/class-names.js";
import { usePanelPortalContainerReady } from "../utils/portal.js";
import { definedProps } from "../utils/props.js";
import {
  type OverlayOpenState,
  type OverlayPlacement,
  overlayOpenProps,
} from "./overlay-placement.js";
import { OverlayPopover } from "./overlay-popover.js";

export interface PopoverProps
  extends RefAttributes<HTMLDivElement>,
    OverlayOpenState {
  /**
   * Names the popover surface, which carries `role="dialog"`. react-aria
   * forwards this and `aria-labelledby` to the surface and drops every other
   * ARIA attribute, so a description is referenced from content inside the
   * popover rather than passed here.
   */
  readonly "aria-label"?: AriaAttributes["aria-label"] | undefined;
  /** Names the popover surface from a heading elsewhere in the panel. */
  readonly "aria-labelledby"?: AriaAttributes["aria-labelledby"] | undefined;
  readonly children: ReactNode;
  readonly className?: string | undefined;
  /** DOM id of the popover surface, for `aria-controls` from the panel. */
  readonly id?: string | undefined;
  readonly placement?: OverlayPlacement | undefined;
  /** Merged with the layer and width the component sets for itself. */
  readonly style?: CSSProperties | undefined;
  /**
   * Rendered as the popover trigger. Prefer a library Button. A custom
   * trigger must render a semantic interactive element, forward its ref to
   * that element, and spread every injected event and ARIA prop onto it.
   */
  readonly trigger: ReactElement;
  /**
   * Width as a CSS length string, such as `"18rem"` or
   * `"var(--snui-content-width-standard)"`; `"auto"` (the default) sizes to
   * the content. A bare number is read as pixels and is deprecated.
   */
  readonly width?: PopoverWidth | undefined;
}

/**
 * A CSS length string, or `"auto"` to size to the content. Numbers are
 * accepted as pixels for compatibility and are deprecated.
 *
 * `"auto"` is spelled out so an editor suggests it; `string & {}` keeps every
 * other length accepted, which a bare `"auto" | string` would collapse away.
 */
export type PopoverWidth = "auto" | (string & {}) | number;

const INTERACTIVE_ROLES = new Set([
  "application",
  "button",
  "checkbox",
  "combobox",
  "gridcell",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem",
]);

const INTERACTIVE_ELEMENTS = new Set(["button", "select", "textarea"]);

function isSemanticInteractiveElement(element: HTMLElement): boolean {
  const role = element.getAttribute("role")?.trim();
  if (role !== undefined && INTERACTIVE_ROLES.has(role)) return true;
  if (INTERACTIVE_ELEMENTS.has(element.localName)) return true;
  if (element.localName === "input") {
    return (element as HTMLInputElement).type !== "hidden";
  }
  if (element.localName === "a" || element.localName === "area") {
    return element.hasAttribute("href");
  }
  if (element.localName === "summary") {
    const parent = element.parentElement;
    return (
      parent?.localName === "details" && parent.firstElementChild === element
    );
  }
  return false;
}

export function Popover({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultOpen,
  id,
  onOpenChange,
  open,
  placement = "bottom",
  ref,
  style,
  trigger,
  width = "auto",
}: PopoverProps): React.JSX.Element {
  const triggerRef = useRef<HTMLElement | null>(null);
  const validatedTrigger = useRef<HTMLElement | null>(null);
  useModuleStyles(POPOVER_STYLES, "Popover");
  const portalReady = usePanelPortalContainerReady("Popover");

  // Revalidated after every commit rather than once, because `trigger` can
  // render a different element without this component's props changing, and
  // skipped while that element is the one already checked.
  useLayoutEffect(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement === null) {
      throw new Error(
        "Popover trigger must forward its ref to a semantic interactive element.",
      );
    }
    if (triggerElement === validatedTrigger.current) return;
    if (!isSemanticInteractiveElement(triggerElement)) {
      throw new Error(
        "Popover trigger must render a semantic interactive element or an element with an interactive ARIA role.",
      );
    }
    // A trigger the keyboard cannot reach opens a popover nobody can open.
    // react-aria gives its child a tabindex of 0, so a negative one is the
    // child overriding it rather than an element that was never focusable.
    if (triggerElement.tabIndex < 0) {
      throw new Error(
        "Popover trigger must be focusable: remove the negative tabIndex, or spread the injected props onto the element.",
      );
    }
    validatedTrigger.current = triggerElement;
  });

  const surfaceStyle = useMemo<CSSProperties>(() => {
    const length = typeof width === "number" ? `${String(width)}px` : width;
    return {
      ...style,
      ...definedProps({
        "--snui-popover-width": width === "auto" ? undefined : length,
      }),
    };
  }, [style, width]);

  return (
    <DialogTrigger {...overlayOpenProps({ open, defaultOpen, onOpenChange })}>
      {/*
       * Pressable's types only admit host elements, but its runtime contract
       * is a child that forwards injected props and ref, which the library
       * Button satisfies.
       */}
      <Pressable ref={triggerRef}>
        {trigger as unknown as ComponentProps<typeof Pressable>["children"]}
      </Pressable>
      <OverlayPopover
        ref={ref}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={classNames("snui-popover", className)}
        id={id}
        placement={placement}
        ready={portalReady}
        style={surfaceStyle}
      >
        {children}
      </OverlayPopover>
    </DialogTrigger>
  );
}
