/** The one field an options array is validated on. */
interface IdentifiedOption<Value extends string> {
  readonly value: Value;
}

/**
 * Requires an options array a consumer supplied to be usable as a choice set.
 *
 * An empty array renders a control with nothing to choose, and a repeated
 * value makes two options indistinguishable to every caller that reads the
 * selection back, so both are caller errors rather than states to render.
 */
export function requireNonEmptyUniqueOptions<Value extends string>(
  options: readonly IdentifiedOption<Value>[],
  componentName: string,
): void {
  if (options.length === 0) {
    throw new Error(`${componentName} requires at least one option.`);
  }
  const seen = new Set<Value>();
  for (const option of options) {
    if (seen.has(option.value)) {
      throw new Error(
        `${componentName} option values must be unique; received duplicate value "${option.value}".`,
      );
    }
    seen.add(option.value);
  }
}
