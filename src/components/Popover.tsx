import {
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useLayoutEffect,
  useReducer,
} from "react";
import {
  DialogTrigger,
  Pressable,
  type Placement as RACPlacement,
  Popover as RACPopover,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import type { ButtonProps } from "./Button.js";

/**
 * Logical overlay edge. The "top" and "bottom" edges align the overlay's
 * start edge with the trigger's start edge, matching menu conventions; the
 * RAC equivalents are "top start" and "bottom start". RAC flips the
 * placement automatically when the overlay collides with the viewport.
 */
export type OverlayPlacement = "top" | "bottom" | "start" | "end";

/** RAC placement strings behind each library {@link OverlayPlacement}. */
export const OVERLAY_PLACEMENTS: Readonly<
  Record<OverlayPlacement, RACPlacement>
> = {
  bottom: "bottom start",
  end: "end",
  start: "start",
  top: "top start",
};

export interface PopoverProps extends RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
  readonly placement?: OverlayPlacement | undefined;
  /** Rendered as the popover trigger; typically a library Button. */
  readonly trigger: ReactElement<ButtonProps>;
  /** Fixed pixel width; "auto" sizes to the content. */
  readonly width?: number | "auto" | undefined;
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
  /*
   * PanelRoot's portal container reads its root element lazily, so it is
   * null on the very first render, before refs attach. A popover that
   * mounts in that commit would mount RAC's PopoverInner before the
   * container resolves, permanently breaking RAC's role and focus effects.
   * Defer the overlay by one commit so PopoverInner always mounts against
   * a resolved container.
   */
  const [portalReady, resolvePortalContainer] = useReducer(() => true, false);
  useLayoutEffect(() => {
    resolvePortalContainer();
  }, []);

  return (
    <DialogTrigger
      {...(open === undefined ? {} : { isOpen: open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      {/*
       * Pressable's types only admit host elements, but its runtime contract
       * is a child that forwards injected props and ref, which the library
       * Button satisfies.
       */}
      <Pressable>
        {trigger as unknown as ComponentProps<typeof Pressable>["children"]}
      </Pressable>
      {portalReady ? (
        <RACPopover
          ref={ref}
          className={classNames("snui-popover", className)}
          placement={OVERLAY_PLACEMENTS[placement]}
          {...(width === "auto"
            ? {}
            : {
                style: {
                  "--snui-popover-width": `${String(width)}px`,
                } as CSSProperties,
              })}
        >
          {children}
        </RACPopover>
      ) : null}
    </DialogTrigger>
  );
}
