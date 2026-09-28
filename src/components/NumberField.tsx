import type { ReactNode, Ref } from "react";
import { useControllableStateWhen } from "../hooks/use-controllable-state.js";
import {
  type NumberDraftInvalidReason,
  type NumberDraftOptions,
  useNumberDraft,
} from "../hooks/use-number-draft.js";
import { joinIdReferences } from "../utils/aria.js";
import { resolveBundledContent } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { hasUnitContent, renderUnit, type UnitContent } from "../utils/unit.js";
import { NumberInput, type NumberInputProps } from "./Inputs.js";
import {
  LabeledField,
  type LabeledFieldProps,
  splitLabeledFieldControlProps,
} from "./LabeledField.js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  type InputGroupControlWidth,
} from "./Layout.js";

/** What a validation message can name: the reason and the rules it broke. */
export interface NumberFieldMessageContext {
  readonly exclusiveMax: boolean;
  readonly exclusiveMin: boolean;
  readonly integer: boolean;
  readonly max: number | undefined;
  readonly min: number | undefined;
  readonly reason: NumberDraftInvalidReason;
  /** The field's own `unit`, so a message can name what it measures. */
  readonly unit: UnitContent;
}

/**
 * One validation message. Text may carry `{min}` and `{max}`, which are
 * replaced with the field's bounds printed the way the input accepts them
 * back; a function builds the message from the rules, including the unit.
 */
export type NumberFieldMessage =
  | ReactNode
  | ((context: NumberFieldMessageContext) => ReactNode);

/** Validation messages keyed by the reason a draft cannot be committed. */
export type NumberFieldMessages = Partial<
  Readonly<Record<NumberDraftInvalidReason, NumberFieldMessage>>
>;

/** Input attributes the field does not own itself. */
export type NumberFieldInputProps = Omit<
  NumberInputProps,
  | "aria-invalid"
  | "id"
  | "max"
  | "min"
  | "onBlur"
  | "onChange"
  | "onKeyDown"
  | "onWheel"
  | "ref"
  | "step"
  | "value"
>;

interface NumberFieldBaseProps
  extends Omit<LabeledFieldProps, "children" | "defaultValue">,
    Omit<NumberDraftOptions, "allowEmpty"> {
  /** Extra attributes for the input, such as `placeholder` or `autoComplete`. */
  readonly inputProps?: NumberFieldInputProps | undefined;
  /** Reaches the `<input>`; `ref` reaches the field root. */
  readonly inputRef?: Ref<HTMLInputElement> | undefined;
  /**
   * Replaces the default message for a reason, ahead of the panel's
   * `labels.numberField` bundle, whose text takes the same `{min}` and
   * `{max}` placeholders.
   */
  readonly messages?: NumberFieldMessages | undefined;
  /**
   * Called on the keystroke that moves the draft between valid and invalid,
   * so a Save gated on it stays exact while the message itself waits for the
   * edit to finish. A panel reset through `useResetDrafts` also reports an
   * invalid draft valid, from the Discard event, for a field in a collapsed
   * section and for one that left the tree while invalid, so keep bookkeeping
   * that a repeated report cannot unbalance, such as a set of names.
   */
  readonly onValidityChange?: ((valid: boolean) => void) | undefined;
  /**
   * Changing it drops this field's in-progress draft. A panel's Discard
   * drops every draft at once through `useResetDrafts`.
   */
  readonly resetKey?: string | number | undefined;
  /**
   * Unit shown after the input and read as part of its description, never as
   * part of its name. Pass `{ symbol, name }` to draw a compact symbol and
   * read its name, so "kn" is heard as "knots" rather than spelled out.
   * Source the unit, and any conversion behind it, from the consumer's own
   * resolution of the server's unit preferences: this package neither fetches
   * nor selects units.
   */
  readonly unit?: UnitContent | undefined;
  /** How the input slot shares the row when a unit is shown. Defaults to grow. */
  readonly controlWidth?: InputGroupControlWidth | undefined;
}

/**
 * Two contracts cross here.
 *
 * `allowEmpty` widens the value: a cleared field commits `undefined`, so the
 * value and the callback admit it. Without it the field always holds a number.
 *
 * `defaultValue` decides who owns the value. A field given one is
 * uncontrolled: it holds the value itself and still reports every commit, so
 * a read-only display or a panel that does not own the value yet needs no
 * state hook and no callback. A field given `value` is controlled, as before.
 * The two never appear together, because a value that is owned in both places
 * is owned in neither, and `defaultValue` rather than a missing `value` marks
 * the mode: under `allowEmpty` an undefined value is a cleared field.
 */
export type NumberFieldProps = NumberFieldBaseProps &
  (
    | {
        readonly allowEmpty?: false | undefined;
        readonly defaultValue?: undefined;
        readonly onValueChange?: ((value: number) => void) | undefined;
        readonly value: number;
      }
    | {
        readonly allowEmpty?: false | undefined;
        readonly defaultValue: number;
        readonly onValueChange?: ((value: number) => void) | undefined;
        readonly value?: undefined;
      }
    | {
        readonly allowEmpty: true;
        readonly defaultValue?: undefined;
        readonly onValueChange?:
          | ((value: number | undefined) => void)
          | undefined;
        readonly value: number | undefined;
      }
    | {
        readonly allowEmpty: true;
        readonly defaultValue: number;
        readonly onValueChange?:
          | ((value: number | undefined) => void)
          | undefined;
        readonly value?: undefined;
      }
  );

/*
 * The bounds a message names have to be typeable back into the field, and an
 * `<input type="number">` accepts the HTML floating-point grammar alone. So
 * the bound is printed with no grouping separator, which the input strips or
 * rejects, and with no exponent form, which is what `String` falls into below
 * 1e-6. The locale is fixed because these messages are the package's own
 * English defaults and the input's decimal separator is a period everywhere.
 */
const BOUND_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 20,
  useGrouping: false,
});

const BOUND_PLACEHOLDER = /\{(min|max)\}/g;

/**
 * Fills the bound placeholders in a message given as text. A placeholder for
 * a bound the field does not have is left as written, so the gap shows in
 * review rather than reading as a blank.
 */
function fillBounds(text: string, rules: NumberDraftOptions): string {
  return text.replace(BOUND_PLACEHOLDER, (placeholder, bound: string) => {
    const value = bound === "min" ? rules.min : rules.max;
    return value === undefined ? placeholder : BOUND_FORMAT.format(value);
  });
}

function defaultMessage(
  reason: NumberDraftInvalidReason,
  rules: NumberDraftOptions,
): string {
  const { exclusiveMax = false, exclusiveMin = false, max, min } = rules;
  const integer = rules.integer === true;
  const noun = integer ? "a whole number" : "a number";
  switch (reason) {
    case "empty":
    case "notAnInteger":
      return `Enter ${noun}.`;
    case "notANumber":
      // The example carries the decimal separator the input accepts, which a
      // reader who typed a comma cannot guess from "Enter a number." alone.
      return `Enter ${noun}, such as ${integer ? "12" : "12.5"}.`;
    case "belowMin":
    case "aboveMax": {
      const lower = min === undefined ? "" : BOUND_FORMAT.format(min);
      const upper = max === undefined ? "" : BOUND_FORMAT.format(max);
      if (
        min !== undefined &&
        max !== undefined &&
        !exclusiveMin &&
        !exclusiveMax
      ) {
        return `Enter ${noun} from ${lower} to ${upper}.`;
      }
      if (reason === "belowMin") {
        return exclusiveMin
          ? `Enter ${noun} greater than ${lower}.`
          : `Enter ${lower} or more.`;
      }
      return exclusiveMax
        ? `Enter ${noun} less than ${upper}.`
        : `Enter ${upper} or less.`;
    }
  }
}

/**
 * The message for a reason, in the order a panel expects: the field's own,
 * then the panel's bundle, then the English default.
 */
function resolveMessage(
  reason: NumberDraftInvalidReason,
  rules: NumberDraftOptions,
  unit: UnitContent,
  own: NumberFieldMessage,
  bundled: string | undefined,
): ReactNode {
  const content =
    typeof own === "function"
      ? own({
          exclusiveMax: rules.exclusiveMax === true,
          exclusiveMin: rules.exclusiveMin === true,
          integer: rules.integer === true,
          max: rules.max,
          min: rules.min,
          reason,
          unit,
        })
      : typeof own === "string"
        ? fillBounds(own, rules)
        : own;
  return resolveBundledContent(
    content,
    bundled === undefined ? undefined : fillBounds(bundled, rules),
    defaultMessage(reason, rules),
  );
}

/**
 * A labeled numeric field with a draft-while-editing buffer. The value is
 * always a number (or `undefined` under `allowEmpty`); the text the user is
 * typing lives in the field until it commits. An invalid draft shows its
 * message and `aria-invalid` once the edit finishes, on blur or Enter, and
 * drops them the moment the draft turns valid. See {@link useNumberDraft} for
 * the validate and clamp modes.
 */
export function NumberField({
  allowEmpty,
  controlWidth = "grow",
  defaultValue,
  error,
  exclusiveMax,
  exclusiveMin,
  fallback,
  inputProps,
  inputRef,
  integer,
  max,
  messages,
  min,
  onValidityChange,
  onValueChange,
  resetKey,
  step,
  unit,
  value,
  ...fieldProps
}: NumberFieldProps): React.JSX.Element {
  const bundledMessages = usePanelLabels()?.numberField;
  const rules: NumberDraftOptions = {
    allowEmpty,
    exclusiveMax,
    exclusiveMin,
    fallback,
    integer,
    max,
    min,
    step,
  };
  // `defaultValue` is what marks the field uncontrolled, rather than an
  // absent `value`: under allowEmpty an undefined value is a cleared field
  // rather than an unowned one, so the mode cannot be read off the value.
  const [currentValue, commitValue] = useControllableStateWhen<
    number | undefined
  >(
    defaultValue === undefined,
    value,
    defaultValue,
    // The union narrows the callback per allowEmpty; the field only produces
    // undefined when allowEmpty is set, so the wider signature is sound here.
    onValueChange as ((next: number | undefined) => void) | undefined,
  );
  const draft = useNumberDraft(currentValue, commitValue, {
    ...rules,
    onValidityChange,
    resetKey,
  });
  const { invalidReason } = draft;
  const draftMessage =
    invalidReason === undefined
      ? undefined
      : resolveMessage(
          invalidReason,
          rules,
          unit,
          messages?.[invalidReason],
          bundledMessages?.[invalidReason],
        );
  const showUnit = hasUnitContent(unit);
  // The keyboard hints are defaults a caller may replace, so they are applied
  // before the caller's own attributes; everything else in the draft's props
  // belongs to the field and is applied after.
  const { enterKeyHint, inputMode, ...draftInputProps } = draft.inputProps;

  return (
    <LabeledField {...fieldProps} error={draftMessage ?? error}>
      {(controlContract) => {
        const { controlProps } = splitLabeledFieldControlProps(controlContract);
        const unitId = showUnit ? `${controlProps.id}-unit` : undefined;
        // The field contract spreads last: LabeledField owns aria-invalid,
        // and it sets it whenever a message shows, the draft's included.
        const input = (
          <NumberInput
            enterKeyHint={enterKeyHint}
            inputMode={inputMode}
            {...inputProps}
            {...draftInputProps}
            {...controlProps}
            ref={inputRef}
            aria-describedby={joinIdReferences(
              controlProps["aria-describedby"],
              unitId,
            )}
          />
        );
        if (!showUnit) return input;
        // The unit joins the description so the value is read with what it
        // measures.
        return (
          <InputGroup>
            <InputGroupControl controlWidth={controlWidth}>
              {input}
            </InputGroupControl>
            <InputGroupAddon id={unitId}>{renderUnit(unit)}</InputGroupAddon>
          </InputGroup>
        );
      }}
    </LabeledField>
  );
}
