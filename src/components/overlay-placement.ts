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
