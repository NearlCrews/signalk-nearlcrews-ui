import type { Ref } from "react";

/**
 * Attaches a node to a caller-supplied ref and returns the cleanup that a
 * callback ref opted into, so React 19 ref cleanup is preserved when a
 * component composes a caller ref with its own.
 */
export function attachRef<T>(
  ref: Ref<T> | undefined,
  node: T,
): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : undefined;
  }
  if (ref !== null && ref !== undefined) ref.current = node;
  return undefined;
}

/** Detaches a caller-supplied ref that did not provide its own cleanup. */
export function detachRef<T>(ref: Ref<T> | undefined): void {
  if (typeof ref === "function") ref(null);
  else if (ref !== null && ref !== undefined) ref.current = null;
}
