/**
 * The one assertion at the React Aria DOM-prop boundary.
 *
 * React Aria's optional DOM props are not declared with `| undefined`, which
 * makes the target unexpressible for a React `HTMLAttributes` spread under
 * `exactOptionalPropertyTypes`. The props being handed over are plain DOM
 * attributes the component collected from its own rest props, so the
 * assertion is sound. Naming it here keeps the reasoning in one place and
 * makes every site that relies on it greppable.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the rule's remedy, an assertion at each call site, is the duplication this single named boundary exists to prevent.
export function racDomProps<T>(props: object): T {
  return props as T;
}
