/**
 * Color helpers for the specs that measure token values, with no test runner
 * imported, so the unit suites and the browser specs share them.
 */

/** The brightest green or blue channel Night lets a color carry. */
export const NIGHT_CHANNEL_CAP = 0x40;

/** The red, green, and blue channels of a `#rrggbb` color. */
export function hexChannels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16),
  );
  return [red, green, blue];
}
