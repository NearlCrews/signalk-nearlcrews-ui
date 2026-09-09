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
  /** Treats `max` itself as out of range. */
  readonly exclusiveMax?: boolean | undefined;
  /** Treats `min` itself as out of range. */
  readonly exclusiveMin?: boolean | undefined;
  /** Switches to clamp mode; the value committed for empty or unparsable input. */
  readonly fallback?: number | undefined;
  /** Accepts whole numbers only. */
  readonly integer?: boolean | undefined;
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  /**
   * Spinner increment passed to the input. In clamp mode committed values
   * also snap to a multiple of it, counted from `min` where there is one, as
   * the input's own step constraint counts.
   */
  readonly step?: number | undefined;
}

export type NumberDraftResolution =
  | { readonly status: "valid"; readonly value: number | undefined }
  | { readonly status: "invalid"; readonly reason: NumberDraftInvalidReason };

function valid(value: number | undefined): NumberDraftResolution {
  return { status: "valid", value };
}

function invalid(reason: NumberDraftInvalidReason): NumberDraftResolution {
  return { status: "invalid", reason };
}

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

function snapToStep(value: number, step: number, base: number): number {
  const snapped = base + Math.round((value - base) / step) * step;
  // Rounding to the precision the base and the step carry between them
  // removes the binary noise a multiplication such as 0.1 * 3 leaves behind.
  const places = Math.max(decimalPlaces(step), decimalPlaces(base));
  return Number(snapped.toFixed(places));
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
  const trimmed = raw.trim();

  if (trimmed === "") {
    if (allowEmpty) return valid(undefined);
    return clamps ? valid(fallback) : invalid("empty");
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return clamps ? valid(fallback) : invalid("notANumber");
  }

  let value = parsed;
  if (integer && !Number.isInteger(value)) {
    if (!clamps) return invalid("notAnInteger");
    value = Math.trunc(value);
  }
  if (clamps && step !== undefined && step > 0) {
    // HTML measures step validity from a step base, which is `min` when the
    // input has one. Snapping from anywhere else commits values the input
    // itself reports as a step mismatch.
    value = snapToStep(
      value,
      step,
      min !== undefined && Number.isFinite(min) ? min : 0,
    );
  }

  if (min !== undefined && (exclusiveMin ? value <= min : value < min)) {
    if (!clamps) return invalid("belowMin");
    // An exclusive bound has no nearest legal value to clamp to.
    if (exclusiveMin) return valid(fallback);
    value = min;
  }
  if (max !== undefined && (exclusiveMax ? value >= max : value > max)) {
    if (!clamps) return invalid("aboveMax");
    if (exclusiveMax) return valid(fallback);
    value = max;
  }
  return valid(value);
}

/** Attributes and handlers to spread onto a `NumberInput`. */
export interface NumberDraftInputProps {
  readonly "aria-invalid": true | undefined;
  readonly inputMode: "numeric" | undefined;
  readonly max: number | undefined;
  readonly min: number | undefined;
  readonly onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onWheel: (event: WheelEvent<HTMLInputElement>) => void;
  readonly step: number | "any";
  readonly value: string;
}

export interface NumberDraft {
  /** Drops a valid draft so the input shows the committed value again. */
  readonly finishEdit: () => void;
  /** Records a keystroke and commits whatever the draft resolves to. */
  readonly handleChange: (raw: string) => void;
  readonly inputProps: NumberDraftInputProps;
  /** Why the current draft is invalid, or undefined while it is valid. */
  readonly invalidReason: NumberDraftInvalidReason | undefined;
}

export interface UseNumberDraftOptions extends NumberDraftOptions {
  /**
   * Called when the draft crosses between valid and invalid. Consumers gate a
   * save action on it. It is never called from an unmount, so a consumer that
   * stops rendering the field clears its own entry.
   */
  readonly onValidityChange?: ((valid: boolean) => void) | undefined;
  /**
   * Changing this value drops the draft. Use it for a Discard action that
   * restores a committed value identical to the current one, which the
   * external-change rule below cannot see.
   */
  readonly resetKey?: string | number | undefined;
}

interface Draft {
  /** Committed value the draft was typed against. */
  readonly committed: number | undefined;
  readonly raw: string;
  readonly resetKey: string | number | undefined;
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
 * while that value is still the committed one. An external change such as a
 * Discard action therefore replaces the draft without an effect, and a
 * `CollapsibleSection` collapse and reopen, which reruns effects while state
 * survives, cannot discard an edit in progress.
 */
export function useNumberDraft(
  value: number | undefined,
  onValueChange: (next: number | undefined) => void,
  options: UseNumberDraftOptions = {},
): NumberDraft {
  const { onValidityChange, resetKey, ...rules } = options;
  const [draft, setDraft] = useState<Draft | null>(null);
  const active =
    draft !== null &&
    Object.is(draft.committed, value) &&
    draft.resetKey === resetKey;
  const resolution = active ? resolveNumberDraft(draft.raw, rules) : null;
  const invalidReason =
    resolution?.status === "invalid" ? resolution.reason : undefined;
  const isValid = invalidReason === undefined;

  // Validity is reported on transitions only, through a ref, so a paused and
  // resumed subtree does not repeat the last report.
  const reportValidity = useEffectEvent((next: boolean): void => {
    onValidityChange?.(next);
  });
  const reportedValid = useRef(true);
  useEffect(() => {
    if (reportedValid.current === isValid) return;
    reportedValid.current = isValid;
    reportValidity(isValid);
  }, [isValid]);

  const handleChange = (raw: string): void => {
    const next = resolveNumberDraft(raw, rules);
    const committed = next.status === "valid" ? next.value : value;
    setDraft({ committed, raw, resetKey });
    if (next.status === "valid" && !Object.is(next.value, value)) {
      onValueChange(next.value);
    }
  };

  const finishEdit = (): void => {
    // An invalid draft stays visible with its message; only a valid one is
    // replaced by the formatted committed value.
    if (active && isValid) setDraft(null);
  };

  return {
    finishEdit,
    handleChange,
    inputProps: {
      "aria-invalid": isValid ? undefined : true,
      // A numeric keypad omits the minus key on some platforms, so it is only
      // requested where the rules rule negatives out.
      inputMode:
        rules.integer === true && rules.min !== undefined && rules.min >= 0
          ? "numeric"
          : undefined,
      max: rules.max,
      min: rules.min,
      onBlur: finishEdit,
      onChange: (event) => {
        handleChange(event.currentTarget.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") finishEdit();
      },
      onWheel: (event) => {
        // An unfocused number input never spins, so dropping focus before the
        // wheel applies makes scrolling past the field safe.
        const input = event.currentTarget;
        if (input.ownerDocument.activeElement === input) input.blur();
      },
      // Without an explicit step the browser treats fractions as a step
      // mismatch, so a non-integer field opts out of that constraint.
      step: rules.step ?? (rules.integer === true ? 1 : "any"),
      value: active ? draft.raw : formatValue(value),
    },
    invalidReason,
  };
}
