import { type RefObject, useEffect, useRef } from "react";

/**
 * Tracks whether focus sits inside a node, sampled as focus moves rather than
 * read when the answer is needed.
 *
 * Hiding, unmounting, or collapsing a region blurs whatever it held first, so
 * by the time a cleanup or a close could look at `activeElement` the answer is
 * already gone. The flag is seeded when tracking starts and updated from one
 * document-level `focusin` listener, whose composed path also reports focus
 * that landed inside a shadow root.
 *
 * The flag is not cleared when tracking stops, because the close that stops it
 * is exactly the moment a caller reads it. Whoever acts on it clears it.
 */
export function useFocusWithin<T extends Element>(
  nodeRef: RefObject<T | null>,
  active = true,
): RefObject<boolean> {
  const holdsFocus = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    const ownerDocument = node?.ownerDocument;
    if (!active || node === null || ownerDocument === undefined) {
      return undefined;
    }

    holdsFocus.current = node.contains(ownerDocument.activeElement);
    const trackFocus = (event: FocusEvent): void => {
      holdsFocus.current = event.composedPath().includes(node);
    };
    ownerDocument.addEventListener("focusin", trackFocus);
    return () => {
      ownerDocument.removeEventListener("focusin", trackFocus);
    };
  }, [active, nodeRef]);

  return holdsFocus;
}
