import type {
  ComponentProps,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import { useLayoutEffect, useRef } from "react";
import {
  DialogTrigger,
  Pressable,
  Popover as RACPopover,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { overlayZIndex, useOverlayLayer } from "../utils/overlay-layer.js";
import { usePanelPortalContainerReady } from "../utils/portal.js";
import {
  OVERLAY_PLACEMENTS,
  type OverlayOpenState,
  type OverlayPlacement,
  overlayOpenProps,
} from "./overlay-placement.js";

export interface PopoverProps
  extends RefAttributes<HTMLDivElement>,
    OverlayOpenState {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly placement?: OverlayPlacement | undefined;
  /**
   * Rendered as the popover trigger. Prefer a library Button. A custom
   * trigger must render a semantic interactive element, forward its ref to
   * that element, and spread every injected event and ARIA prop onto it.
   */
  readonly trigger: ReactElement;
  /** Fixed pixel width; "auto" sizes to the content. */
  readonly width?: number | "auto" | undefined;
}

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
  "separator",
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
  children,
  className,
  defaultOpen,
  onOpenChange,
  open,
  placement = "bottom",
  ref,
  trigger,
  width = "auto",
}: PopoverProps): React.JSX.Element {
  const triggerRef = useRef<HTMLElement | null>(null);
  const portalReady = usePanelPortalContainerReady("Popover");
  const overlayLayer = useOverlayLayer();

  useLayoutEffect(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement === null) {
      throw new Error(
        "Popover trigger must forward its ref to a semantic interactive element.",
      );
    }
    if (!isSemanticInteractiveElement(triggerElement)) {
      throw new Error(
        "Popover trigger must render a semantic interactive element or an element with an interactive ARIA role.",
      );
    }
  });

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
      {portalReady ? (
        <RACPopover
          ref={ref}
          className={classNames("snui-popover", className)}
          placement={OVERLAY_PLACEMENTS[placement]}
          style={{
            zIndex: overlayZIndex(overlayLayer),
            ...(width === "auto"
              ? {}
              : {
                  "--snui-popover-width": `${String(width)}px`,
                }),
          }}
        >
          {children}
        </RACPopover>
      ) : null}
    </DialogTrigger>
  );
}
