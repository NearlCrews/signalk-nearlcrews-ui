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

const WHITESPACE = /\s/;

/**
 * Requires an id a consumer supplied to be usable as an ARIA reference, and
 * reports it back. `aria-controls` and `aria-labelledby` hold space separated
 * lists, so an id carrying a space points at two ids that exist nowhere and
 * the relationship disappears without a word.
 */
export function requireIdToken(id: string, option: string): string {
  if (id.length === 0 || WHITESPACE.test(id)) {
    throw new Error(
      `${option} must be a non-empty string holding no whitespace; received "${id}".`,
    );
  }
  return id;
}

export function joinIdReferences(
  ...ids: readonly (string | undefined)[]
): string | undefined {
  const value = ids.filter((id) => id !== undefined && id.length > 0).join(" ");
  return value.length > 0 ? value : undefined;
}

/** Id of the description element a field renders, when it renders one. */
export function resolveDescriptionId(
  idBase: string,
  hasDescription: boolean,
): string | undefined {
  return hasDescription ? `${idBase}-description` : undefined;
}
