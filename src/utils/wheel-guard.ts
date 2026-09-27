import type { WheelEvent } from "react";

/**
 * Drops focus from a focused number input before a wheel reaches it.
 *
 * A focused number input spins on a wheel or a trackpad, so scrolling past a
 * field at a nav station would silently rewrite a configured threshold. An
 * unfocused input never spins, so blurring it first makes the scroll safe.
 */
export function blurBeforeWheel(event: WheelEvent<HTMLInputElement>): void {
  const input = event.currentTarget;
  if (input.ownerDocument.activeElement === input) input.blur();
}
