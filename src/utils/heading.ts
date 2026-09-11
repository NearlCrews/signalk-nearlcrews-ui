export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const HEADING_ELEMENTS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const satisfies Readonly<Record<HeadingLevel, string>>;

/**
 * The level a heading nested under one of this level takes. It stops at 6,
 * because the outline has no deeper level to name and a skipped or invented
 * one reads worse than a repeated one.
 */
export function nextHeadingLevel(level: HeadingLevel): HeadingLevel {
  return level === 6 ? 6 : ((level + 1) as HeadingLevel);
}
