import {
  type Ref,
  type RefObject,
  useEffectEvent,
  useLayoutEffect,
  useRef,
} from "react";

import { type FormAssociated, observeFormReset } from "../utils/form-reset.js";
import { useComposedRef } from "./use-node-ref.js";

/**
 * Owns a form-associated node for a whole mount and puts it back after its
 * own form has been reset.
 *
 * A native reset restores a control from its `value` and `checked` content
 * attributes, and a select from its options' `selected` ones, which a
 * React-controlled control does not carry, and React neither re-renders nor
 * fires a change afterwards, so each control says here how to restore itself.
 * The resync is an effect event, so it reads current props without
 * registering again. The caller's own ref is composed separately, in a layout
 * effect, so an ordinary inline consumer ref does not detach the listener on
 * every commit.
 *
 * The registration resolves the node's own form, so `key` is a change signal
 * rather than a value read here: pass whatever decides which form the node
 * belongs to, or whether it exists at all, and the hook registers again when
 * it changes. A control passes its `form` attribute.
 */
export function useResettableControl<Control extends FormAssociated>(
  ref: Ref<Control> | undefined,
  key: string | undefined,
  onReset: (node: Control) => void,
): RefObject<Control | null> {
  const nodeRef = useRef<Control | null>(null);
  useComposedRef(nodeRef, ref);
  const resync = useEffectEvent(onReset);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (node === null) return undefined;

    return observeFormReset(node, resync);
  }, [key]);

  return nodeRef;
}
