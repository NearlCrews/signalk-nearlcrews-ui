/** How much of a selectable set is selected. */
export type SelectAllState = "all" | "none" | "some";

/**
 * Derives the tri-state a select-all control shows from a count.
 *
 * A set with nothing selectable in it reads as `"none"`, not as `"all"`: an
 * empty set is not a completed selection, and a select-all that reported one
 * would invite a press that changes nothing.
 */
export function resolveSelectAllState(
  selectedCount: number,
  total: number,
): SelectAllState {
  if (total <= 0 || selectedCount <= 0) return "none";
  return selectedCount >= total ? "all" : "some";
}

/**
 * What pressing select-all asks for: completing a partial or empty selection,
 * and clearing a full one.
 */
export function selectAllTarget(selectedCount: number, total: number): boolean {
  return resolveSelectAllState(selectedCount, total) !== "all";
}
