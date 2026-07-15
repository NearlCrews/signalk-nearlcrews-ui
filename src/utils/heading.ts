export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const HEADING_ELEMENTS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const satisfies Readonly<Record<HeadingLevel, string>>;
