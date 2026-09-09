/**
 * Shared variant vocabularies used across components.
 *
 * `Density` replaces the per-component `"comfortable" | "compact"` and
 * `"default" | "compact"` unions so one panel-wide preference maps onto every
 * component without translation. Components keep their previous aliases as
 * deprecated re-exports for one minor release.
 */
export type Density = "default" | "compact";

/** Normalizes a density prop, mapping the deprecated "comfortable" to "default". */
export function resolveDensity(
  density: Density | "comfortable" | undefined,
): Density {
  return density === undefined || density === "comfortable"
    ? "default"
    : density;
}

/** Axis along which a group of controls is laid out. */
export type Orientation = "horizontal" | "vertical";

/**
 * Whether a label, legend, or caption is drawn. `"hidden"` keeps the text in
 * the accessible name or description and removes it from the layout, so the
 * control is still named for assistive technology.
 */
export type Visibility = "hidden" | "visible";
