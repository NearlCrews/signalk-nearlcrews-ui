import {
  type RefObject,
  useCallback,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { focusedElement } from "../utils/focus.js";
import { useFocusWithin } from "./use-focus-within.js";

export interface FocusReturnOptions {
  /**
   * Remembers what had focus when the region opened and returns focus there
   * when nothing else names a destination. Reach for it where the region has
   * no trigger of its own, as a confirmation raised from a row does.
   */
  readonly capturePreviousFocus?: boolean | undefined;
  /**
   * Where focus goes when the region held it as it closed, usually the
   * trigger. It wins over the captured element, and it is read as the region
   * goes rather than when the region opened, so a destination the panel
   * renders in the region's place still receives focus.
   */
  readonly returnFocusRef?: RefObject<HTMLElement | null> | undefined;
}

export interface FocusReturn {
  /** Whether focus sits inside the region right now. */
  readonly holdsFocus: () => boolean;
  /**
   * Moves focus to the destination and reports whether it went there. It runs
   * whether or not the region held focus, for a caller acting on a press.
   */
  readonly returnFocus: () => boolean;
}

/**
 * Hands focus back when a region that held it closes.
 *
 * Closing a panel, a section, or a confirmation that holds focus drops the
 * reader on the document body with no route back, so the trigger takes focus
 * whatever caused the close: the trigger itself, a control inside the region,
 * or the consumer setting the open prop. A close while focus sits outside
 * moves nothing, because the user is somewhere else and being pulled back
 * would be worse than the close.
 *
 * The restore runs in a layout effect, before paint and before the tracking
 * effect's own cleanup, so the sample it reads is still the one taken while
 * the region was open.
 */
export function useFocusReturnOnClose<T extends Element>(
  nodeRef: RefObject<T | null>,
  open: boolean,
  { capturePreviousFocus = false, returnFocusRef }: FocusReturnOptions = {},
): FocusReturn {
  const holdsFocusRef = useFocusWithin(nodeRef, open);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const capturePrevious = useEffectEvent((): void => {
    const ownerDocument = nodeRef.current?.ownerDocument;
    previousFocusRef.current =
      ownerDocument === undefined ? null : focusedElement(ownerDocument);
  });

  // Captured before the region moves focus into itself, which the consumer
  // does in an effect of its own, after this one.
  useLayoutEffect(() => {
    if (!open || !capturePreviousFocus) return;
    capturePrevious();
  }, [capturePreviousFocus, open]);

  // A plain callback rather than an effect event, because the caller holds it
  // and presses it from an event handler of its own. The destination ref is
  // the only prop it reads, so its identity changes with that ref alone.
  const returnFocus = useCallback((): boolean => {
    const destination = returnFocusRef?.current ?? previousFocusRef.current;
    previousFocusRef.current = null;
    holdsFocusRef.current = false;
    if (destination?.isConnected !== true) return false;

    destination.focus();
    return true;
  }, [holdsFocusRef, returnFocusRef]);

  const restoreWhenHeld = useEffectEvent((): void => {
    if (holdsFocusRef.current) returnFocus();
  });

  useLayoutEffect(() => {
    if (open) return;
    restoreWhenHeld();
  }, [open]);

  return useMemo(
    () => ({
      holdsFocus: () => holdsFocusRef.current,
      returnFocus,
    }),
    [holdsFocusRef, returnFocus],
  );
}

/** A press waiting for the state change it asked for. */
export interface OpenIntentLatch {
  /** Records the state a press asked for. */
  readonly arm: (next: boolean) => void;
  /**
   * Whether the committed state is the one a press asked for. Consuming a
   * matching latch drops it, so one press moves focus once.
   */
  readonly consume: (committed: boolean) => boolean;
}

/**
 * Distinguishes a state change a press caused from one the consumer made on
 * its own, so opening through the trigger moves focus into the region while a
 * consumer setting the prop does not.
 *
 * A controlling owner may decline the change, which commits nothing and would
 * leave the latch armed to steal focus at the owner's next open. The commit an
 * accepted change causes lands before the microtask runs, so the latch is
 * already consumed by then and only a declined one is dropped.
 */
export function useOpenIntentLatch(): OpenIntentLatch {
  const pending = useRef<boolean | null>(null);

  return useMemo(
    () => ({
      arm: (next: boolean): void => {
        pending.current = next;
        queueMicrotask(() => {
          pending.current = null;
        });
      },
      consume: (committed: boolean): boolean => {
        const pressed = pending.current === committed;
        if (pressed) pending.current = null;
        return pressed;
      },
    }),
    [],
  );
}
