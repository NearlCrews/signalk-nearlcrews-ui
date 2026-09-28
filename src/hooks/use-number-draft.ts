import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { isDevelopment } from "../utils/environment.js";
import { warnOnce } from "../utils/warn-once.js";
import { blurBeforeWheel } from "../utils/wheel-guard.js";
import { useDraftResetScope } from "./use-reset-drafts.js";

/** Why a draft cannot be committed. Keys the per-reason validation messages. */
export type NumberDraftInvalidReason =
  | "empty"
  | "notANumber"
  | "notAnInteger"
  | "belowMin"
  | "aboveMax";

/**
 * Rules that turn a typed string into a number.
 *
 * Two modes fall out of `fallback`. Without it the draft is validated: an
 * empty, unparsable, fractional (under `integer`), or out-of-range draft is
 * reported as invalid and nothing is committed until the user fixes it. With
 * `fallback` the draft is clamped: empty or unparsable input commits the
 * fallback, fractions truncate under `integer`, values snap to `step`, and
 * out-of-range values clamp to the nearest bound, so every keystroke commits
 * a number.
 */
export interface NumberDraftOptions {
  /** An empty draft commits `undefined` instead of being invalid or falling back. */
  readonly allowEmpty?: boolean | undefined;
  /** Treats `max` itself as out of range. Does nothing without `max`. */
  readonly exclusiveMax?: boolean | undefined;
  /** Treats `min` itself as out of range. Does nothing without `min`. */
  readonly exclusiveMin?: boolean | undefined;
  /**
   * Switches to clamp mode; the value committed for empty or unparsable
   * input. It has to satisfy the field's own rules, since it is committed
   * without being checked against them; in development a fallback that does
   * not is reported once.
   */
  readonly fallback?: number | undefined;
  /** Accepts whole numbers only. */
  readonly integer?: boolean | undefined;
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  /**
   * Spinner increment passed to the input. In clamp mode committed values
   * also snap to a multiple of it, counted from `min` where there is one, as
   * the input's own step constraint counts.
   *
   * In validate mode it is not enforced: a half-typed value is never rejected
   * mid-edit, there is no step reason among the invalid ones, and the
   * browser's own spinner and validity state carry the constraint instead.
   */
  readonly step?: number | undefined;
}

export type NumberDraftResolution =
  | { readonly status: "valid"; readonly value: number | undefined }
  | { readonly status: "invalid"; readonly reason: NumberDraftInvalidReason };

function valid(value: number | undefined): NumberDraftResolution {
  // Negative zero is collapsed here, where every committed value passes,
  // because String(-0) is "0": the field would otherwise report a number its
  // own display disagrees with as soon as the draft clears.
  return { status: "valid", value: value === 0 ? 0 : value };
}

function invalid(reason: NumberDraftInvalidReason): NumberDraftResolution {
  return { status: "invalid", reason };
}

/**
 * The HTML valid floating-point number grammar, which is exactly what an
 * `<input type="number">` accepts. `Number` also reads hex, octal, and binary
 * literals, and a field that took "0x10" for 16 would accept text no numeric
 * input can produce and no message could explain.
 */
const FLOATING_POINT = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function decimalPlaces(value: number): number {
  const text = String(value);
  // Below 1e-6 a number prints in exponential notation, where the digits
  // after the point are only part of the count and the exponent carries the
  // rest.
  const exponentAt = text.indexOf("e");
  const mantissa = exponentAt === -1 ? text : text.slice(0, exponentAt);
  const exponent = exponentAt === -1 ? 0 : Number(text.slice(exponentAt + 1));
  const [, fraction = ""] = mantissa.split(".");
  // toFixed rejects more than 100 places, and no field offers a step that
  // fine.
  return Math.min(100, Math.max(0, fraction.length - exponent));
}

/** How many steps a value sits from the base, free of binary noise. */
function stepsFromBase(value: number, step: number, base: number): number {
  // (0.3 - 0) / 0.1 is 2.9999999999999996, which floors one whole step too
  // low, so the quotient is rounded to a precision no real step reaches.
  return Number(((value - base) / step).toFixed(10));
}

function roundToStepPrecision(
  value: number,
  step: number,
  base: number,
): number {
  // Rounding to the precision the base and the step carry between them
  // removes the binary noise a multiplication such as 0.1 * 3 leaves behind.
  const places = Math.max(decimalPlaces(step), decimalPlaces(base));
  return Number(value.toFixed(places));
}

function snapToStep(value: number, step: number, base: number): number {
  const snapped = base + Math.round(stepsFromBase(value, step, base)) * step;
  return roundToStepPrecision(snapped, step, base);
}

/** The nearest multiple of the step at or below a value. */
function snapDownToStep(value: number, step: number, base: number): number {
  const snapped = base + Math.floor(stepsFromBase(value, step, base)) * step;
  return roundToStepPrecision(snapped, step, base);
}

/**
 * Whether a value breaks a minimum: it falls below the bound, or lands on it
 * when the bound is exclusive.
 */
function breaksMin(value: number, min: number, exclusive: boolean): boolean {
  return exclusive ? value <= min : value < min;
}

/** The same test against a maximum. */
function breaksMax(value: number, max: number, exclusive: boolean): boolean {
  return exclusive ? value >= max : value > max;
}

/** Reports one rules mistake once, in development only. */
function warnRules(message: string): void {
  warnOnce(`number-draft-rules:${message}`, `resolveNumberDraft: ${message}`);
}

/**
 * Reports rules that cannot do what they say: an exclusivity flag with no
 * bound to apply to, and a fallback the same rules would reject. Both compile
 * and both fail silently at runtime, so development says so once.
 */
function warnUnsoundRules(
  options: NumberDraftOptions,
  stepSize: number | undefined,
  stepBase: number,
): void {
  const {
    exclusiveMax = false,
    exclusiveMin = false,
    fallback,
    integer = false,
    max,
    min,
  } = options;
  if (exclusiveMin && min === undefined) {
    warnRules("exclusiveMin does nothing without a min.");
  }
  if (exclusiveMax && max === undefined) {
    warnRules("exclusiveMax does nothing without a max.");
  }
  if (fallback === undefined) return;

  const rejects =
    (integer && !Number.isInteger(fallback)) ||
    (min !== undefined && breaksMin(fallback, min, exclusiveMin)) ||
    (max !== undefined && breaksMax(fallback, max, exclusiveMax)) ||
    (stepSize !== undefined &&
      snapToStep(fallback, stepSize, stepBase) !== fallback);
  if (rejects) {
    warnRules(
      `the fallback ${String(fallback)} does not satisfy the same rules, so a draft that falls back commits a value the field itself rejects.`,
    );
  }
}

/**
 * Resolves what a typed draft commits, if anything. Pure, so the parsing
 * and clamping rules can be exercised without a renderer.
 */
export function resolveNumberDraft(
  raw: string,
  options: NumberDraftOptions = {},
): NumberDraftResolution {
  const {
    allowEmpty = false,
    exclusiveMax = false,
    exclusiveMin = false,
    fallback,
    integer = false,
    max,
    min,
    step,
  } = options;
  const clamps = fallback !== undefined;
  // HTML measures step validity from a step base, which is `min` when the
  // input has one. Snapping from anywhere else commits values the input
  // itself reports as a step mismatch.
  const stepBase = min !== undefined && Number.isFinite(min) ? min : 0;
  const stepSize = clamps && step !== undefined && step > 0 ? step : undefined;
  if (isDevelopment()) warnUnsoundRules(options, stepSize, stepBase);
  const trimmed = raw.trim();

  if (trimmed === "") {
    if (allowEmpty) return valid(undefined);
    return clamps ? valid(fallback) : invalid("empty");
  }

  const parsed = FLOATING_POINT.test(trimmed) ? Number(trimmed) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return clamps ? valid(fallback) : invalid("notANumber");
  }

  let value = parsed;
  if (integer && !Number.isInteger(value)) {
    if (!clamps) return invalid("notAnInteger");
    value = Math.trunc(value);
  }
  if (stepSize !== undefined) {
    value = snapToStep(value, stepSize, stepBase);
  }

  if (min !== undefined && breaksMin(value, min, exclusiveMin)) {
    if (!clamps) return invalid("belowMin");
    // An exclusive bound has no nearest legal value to clamp to.
    if (exclusiveMin) return valid(fallback);
    // `min` is the step base, so clamping onto it is always step aligned.
    value = min;
  }
  if (max !== undefined && breaksMax(value, max, exclusiveMax)) {
    if (!clamps) return invalid("aboveMax");
    if (exclusiveMax) return valid(fallback);
    // A max that is not itself a multiple of the step would reintroduce the
    // mismatch the snap above avoided, so the value steps back inside the
    // range rather than landing on the bound.
    value =
      stepSize === undefined ? max : snapDownToStep(max, stepSize, stepBase);
    if (min !== undefined && breaksMin(value, min, exclusiveMin)) {
      // The bounds are closer together than one step, so nothing inside the
      // range is step aligned and only the fallback is left.
      return valid(fallback);
    }
  }
  return valid(value);
}

/** Attributes and handlers to spread onto a `NumberInput`. */
export interface NumberDraftInputProps {
  readonly "aria-invalid": true | undefined;
  /** Labels the key that commits the draft on an on-screen keyboard. */
  readonly enterKeyHint: "done";
  readonly inputMode: "decimal" | "numeric" | undefined;
  readonly max: number | undefined;
  readonly min: number | undefined;
  readonly onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onWheel: (event: WheelEvent<HTMLInputElement>) => void;
  readonly step: number | "any";
  readonly value: string;
}

/**
 * The on-screen keyboard the rules ask for.
 *
 * Both keypads omit the minus key on some platforms, so one is requested only
 * where the rules rule negatives out. A field that accepts fractions then asks
 * for the decimal pad, which puts the point under a wet or gloved finger
 * instead of behind a switch to the punctuation layer.
 */
function resolveInputMode(
  rules: NumberDraftOptions,
): "decimal" | "numeric" | undefined {
  if (rules.min === undefined || rules.min < 0) return undefined;
  return rules.integer === true ? "numeric" : "decimal";
}

export interface NumberDraft {
  /**
   * Ends the edit, as blur and Enter do: a valid draft is dropped so the input
   * shows the committed value again, and an invalid one starts showing its
   * reason.
   */
  readonly finishEdit: () => void;
  /** Records a keystroke and commits whatever the draft resolves to. */
  readonly handleChange: (raw: string) => void;
  readonly inputProps: NumberDraftInputProps;
  /**
   * Why the draft is invalid, once the field should say so. It is set when an
   * edit finishes on an invalid draft and cleared the moment the draft turns
   * valid, so neither the message nor `aria-invalid` interrupts typing. Leaving
   * the field is how an edit finishes, so pressing a Save button or any other
   * control shows it too.
   */
  readonly invalidReason: NumberDraftInvalidReason | undefined;
  /**
   * Whether the draft can be committed, updated on every keystroke. It crosses
   * exactly when `onValidityChange` reports, so a Save action gated on either
   * stays exact while the message waits for the edit to finish.
   */
  readonly valid: boolean;
}

export interface UseNumberDraftOptions extends NumberDraftOptions {
  /**
   * Called when the draft crosses between valid and invalid, on the keystroke
   * that crosses. Consumers gate a save action on it. It is never called from
   * an unmount, so a consumer that stops rendering the field clears its own
   * entry, which the shared `useFieldValidity` bookkeeping does for a panel
   * that would rather not. A draft reset through `useResetDrafts` reports an
   * invalid draft valid from the Discard event, even while its field sits in
   * a collapsed section, and also for a field that left the tree while
   * invalid and has not been reset since. That can repeat a valid report a
   * consumer already applied on unmount, so keep bookkeeping a repeat cannot
   * unbalance, such as a set of names rather than a count.
   */
  readonly onValidityChange?: ((valid: boolean) => void) | undefined;
  /**
   * Changing this value drops the draft, like the panel-wide reset
   * `useResetDrafts` returns, and combines with it. Use it to drop one field's
   * draft on its own.
   */
  readonly resetKey?: string | number | undefined;
}

interface Draft {
  /** Committed value the draft was typed against. */
  readonly committed: number | undefined;
  /** The panel's draft reset epoch the draft was typed under. */
  readonly epoch: number;
  readonly raw: string;
  readonly resetKey: string | number | undefined;
  /** Whether an edit has finished on this draft while it was invalid. */
  readonly shown: boolean;
}

function formatValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

/**
 * Raw-text draft state for a controlled numeric input.
 *
 * A bare controlled `<input type="number">` snaps back to the committed value
 * on every keystroke, so the user cannot clear the field mid-edit. This hook
 * keeps the typed string until the input loses focus or Enter is pressed,
 * commits what the string resolves to on every keystroke, and blurs a
 * focused input on wheel so a scroll gesture cannot spin the value.
 *
 * The draft is stored beside the value it was typed against and is shown only
 * while that value is still the committed one. A change of the committed
 * value from outside therefore replaces the draft without an effect, and a
 * `CollapsibleSection` collapse and reopen, which reruns effects while state
 * survives, cannot discard an edit in progress. A Discard action that
 * restores the value the draft was typed against changes nothing the draft is
 * keyed on, which is what `useResetDrafts` and `resetKey` are for.
 */
export function useNumberDraft(
  value: number | undefined,
  onValueChange: (next: number | undefined) => void,
  options: UseNumberDraftOptions = {},
): NumberDraft {
  const { onValidityChange, resetKey, ...rules } = options;
  const { epoch, trackInvalid } = useDraftResetScope();
  const [draft, setDraft] = useState<Draft | null>(null);
  const active =
    draft !== null &&
    Object.is(draft.committed, value) &&
    draft.resetKey === resetKey &&
    draft.epoch === epoch;
  const resolution = active ? resolveNumberDraft(draft.raw, rules) : null;
  const draftReason =
    resolution?.status === "invalid" ? resolution.reason : undefined;
  const isValid = draftReason === undefined;
  const invalidReason = active && draft.shown ? draftReason : undefined;

  // Validity is reported on transitions only, through a ref, so a paused and
  // resumed subtree does not repeat the last report.
  const reportedValid = useRef(true);
  const forgetInvalid = useRef<(() => void) | null>(null);
  const reportValidity = useEffectEvent((next: boolean): void => {
    reportedValid.current = next;
    if (next) {
      forgetInvalid.current?.();
      forgetInvalid.current = null;
    } else {
      // The panel's reset reports an invalid draft valid from the Discard
      // event itself. The entry is not forgotten on unmount, because hiding a
      // retained section runs the same cleanup while the draft survives; a
      // reset reaching a field that has since left reports a valid state
      // nobody can contradict, and clears the entry.
      forgetInvalid.current ??= trackInvalid(() => {
        forgetInvalid.current = null;
        reportedValid.current = true;
        onValidityChange?.(true);
      });
    }
    onValidityChange?.(next);
  });
  useEffect(() => {
    if (reportedValid.current === isValid) return;
    reportValidity(isValid);
  }, [isValid]);

  const handleChange = (raw: string): void => {
    const next = resolveNumberDraft(raw, rules);
    const committed = next.status === "valid" ? next.value : value;
    // A reason already on screen follows the draft until it turns valid,
    // rather than vanishing on the next keystroke and returning on blur.
    const shown = active && draft.shown && next.status === "invalid";
    setDraft({ committed, epoch, raw, resetKey, shown });
    if (next.status === "valid" && !Object.is(next.value, value)) {
      onValueChange(next.value);
    }
  };

  const finishEdit = (): void => {
    if (!active) return;
    // A valid draft is replaced by the formatted committed value; an invalid
    // one stays visible and starts showing its reason.
    if (isValid) setDraft(null);
    else if (!draft.shown) setDraft({ ...draft, shown: true });
  };

  return {
    finishEdit,
    handleChange,
    inputProps: {
      "aria-invalid": invalidReason === undefined ? undefined : true,
      enterKeyHint: "done",
      inputMode: resolveInputMode(rules),
      max: rules.max,
      min: rules.min,
      onBlur: finishEdit,
      onChange: (event) => {
        handleChange(event.currentTarget.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") finishEdit();
      },
      onWheel: blurBeforeWheel,
      // Without an explicit step the browser treats fractions as a step
      // mismatch, so a non-integer field opts out of that constraint.
      step: rules.step ?? (rules.integer === true ? 1 : "any"),
      value: active ? draft.raw : formatValue(value),
    },
    invalidReason,
    valid: isValid,
  };
}
