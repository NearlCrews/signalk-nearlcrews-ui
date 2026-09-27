import { type CSSProperties, type ReactNode, type Ref, useMemo } from "react";
import {
  type Placement as RACPlacement,
  Popover as RACPopover,
} from "react-aria-components";

import { overlayZIndex, useOverlayLayer } from "../utils/overlay-layer.js";
import { definedProps } from "../utils/props.js";
import type { OverlayPlacement } from "./overlay-placement.js";

/** The react-aria placement behind each library {@link OverlayPlacement}. */
const OVERLAY_PLACEMENTS: Readonly<Record<OverlayPlacement, RACPlacement>> = {
  bottom: "bottom start",
  end: "end",
  start: "start",
  top: "top start",
};

interface OverlayPopoverProps {
  /** Names the surface. react-aria forwards it to the element itself. */
  readonly "aria-label"?: string | undefined;
  /** Names the surface from elsewhere in the panel. */
  readonly "aria-labelledby"?: string | undefined;
  readonly children: ReactNode;
  readonly className: string;
  /** DOM id of the surface element. */
  readonly id?: string | undefined;
  readonly placement: OverlayPlacement;
  /**
   * Whether the owning panel root has resolved. An overlay renders nothing
   * until it has, because it would otherwise mount against an unresolved
   * portal container.
   */
  readonly ready: boolean;
  readonly ref?: Ref<HTMLDivElement> | undefined;
  /** Style entries painted beside the layer, such as a width variable. */
  readonly style?: CSSProperties | undefined;
}

/**
 * The anchored overlay surface shared by `Menu` and `Popover`: the placement
 * mapping, the layer the overlay paints in, and the readiness gate, so the
 * two components differ only in what they put on it.
 */
export function OverlayPopover({
  children,
  className,
  placement,
  ready,
  ref,
  style,
  ...surfaceProps
}: OverlayPopoverProps): React.JSX.Element | null {
  const overlayLayer = useOverlayLayer();
  const surfaceStyle = useMemo<CSSProperties>(
    () => ({ ...style, zIndex: overlayZIndex(overlayLayer) }),
    [overlayLayer, style],
  );

  if (!ready) return null;

  return (
    <RACPopover
      {...definedProps(surfaceProps)}
      ref={ref}
      className={className}
      placement={OVERLAY_PLACEMENTS[placement]}
      style={surfaceStyle}
    >
      {children}
    </RACPopover>
  );
}
