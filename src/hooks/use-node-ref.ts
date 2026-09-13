import { type Ref, type RefObject, useCallback, useLayoutEffect } from "react";

import { composeRef } from "../utils/ref.js";

/**
 * One callback ref that owns a node for a whole mount.
 *
 * It stores the node where the component's own effects read it, attaches the
 * caller's ref through {@link composeRef}, and runs an optional attachment
 * whose cleanup it releases in the right order. React 19 runs the returned
 * cleanup when the callback's identity changes, so the callback is memoized:
 * a component that built it inline would detach and reattach the node, and
 * every listener on it, on every commit.
 *
 * `onAttach` therefore has to be stable too. Give it a `useCallback` or an
 * effect event, or read changing values through refs, as the controls that
 * resync themselves after a form reset do.
 */
export function useNodeRef<T>(
  nodeRef: RefObject<T | null>,
  ref: Ref<T> | undefined,
  onAttach?: (node: T) => (() => void) | undefined,
): (node: T) => () => void {
  return useCallback(
    (node: T): (() => void) => {
      nodeRef.current = node;
      const releaseRef = composeRef(ref, node);
      const releaseAttachment = onAttach?.(node);
      return () => {
        releaseAttachment?.();
        nodeRef.current = null;
        releaseRef();
      };
    },
    [nodeRef, onAttach, ref],
  );
}

/**
 * Attaches the caller's ref to a node the component already owns, in a layout
 * effect.
 *
 * This is the other half of the pattern above, for a component whose node ref
 * is attached by React itself or by a callback that must not be rebuilt when
 * the caller swaps its ref. The composition keeps the commit-phase timing an
 * imperative handle had, and swapping the ref re-runs nothing else.
 */
export function useComposedRef<T>(
  nodeRef: RefObject<T | null>,
  ref: Ref<T> | undefined,
): void {
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (node === null) return undefined;

    return composeRef(ref, node);
  }, [nodeRef, ref]);
}
