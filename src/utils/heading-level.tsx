import { createValueContext } from "./context.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "./heading.js";

/*
 * The level a titled section takes when its consumer names none. `PanelShell`
 * sets it from its own title, which heads everything the shell renders by
 * construction, so the sections inside nest under the panel heading instead of
 * sitting beside it. The default is the level `Section` and
 * `CollapsibleSection` have always used, so a section outside any shell is
 * unchanged.
 */
const headingLevelContext = createValueContext<HeadingLevel>(2);

export const HeadingLevelProvider = headingLevelContext.Provider;

// Read through useResolvedHeading below rather than directly, so the level a
// surface renders at is resolved in one place.
const useHeadingLevel = headingLevelContext.useValue;

export interface ResolvedHeading {
  /** The element the surface renders its title as. */
  readonly Heading: (typeof HEADING_ELEMENTS)[HeadingLevel];
  /** The level that element sits at, for a level-derived class name. */
  readonly level: HeadingLevel;
}

/**
 * The heading a titled surface renders: the level its consumer named, else
 * the level the surrounding shell set. Resolved in one place so two surfaces
 * of the same level in one panel cannot render at different sizes.
 */
export function useResolvedHeading(
  headingLevel?: HeadingLevel,
): ResolvedHeading {
  const shellHeadingLevel = useHeadingLevel();
  const level = headingLevel ?? shellHeadingLevel;
  return { Heading: HEADING_ELEMENTS[level], level };
}
