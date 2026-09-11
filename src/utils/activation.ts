import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

/*
 * Event guards for a control held inoperable through `aria-disabled` rather
 * than through the native `disabled` attribute.
 *
 * Such a control stays focusable and in the tab order, which is the whole
 * point: a native `disabled` set on the control the user is standing on
 * destroys their focus and drops them on the body. Staying focusable means the
 * platform no longer blocks activation, so the component blocks it here
 * instead, on every route the control can be operated by.
 */

/** Withholds a click and its handler while the control is blocked. */
export function blockClick<Element>(
  blocked: boolean,
  onClick: MouseEventHandler<Element> | undefined,
): MouseEventHandler<Element> {
  return (event) => {
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };
}

/**
 * The same guard for keys, blocking only the ones that activate this control.
 * Navigation and dismissal keys must still reach the consumer, and so must any
 * key that belongs to the surrounding form rather than to the control.
 */
export function blockActivationKeys<Element>(
  blocked: boolean,
  activationKeys: ReadonlySet<string>,
  onKeyDown: KeyboardEventHandler<Element> | undefined,
): KeyboardEventHandler<Element> {
  return (event) => {
    if (blocked && activationKeys.has(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKeyDown?.(event);
  };
}

/**
 * Withholds a change and its handler while the control is blocked.
 *
 * Canceling the click reverts the checkedness the browser applied, but React
 * derives a checkbox's `onChange` from that same click, and it has already
 * extracted the change event by the time any handler runs. So the DOM is
 * restored by the click guard and the callback is withheld here. The change
 * event itself is not canceled: it is not cancelable, and stopping its
 * propagation would hide it from a surrounding form.
 */
export function blockChange<Element>(
  blocked: boolean,
  onChange: ChangeEventHandler<Element> | undefined,
): ChangeEventHandler<Element> {
  return (event) => {
    if (blocked) return;
    onChange?.(event);
  };
}
