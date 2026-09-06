/**
 * Shared variant vocabularies used across components.
 *
 * `Density` replaces the per-component `"comfortable" | "compact"` and
 * `"default" | "compact"` unions so one panel-wide preference maps onto every
 * component without translation. Components keep their previous aliases as
 * deprecated re-exports for one minor release.
 */
export type Density = "default" | "compact";

/** Axis along which a group of controls is laid out. */
export type Orientation = "horizontal" | "vertical";
