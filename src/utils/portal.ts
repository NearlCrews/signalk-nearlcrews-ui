import { useLayoutEffect, useReducer } from "react";

/**
 * Defers an overlay by one commit so it mounts against a resolved portal
 * container.
 *
 * PanelRoot's portal container reads its root element lazily, so it is null on
 * the very first render, before refs attach. An overlay that mounted in that
 * commit would mount react-aria's inner overlay before the container resolves,
 * permanently breaking its role and focus effects.
 */
export function usePortalContainerReady(): boolean {
  const [ready, resolve] = useReducer(() => true, false);
  useLayoutEffect(() => {
    resolve();
  }, []);
  return ready;
}
