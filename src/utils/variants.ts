/**
 * Shared variant vocabularies used across components.
 *
 * `Density` replaces the per-component `"comfortable" | "compact"` and
 * `"default" | "compact"` unions so one panel-wide preference maps onto every
 * component without translation. Components keep their previous aliases as
 * deprecated re-exports for one minor release.
 */
export type Density = "default" | "compact";

/**
 * The density vocabulary before `Density` existed. "comfortable" is the old
 * name for "default" and is still accepted at runtime.
 *
 * @deprecated Use {@link Density}; "comfortable" maps to "default".
 */
export type LegacyDensity = Density | "comfortable";

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
