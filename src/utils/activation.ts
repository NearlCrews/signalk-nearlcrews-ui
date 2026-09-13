import type {
  AriaAttributes,
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
 *
 * A live control is handed its own handler back rather than a wrapper, because
 * the wrapper would be a new function on every render and the consumer's
 * handler is often already stable.
 */

/**
 * Refuses an event outright. A blocked control never runs the consumer's
 * handler, so one shared function serves every control and every render.
 */
function refuseActivation(event: {
  preventDefault: () => void;
  stopPropagation: () => void;
}): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Accepts an event and does nothing with it, for a live control whose caller
 * supplied no handler of its own. Keeping a handler in place matters for a
 * change listener, because React treats a checked input with no `onChange` as
 * an uncontrolled one and warns about it.
 */
function ignoreActivation(): void {
  // Deliberately empty: the control is live and the caller wants no callback.
}

/** Withholds a click and its handler while the control is blocked. */
function blockClick<Target>(
  blocked: boolean,
  onClick: MouseEventHandler<Target> | undefined,
): MouseEventHandler<Target> | undefined {
  return blocked ? refuseActivation : onClick;
}

/**
 * The same guard for keys, blocking only the ones that activate this control.
 * Navigation and dismissal keys must still reach the consumer, and so must any
 * key that belongs to the surrounding form rather than to the control.
 */
function blockActivationKeys<Target>(
  blocked: boolean,
  activationKeys: ReadonlySet<string>,
  onKeyDown: KeyboardEventHandler<Target> | undefined,
): KeyboardEventHandler<Target> | undefined {
  if (!blocked) return onKeyDown;
  return (event) => {
    if (activationKeys.has(event.key)) {
      refuseActivation(event);
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
export function blockChange<Target>(
  blocked: boolean,
  onChange: ChangeEventHandler<Target> | undefined,
): ChangeEventHandler<Target> | undefined {
  return blocked ? ignoreActivation : onChange;
}

/** Keys that activate a button, and so the ones a blocked button withholds. */
export const BUTTON_ACTIVATION_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  " ",
  "Spacebar",
]);

/**
 * Keys that toggle a checkbox. Enter is not one of them: it submits the
 * surrounding form, which is the form's business rather than the box's.
 */
export const CHECKBOX_ACTIVATION_KEYS: ReadonlySet<string> = new Set([
  " ",
  "Spacebar",
]);

/**
 * Resolves whether a control is held inoperable through `aria-disabled`.
 *
 * The camelCase prop is the documented spelling, so when it is set it decides;
 * the native attribute, which a consumer may spread from its own props, only
 * counts while the prop is absent. The attribute has a string form as well as
 * a boolean one, and both mean the same thing.
 */
export function resolveAriaDisabled(
  prop: boolean | undefined,
  attribute: AriaAttributes["aria-disabled"],
): boolean {
  return prop ?? (attribute === true || attribute === "true");
}

export interface BlockedActivationOptions<Target> {
  /** Keys that activate this control. Defaults to the button keys. */
  readonly activationKeys?: ReadonlySet<string> | undefined;
  /** Whether the control must refuse activation while staying focusable. */
  readonly blocked: boolean;
  /** Whether the control also carries the native `disabled` attribute. */
  readonly disabled?: boolean | undefined;
  readonly onClick?: MouseEventHandler<Target> | undefined;
  readonly onKeyDown?: KeyboardEventHandler<Target> | undefined;
}

export interface BlockedActivationProps<Target> {
  readonly "aria-disabled": true | undefined;
  readonly onClick: MouseEventHandler<Target>;
  readonly onKeyDown: KeyboardEventHandler<Target>;
}

/**
 * The full refusal for a control that must stay where the user is standing.
 *
 * Every control that can be held unchangeable offers a way to do it without
 * leaving the tab order, because setting native `disabled` on the control the
 * user is standing on destroys their focus and drops them on the body. Staying
 * focusable means the platform no longer blocks activation, so the state and
 * both guards travel together: a component that spreads this cannot expose the
 * state without also refusing the press.
 *
 * A natively disabled control gets no `aria-disabled`, because it already
 * exposes its state and the pair would describe the same control twice.
 */
export function blockedActivationProps<Target>({
  activationKeys = BUTTON_ACTIVATION_KEYS,
  blocked,
  disabled = false,
  onClick,
  onKeyDown,
}: BlockedActivationOptions<Target>): BlockedActivationProps<Target> {
  return {
    "aria-disabled": blocked && !disabled ? true : undefined,
    // The pair travels as one object, so both handlers are always present: a
    // live control with no handler of its own carries the shared no-op.
    onClick: blockClick(blocked, onClick) ?? ignoreActivation,
    onKeyDown:
      blockActivationKeys(blocked, activationKeys, onKeyDown) ??
      ignoreActivation,
  };
}
