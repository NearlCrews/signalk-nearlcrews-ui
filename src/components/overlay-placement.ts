import type { Placement as RACPlacement } from "react-aria-components";

import { definedProps } from "../utils/props.js";

/**
 * Logical overlay edge. The "top" and "bottom" edges align the overlay's
 * start edge with the trigger's start edge, matching menu conventions; the
 * react-aria equivalents are "top start" and "bottom start". The "start" and
 * "end" edges place the overlay beside the trigger and centre it on the cross
 * axis, which is the convention for a side-anchored overlay and is what a
 * react-aria placement with no cross alignment does. react-aria flips the
 * placement automatically when the overlay collides with the viewport.
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
  /** Sets the initial state only. Pass `open` to control the overlay. */
  readonly defaultOpen?: boolean | undefined;
  /** Reports open-state changes. */
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  /** Controls the overlay when set. Wins over `defaultOpen`. */
  readonly open?: boolean | undefined;
}

/** The react-aria trigger props the library open state maps onto. */
interface OverlayTriggerOpenProps {
  readonly defaultOpen?: boolean;
  readonly isOpen?: boolean;
  readonly onOpenChange?: (isOpen: boolean) => void;
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
}: OverlayOpenState): OverlayTriggerOpenProps {
  // `definedProps` drops what the caller left unset, and drops the `undefined`
  // from the type with it: react-aria reads an explicit undefined as a
  // controlled prop rather than an absent one.
  return definedProps({
    defaultOpen,
    isOpen: open,
    onOpenChange,
  });
}
