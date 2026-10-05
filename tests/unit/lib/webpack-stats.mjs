/**
 * A module record as `webpack --json` writes one, for a file at `path` from
 * the root of a build that ran in `/plugin`.
 */
export function statsModule(path) {
  return {
    name: `./${path}`,
    nameForCondition: `/plugin/${path}`,
    type: "module",
  };
}
