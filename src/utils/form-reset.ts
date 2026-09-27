/** A control that participates in its form, whether or not it has one. */
interface FormAssociated {
  readonly form: HTMLFormElement | null;
  readonly isConnected: boolean;
}

/**
 * Runs `run` on the next microtask, after the platform or React has finished
 * rewriting the node, and skips it for a node that left the document in the
 * meantime, since nothing it did there could reach the user.
 */
export function afterMicrotaskIfConnected<
  T extends { readonly isConnected: boolean },
>(node: T, run: (node: T) => void): void {
  queueMicrotask(() => {
    if (node.isConnected) run(node);
  });
}

/**
 * Runs `onReset` after the control's own form has been reset, and returns the
 * unsubscribe.
 *
 * The work waits a microtask because a native reset restores `defaultValue`
 * and `defaultChecked` only once the reset event has finished dispatching, so
 * a listener reading the control during the event still sees the old value. A
 * control that left the document in the meantime is skipped, since nothing it
 * reports could reach the user. A control with no form registers nothing and
 * hands back a release that does nothing.
 */
export function observeFormReset<T extends FormAssociated>(
  node: T,
  onReset: (node: T) => void,
): () => void {
  const { form } = node;
  if (form === null) {
    return () => {
      // Nothing was registered, so nothing has to be released.
    };
  }

  const handleReset = (): void => {
    afterMicrotaskIfConnected(node, onReset);
  };
  form.addEventListener("reset", handleReset);
  return () => {
    form.removeEventListener("reset", handleReset);
  };
}
