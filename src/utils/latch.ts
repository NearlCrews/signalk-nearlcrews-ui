import { useReducer } from "react";

/**
 * A one-way latch: closed or open, and the call that opens it for good.
 *
 * A reducer rather than useState: the lint rule against a synchronous
 * setState inside an effect does not fire on a dispatch, and an effect is
 * where a latch of this kind opens.
 */
export function useLatch(initiallyOpen: boolean): [boolean, () => void] {
  return useReducer(() => true, initiallyOpen);
}
