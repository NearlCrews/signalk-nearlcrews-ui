import { type ReactNode, useMemo } from "react";

import { createValueContext } from "./context.js";
import {
  HEADING_ELEMENTS,
  type HeadingLevel,
  nextHeadingLevel,
} from "./heading.js";

/*
 * The level a titled section takes when its consumer names none. `PanelShell`
 * sets it from its own title, which heads everything the shell renders by
 * construction, and a titled `Dialog` or `AlertDialog` sets it from its title
 * through `SectionOutlineReset`, so the sections inside nest under that
 * heading instead of sitting beside it. The default is the level `Section`
 * and `CollapsibleSection` have always used, so a section outside any shell
 * or dialog is unchanged. It is also the base the depth of every heading is
 * measured from.
 */
const headingLevelContext = createValueContext<HeadingLevel>(2);

export const HeadingLevelProvider = headingLevelContext.Provider;

// Read through the resolvers below rather than directly, so the level a
// surface renders at is resolved in one place.
const useHeadingLevel = headingLevelContext.useValue;

/** What the nearest package section tells the content rendered inside it. */
interface SectionOutline {
  /** The level of that section's own heading. */
  readonly level: HeadingLevel;
  /** Whether a package region landmark encloses the content. */
  readonly withinLandmark: boolean;
}

/*
 * Offered by `Section`, `CollapsibleSection`, and `InlineConfirm` to what they
 * contain. It is separate from the shell's level on purpose: a section inside
 * a section still takes the shell's level unless its consumer names one,
 * because two sections in one panel are not necessarily one inside the other,
 * while a heading that is not a section, a confirmation, is contained by the
 * section around it and nests below it.
 */
const sectionOutlineContext = createValueContext<SectionOutline | null>(null);

const useSectionOutline = sectionOutlineContext.useValue;

export interface ResolvedHeading {
  /** The element the surface renders its title as. */
  readonly Heading: (typeof HEADING_ELEMENTS)[HeadingLevel];
  /**
   * How many levels the heading sits below the level the enclosing shell or
   * dialog gives its top sections, 0 for a top section and never less. Title
   * sizes follow this rather than the absolute level, so a section under a
   * titled shell or dialog reads as a top section.
   */
  readonly depth: number;
  /**
   * The level that element sits at, which a section offers the content
   * inside it.
   */
  readonly level: HeadingLevel;
}

function resolvedHeading(
  level: HeadingLevel,
  baseLevel: HeadingLevel,
): ResolvedHeading {
  return {
    Heading: HEADING_ELEMENTS[level],
    depth: Math.max(0, level - baseLevel),
    level,
  };
}

/**
 * The heading a titled section renders: the level its consumer named, else
 * the level the surrounding shell or dialog set. Resolved in one place so two
 * surfaces of the same level in one panel cannot render at different sizes.
 */
export function useResolvedHeading(
  headingLevel?: HeadingLevel,
): ResolvedHeading {
  const shellHeadingLevel = useHeadingLevel();
  return resolvedHeading(headingLevel ?? shellHeadingLevel, shellHeadingLevel);
}

/**
 * The heading a titled surface that is not a section renders, such as a
 * confirmation: the level its consumer named, else the level below the
 * section it sits in, else the level a section in the same place would take.
 * A derived level stops at 6.
 */
export function useContentHeading(
  headingLevel?: HeadingLevel,
): ResolvedHeading {
  const shellHeadingLevel = useHeadingLevel();
  const outline = useSectionOutline();
  const level =
    headingLevel ??
    (outline === null ? shellHeadingLevel : nextHeadingLevel(outline.level));
  return resolvedHeading(level, shellHeadingLevel);
}

/**
 * Whether a package region landmark already encloses this point. A section
 * nested in one defaults to no landmark of its own, because a landmark per
 * nested row crowds the list a reader navigates by.
 */
export function useWithinPackageLandmark(): boolean {
  return useSectionOutline()?.withinLandmark ?? false;
}

export interface SectionOutlineProviderProps {
  readonly children?: ReactNode | undefined;
  /** Whether the section offering the outline renders as a region landmark. */
  readonly landmark: boolean;
  /** The level of the section's own heading. */
  readonly level: HeadingLevel;
}

/**
 * Offers a section's level and landmark to what it contains. The landmark is
 * added to whatever already enclosed the section, so a section nested below a
 * landmark still reports one after a section without one intervenes.
 */
export function SectionOutlineProvider({
  children,
  landmark,
  level,
}: SectionOutlineProviderProps): React.JSX.Element {
  const enclosed = useWithinPackageLandmark();
  const withinLandmark = enclosed || landmark;
  const outline = useMemo<SectionOutline>(
    () => ({ level, withinLandmark }),
    [level, withinLandmark],
  );
  return (
    <sectionOutlineContext.Provider value={outline}>
      {children}
    </sectionOutlineContext.Provider>
  );
}

export interface SectionOutlineResetProps {
  readonly children?: ReactNode | undefined;
  /**
   * The level of the overlay's own title, when it has one. The title then
   * heads the overlay the way a shell title heads the panel: sections inside
   * take the level below it and size as top sections, and a confirmation
   * nests below it. Without one the content takes the levels a section in the
   * same place would.
   */
  readonly level?: HeadingLevel | undefined;
}

/**
 * Starts a fresh outline for an overlay's content. A dialog or popover is
 * portaled to the panel root, so it is not inside the section it was opened
 * from, even though React context says otherwise: its sections are landmarks
 * of their own, and they and its confirmations nest below the overlay's own
 * title rather than below that section or beside that title.
 */
export function SectionOutlineReset({
  children,
  level,
}: SectionOutlineResetProps): React.JSX.Element {
  const outline = useMemo<SectionOutline | null>(
    () => (level === undefined ? null : { level, withinLandmark: false }),
    [level],
  );
  const content = (
    <sectionOutlineContext.Provider value={outline}>
      {children}
    </sectionOutlineContext.Provider>
  );
  // A titled overlay sets the level its sections take, as a titled shell
  // does, which is also the base their depth is measured from.
  return level === undefined ? (
    content
  ) : (
    <HeadingLevelProvider value={nextHeadingLevel(level)}>
      {content}
    </HeadingLevelProvider>
  );
}
