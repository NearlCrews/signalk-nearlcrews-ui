import { createValueContext } from "./context.js";

export const { Provider: OverlayLayerProvider, useValue: useOverlayLayer } =
  createValueContext(0);

/** One z-index expression per layer, because a layer rarely changes. */
const OVERLAY_Z_INDEX = new Map<number, string>();

/**
 * The z-index an overlay paints at for its nesting layer.
 *
 * Layer zero is the plain overlay band, where a menu or a popover opened from
 * panel content sits above the host chrome and below any modal. Layer one and
 * above stack inside the modal band, one step per nesting level, so a dialog
 * covers the panel, a menu opened from that dialog covers the dialog, and a
 * dialog raised from either covers both.
 */
export function overlayZIndex(layer: number): string {
  const cached = OVERLAY_Z_INDEX.get(layer);
  if (cached !== undefined) return cached;

  const zIndex =
    layer <= 0
      ? "var(--snui-z-overlay)"
      : `calc(var(--snui-z-modal) + ${String(layer)})`;
  OVERLAY_Z_INDEX.set(layer, zIndex);
  return zIndex;
}
