/**
 * Drops the entries whose value is `undefined`, so a prop the caller left
 * unset is absent from the element rather than present and undefined.
 *
 * The package compiles under `exactOptionalPropertyTypes`, and several React
 * Aria props treat a declared `undefined` differently from an absent one, so
 * the components spread the values they only sometimes pass. Written once
 * here, an element states its optional props in one call instead of in a run
 * of conditional spreads.
 */
export function definedProps<T extends object>(
  values: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const defined: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) defined[key] = value;
  }
  // `Partial<T>` would put `| undefined` back on every key, which is exactly
  // what the caller spread this to remove: under exactOptionalPropertyTypes a
  // `name?: string | undefined` is not assignable to React Aria's
  // `name?: string`.
  return defined as { [K in keyof T]?: Exclude<T[K], undefined> };
}
