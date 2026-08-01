import type {
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import {
  DialogTrigger,
  Pressable,
  Popover as RACPopover,
} from "react-aria-components";
import { classNames } from "../utils/class-names.js";
import { usePortalContainerReady } from "../utils/portal.js";
import type { ButtonProps } from "./Button.js";
import {
  OVERLAY_PLACEMENTS,
  type OverlayPlacement,
} from "./overlay-placement.js";

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
  const portalReady = usePortalContainerReady();

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
