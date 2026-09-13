/**
 * The mark a control carries when it spreads the props `LabeledField` injects
 * onto a real form control.
 *
 * A field cannot see inside a composite child, so it warns rather than
 * accepting one in silence. The package's own text controls do forward the
 * props, and without a way to say so the warning would fire on every render of
 * the shipped pattern. `Symbol.for` keeps the mark readable when a host loads
 * two copies of the package, since the field and the control can then come
 * from different module graphs.
 */
const FORWARDS_FIELD_CONTROL_PROPS = Symbol.for(
  "signalk-nearlcrews-ui.forwards-field-control-props",
);

/**
 * Records that a component forwards the injected field props, and returns it.
 *
 * Only the package's own controls are marked. A consumer component is still
 * reported, because nothing here can vouch for one, and the render-prop form
 * remains the documented way to wire a composite control.
 */
export function markForwardsFieldControlProps<T extends object>(
  component: T,
): T {
  Object.defineProperty(component, FORWARDS_FIELD_CONTROL_PROPS, {
    value: true,
  });
  return component;
}

/** Whether an element type carries the forwarding mark. */
export function forwardsFieldControlProps(type: unknown): boolean {
  if (typeof type !== "function" && typeof type !== "object") return false;
  if (type === null) return false;
  return (
    (type as Record<symbol, unknown>)[FORWARDS_FIELD_CONTROL_PROPS] === true
  );
}
