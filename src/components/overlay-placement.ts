import type { Placement as RACPlacement } from "react-aria-components";

/**
 * Logical overlay edge. The "top" and "bottom" edges align the overlay's
 * start edge with the trigger's start edge, matching menu conventions; the
 * react-aria equivalents are "top start" and "bottom start". react-aria flips
 * the placement automatically when the overlay collides with the viewport.
 */
export type OverlayPlacement = "top" | "bottom" | "start" | "end";

/** The react-aria placement behind each library {@link OverlayPlacement}. */
export const OVERLAY_PLACEMENTS: Readonly<
  Record<OverlayPlacement, RACPlacement>
> = {
  bottom: "bottom start",
  end: "end",
  start: "start",
  top: "top start",
};

/** Open-state props shared by every overlay component. */
export interface OverlayOpenState {
  /** Controls the overlay when set. Wins over `defaultOpen`. */
  readonly open?: boolean | undefined;
  /** Sets the initial state only. Pass `open` to control the overlay. */
  readonly defaultOpen?: boolean | undefined;
  /** Reports open-state changes. */
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
}

/**
 * Maps the library open-state props onto the react-aria trigger props.
 * Controlled `open` becomes `isOpen`; an undefined prop is omitted entirely
 * so the trigger stays uncontrolled under exactOptionalPropertyTypes.
 */
export function overlayOpenProps({
  open,
  defaultOpen,
  onOpenChange,
}: OverlayOpenState): {
  readonly isOpen?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (isOpen: boolean) => void;
} {
  return {
    ...(open === undefined ? {} : { isOpen: open }),
    ...(defaultOpen === undefined ? {} : { defaultOpen }),
    ...(onOpenChange === undefined ? {} : { onOpenChange }),
  };
}
