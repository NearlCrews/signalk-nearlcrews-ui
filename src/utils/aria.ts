/**
 * Reports whether either naming attribute carries text. Blank strings do not
 * name a control, so they read the same as an absent attribute.
 */
export function hasAccessibleName(
  label: string | undefined,
  labelledBy: string | undefined,
): boolean {
  return (label?.trim() ?? "") !== "" || (labelledBy?.trim() ?? "") !== "";
}

export function joinIdReferences(
  ...ids: readonly (string | undefined)[]
): string | undefined {
  const value = ids.filter((id) => id !== undefined && id.length > 0).join(" ");
  return value.length > 0 ? value : undefined;
}
