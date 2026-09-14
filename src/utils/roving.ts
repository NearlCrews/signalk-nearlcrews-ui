import type { Orientation } from "./variants.js";

/**
 * The axis a key travels along, whatever the group's own orientation.
 *
 * The radio and tab patterns bind both axes, so Down moves to the next option
 * in a horizontal group too. Only the horizontal pair mirrors in a
 * right-to-left panel, which is exactly what asking the step below for a
 * vertical group expresses.
 */
const KEY_AXIS: Readonly<Record<string, Orientation>> = {
  ArrowDown: "vertical",
  ArrowLeft: "horizontal",
  ArrowRight: "horizontal",
  ArrowUp: "vertical",
};

/** The axis an arrow key travels along, or undefined for any other key. */
export function rovingKeyAxis(key: string): Orientation | undefined {
  return KEY_AXIS[key];
}

/**
 * Whether a key mirrors in a right-to-left panel. Callers ask before reading
 * the computed direction, which is the costly half of a roving step, so an
 * unrelated key press never reaches a style lookup.
 */
export function mirrorsInRtl(key: string): boolean {
  return rovingKeyAxis(key) === "horizontal";
}

/** One arrow, Home, or End press against a roving-focus group. */
export interface RovingStep {
  /** How many items the group holds. */
  readonly count: number;
  /** Index of the item the press came from, or -1 when nothing is current. */
  readonly currentIndex: number;
  /** `event.key` as the browser reported it. */
  readonly key: string;
  readonly orientation: Orientation;
  /** Whether the group reads right to left, from {@link isRightToLeft}. */
  readonly rtl: boolean;
}

/**
 * The index a roving group moves to, or null when the key belongs to someone
 * else and the event must travel on.
 *
 * The rules are the ones the tab list and the segmented control both follow:
 * the arrows that move are the ones along the group's own axis, horizontal
 * arrows mirror in a right-to-left panel while vertical arrows never do, Home
 * and End jump to the ends whatever the axis, and movement wraps. A group
 * with nothing current yet enters at the near end for the direction pressed.
 */
export function nextRovingIndex({
  count,
  currentIndex,
  key,
  orientation,
  rtl,
}: RovingStep): number | null {
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;

  const horizontal = orientation === "horizontal";
  const forwardKey = horizontal ? "ArrowRight" : "ArrowDown";
  const backwardKey = horizontal ? "ArrowLeft" : "ArrowUp";
  const mirrored = rtl && horizontal;
  let step: number;
  if (key === forwardKey) step = mirrored ? -1 : 1;
  else if (key === backwardKey) step = mirrored ? 1 : -1;
  else return null;

  if (currentIndex < 0) return step > 0 ? 0 : count - 1;
  return (currentIndex + step + count) % count;
}
