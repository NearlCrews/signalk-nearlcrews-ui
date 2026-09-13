/**
 * Shared variant vocabularies used across components.
 *
 * `Density` replaces the per-component `"comfortable" | "compact"` and
 * `"default" | "compact"` unions so one panel-wide preference maps onto every
 * component without translation.
 */
export type Density = "default" | "compact";

/** Reads a density prop, falling back to the default step. */
export function resolveDensity(density: Density | undefined): Density {
  return density ?? "default";
}

/** Axis along which a group of controls is laid out. */
export type Orientation = "horizontal" | "vertical";

/**
 * Whether a label, legend, or caption is drawn. `"hidden"` keeps the text in
 * the accessible name or description and removes it from the layout, so the
 * control is still named for assistive technology.
 */
export type Visibility = "hidden" | "visible";

/**
 * The gap steps the layout primitives offer, stated once so the CSS rules and
 * the prop type cannot drift: a new step reaches both from here.
 */
export const SPACE_SCALE = [1, 2, 3, 4, 5, 6] as const;

/** One step of the shared space scale. */
export type SpaceScale = (typeof SPACE_SCALE)[number];
