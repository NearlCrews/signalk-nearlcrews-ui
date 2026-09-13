import { joinList } from "./text.js";

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

/**
 * Joins ids into one space separated ARIA reference list, dropping the ones a
 * caller left unset and returning nothing for an empty list, so an attribute
 * is absent rather than blank.
 *
 * Ids are deduplicated: a caller who hands back an id the component already
 * wired would otherwise have it read twice, which repeats a validation
 * message the operator is trying to act on.
 */
export function joinIdReferences(
  ...ids: readonly (string | undefined)[]
): string | undefined {
  const unique = new Set(ids.filter((id) => id !== undefined && id.length > 0));
  const value = [...unique].join(" ");
  return value.length > 0 ? value : undefined;
}

/** Id of the description element a field renders, when it renders one. */
export function resolveDescriptionId(
  idBase: string,
  hasDescription: boolean,
): string | undefined {
  return hasDescription ? `${idBase}-description` : undefined;
}

/**
 * Requires a component the consumer must name to carry one of its naming
 * attributes, and throws with the ways this component accepts a name.
 *
 * `extraSources` names anything the component takes besides the two ARIA
 * attributes, such as a caption, and reads first in the message because it is
 * the form a consumer should reach for first.
 */
export function requireAccessibleName(
  componentName: string,
  label: string | undefined,
  labelledBy: string | undefined,
  extraSources: readonly string[] = [],
): void {
  if (hasAccessibleName(label, labelledBy)) return;

  const sources = joinList(
    [...extraSources, "aria-label", "aria-labelledby"],
    "or",
  );
  throw new Error(
    `${componentName} requires an accessible name: pass a non-empty ${sources}.`,
  );
}

/**
 * Names a landmark by its own visible title, plus whatever the consumer
 * referenced, so the landmark and the words on screen cannot drift apart. A
 * surface that is not a landmark takes no name here: it is named by its
 * heading in the ordinary way.
 */
export function landmarkLabel(
  landmark: boolean,
  ariaLabelledBy: string | undefined,
  titleId: string | undefined,
): string | undefined {
  return landmark ? joinIdReferences(ariaLabelledBy, titleId) : undefined;
}
