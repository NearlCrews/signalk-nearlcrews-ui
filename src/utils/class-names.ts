/**
 * Joins class names in argument order, dropping every falsy entry so a caller
 * can write `condition && "class"` inline. Argument order is the order the
 * names appear in the attribute, which decides nothing on its own: the
 * cascade follows the stylesheet, and a consumer overriding a package class
 * raises its own specificity rather than relying on this order.
 */
export function classNames(
  ...values: readonly (string | false | null | undefined)[]
): string {
  return values.filter(Boolean).join(" ");
}
