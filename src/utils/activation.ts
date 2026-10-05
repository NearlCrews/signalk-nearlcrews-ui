import type {
  AriaAttributes,
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";
import { hasText } from "./labels.js";
import { warnOnce } from "./warn-once.js";

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

/**
 * The key guard of a blocked control, refusing only the keys that activate it.
 * Navigation and dismissal keys must still reach the consumer, and so must any
 * key that belongs to the surrounding form rather than to the control.
 */
function refuseActivationKeys<Target>(
  activationKeys: ReadonlySet<string>,
  onKeyDown: KeyboardEventHandler<Target> | undefined,
): KeyboardEventHandler<Target> {
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
  /**
   * Whether the control itself carries `aria-disabled` while blocked. Default
   * true. A read-only group states the refusal once, as `aria-readonly` on the
   * group, so its options refuse without reading as unavailable.
   */
  readonly exposeState?: boolean | undefined;
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
 * The state and both guards travel together: a component that spreads this
 * cannot expose the state without also refusing the press.
 *
 * A natively disabled control gets no `aria-disabled`, because it already
 * exposes its state and the pair would describe the same control twice.
 */
export function blockedActivationProps<Target>({
  activationKeys = BUTTON_ACTIVATION_KEYS,
  blocked,
  disabled = false,
  exposeState = true,
  onClick,
  onKeyDown,
}: BlockedActivationOptions<Target>): BlockedActivationProps<Target> {
  if (blocked) {
    return {
      "aria-disabled": disabled || !exposeState ? undefined : true,
      onClick: refuseActivation,
      onKeyDown: refuseActivationKeys(activationKeys, onKeyDown),
    };
  }
  // The pair travels as one object, so both handlers are always present: a
  // live control with no handler of its own carries the shared no-op.
  return {
    "aria-disabled": undefined,
    onClick: onClick ?? ignoreActivation,
    onKeyDown: onKeyDown ?? ignoreActivation,
  };
}

/** What the blocked-reason check needs to know about one control. */
export interface BlockedReasonCheck {
  /** Advice appended to the message for a block that explains nothing. */
  readonly advice?: string | undefined;
  /** Whether `ariaDisabled` holds with nothing else explaining it. */
  readonly blocked: boolean;
  /** The component, as the message names it, such as "Button". */
  readonly component: string;
  /** An `aria-describedby` the caller wired, which may carry the reason. */
  readonly describedBy: string | undefined;
  /**
   * The fix the message offers for a block that explains nothing. Defaults to
   * `disabledReason` or `aria-describedby`; a control that cannot take the
   * attribute, such as an option in a list, names only what it can take.
   */
  readonly fix?: string | undefined;
  /** Whether a `disabledReason` carries content. */
  readonly hasReason: boolean;
  /** The words the control is named by, which locate it in the message. */
  readonly name: string;
  /** Whether native `disabled` is set, which drops the reason. */
  readonly nativeDisabled: boolean;
  /** What the fix calls the control, such as "button" or "box". */
  readonly noun: string;
}

/**
 * The key the blocked-without-reason warning is deduplicated under, so a
 * composite that reports its own clearer message first keeps the generic one
 * from repeating it.
 */
export function blockedWithoutReasonKey(
  component: string,
  name: string,
): string {
  return `blocked-without-reason:${component}:${name}`;
}

/** The fix a blocked control that explains nothing is offered by default. */
const DEFAULT_BLOCKED_FIX =
  "Pass disabledReason, or point aria-describedby at the text that explains it.";

/**
 * The message for a control held by `ariaDisabled` that explains nothing,
 * worded once so a composite reporting for its own parts says the same
 * thing. `subject` names the control, such as `Button "Save"`.
 */
export function blockedWithoutReasonMessage(
  subject: string,
  fix: string = DEFAULT_BLOCKED_FIX,
): string {
  return `${subject} is blocked with ariaDisabled but says nothing about why. ${fix}`;
}

/**
 * Reports, once each and in development only, the two ways a blocked
 * control's reason fails a reader: a control held by `ariaDisabled` that
 * explains nothing, where a keyboard user presses it and hears nothing
 * change, and a `disabledReason` beside native `disabled`, which takes the
 * control out of the tab order so no one reaches the reason.
 */
export function reportBlockedReason({
  advice,
  blocked,
  component,
  describedBy,
  fix,
  hasReason,
  name,
  nativeDisabled,
  noun,
}: BlockedReasonCheck): void {
  const label = JSON.stringify(name);
  if (blocked && !hasReason && !hasText(describedBy)) {
    const message = blockedWithoutReasonMessage(`${component} ${label}`, fix);
    warnOnce(
      blockedWithoutReasonKey(component, name),
      advice === undefined ? message : `${message} ${advice}`,
    );
  }
  if (nativeDisabled && hasReason) {
    warnOnce(
      `disabled-reason:${component}:${name}`,
      `${component} ${label} has a disabledReason beside native disabled, which takes it out of the tab order, so no one reaches the reason. Use ariaDisabled instead: the ${noun} stays focusable and reads the reason.`,
    );
  }
}
