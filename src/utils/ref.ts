import type { Ref } from "react";

/**
 * Attaches a node to a caller-supplied ref and returns the cleanup that a
 * callback ref opted into, so React 19 ref cleanup is preserved when a
 * component composes a caller ref with its own.
 */
function attachRef<T>(
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
function detachRef<T>(ref: Ref<T> | undefined): void {
  if (typeof ref === "function") ref(null);
  else if (ref !== null && ref !== undefined) ref.current = null;
}

/**
 * Attaches a caller-supplied ref and returns the one cleanup that releases it,
 * preferring the callback ref's own cleanup when it opted into React 19 ref
 * cleanup. Use this wherever a component owns the node for a whole mount.
 */
export function composeRef<T>(ref: Ref<T> | undefined, node: T): () => void {
  const release = attachRef(ref, node);
  return () => {
    if (release !== undefined) release();
    else detachRef(ref);
  };
}
