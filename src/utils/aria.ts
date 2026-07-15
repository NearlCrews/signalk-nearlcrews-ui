export function joinIdReferences(
  ...ids: readonly (string | undefined)[]
): string | undefined {
  const value = ids.filter((id) => id !== undefined && id.length > 0).join(" ");
  return value.length > 0 ? value : undefined;
}
