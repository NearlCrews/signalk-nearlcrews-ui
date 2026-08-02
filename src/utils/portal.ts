import { useLayoutEffect, useReducer } from "react";

// The UNSAFE portal API is upstream's explicit no-stability marker, so every
// consumer reaches it through this one module: an upstream rename or removal
// touches a single file.
export {
  UNSAFE_PortalProvider,
  useUNSAFE_PortalContext,
} from "react-aria/PortalProvider";

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
