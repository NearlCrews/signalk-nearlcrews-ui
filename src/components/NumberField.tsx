import type { ReactNode, Ref } from "react";
import {
  type NumberDraftInvalidReason,
  type NumberDraftOptions,
  useNumberDraft,
} from "../hooks/use-number-draft.js";
import { joinIdReferences } from "../utils/aria.js";
import { hasReactContent } from "../utils/react-node.js";
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

/** Validation messages keyed by the reason a draft cannot be committed. */
export type NumberFieldMessages = Partial<
  Readonly<Record<NumberDraftInvalidReason, ReactNode>>
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
  extends Omit<LabeledFieldProps, "children">,
    Omit<NumberDraftOptions, "allowEmpty"> {
  /** Extra attributes for the input, such as `placeholder` or `autoComplete`. */
  readonly inputProps?: NumberFieldInputProps | undefined;
  /** Reaches the `<input>`; `ref` reaches the field root. */
  readonly inputRef?: Ref<HTMLInputElement> | undefined;
  /** Replaces the default message for a reason. */
  readonly messages?: NumberFieldMessages | undefined;
  /** Called when the draft crosses between valid and invalid. */
  readonly onValidityChange?: ((valid: boolean) => void) | undefined;
  /** Changing it drops an in-progress draft, for a Discard action. */
  readonly resetKey?: string | number | undefined;
  /** Unit shown after the input and read as part of its description. */
  readonly unit?: ReactNode | undefined;
  /** Width of the input slot when a unit is shown. Defaults to grow. */
  readonly width?: InputGroupControlWidth | undefined;
}

/**
 * `allowEmpty` widens the value contract: a cleared field commits
 * `undefined`, so the value and the callback admit it. Without it the field
 * always holds a number.
 */
export type NumberFieldProps = NumberFieldBaseProps &
  (
    | {
        readonly allowEmpty?: false | undefined;
        readonly onValueChange: (value: number) => void;
        readonly value: number;
      }
    | {
        readonly allowEmpty: true;
        readonly onValueChange: (value: number | undefined) => void;
        readonly value: number | undefined;
      }
  );

function defaultMessage(
  reason: NumberDraftInvalidReason,
  rules: NumberDraftOptions,
): string {
  const { exclusiveMax = false, exclusiveMin = false, max, min } = rules;
  const noun = rules.integer === true ? "a whole number" : "a number";
  switch (reason) {
    case "empty":
    case "notANumber":
      return `Enter ${noun}.`;
    case "notAnInteger":
      return "Enter a whole number.";
    case "belowMin":
    case "aboveMax":
      if (
        min !== undefined &&
        max !== undefined &&
        !exclusiveMin &&
        !exclusiveMax
      ) {
        return `Enter ${noun} from ${String(min)} to ${String(max)}.`;
      }
      if (reason === "belowMin") {
        return exclusiveMin
          ? `Enter ${noun} greater than ${String(min)}.`
          : `Enter ${noun} of at least ${String(min)}.`;
      }
      return exclusiveMax
        ? `Enter ${noun} less than ${String(max)}.`
        : `Enter ${noun} of at most ${String(max)}.`;
  }
}

/**
 * A labeled numeric field with a draft-while-editing buffer. The value is
 * always a number (or `undefined` under `allowEmpty`); the text the user is
 * typing lives in the field until it commits. See {@link useNumberDraft} for
 * the validate and clamp modes.
 */
export function NumberField({
  allowEmpty,
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
  width = "grow",
  ...fieldProps
}: NumberFieldProps): React.JSX.Element {
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
  const draft = useNumberDraft(
    value,
    // The union narrows the callback per allowEmpty; the hook only produces
    // undefined when allowEmpty is set, so the wider signature is sound here.
    onValueChange as (next: number | undefined) => void,
    { ...rules, onValidityChange, resetKey },
  );
  const messageOverride =
    draft.invalidReason === undefined
      ? undefined
      : messages?.[draft.invalidReason];
  const draftMessage =
    draft.invalidReason === undefined
      ? undefined
      : hasReactContent(messageOverride)
        ? messageOverride
        : defaultMessage(draft.invalidReason, rules);
  const showUnit = hasReactContent(unit);

  return (
    <LabeledField {...fieldProps} error={draftMessage ?? error}>
      {(controlContract) => {
        const { controlProps } = splitLabeledFieldControlProps(controlContract);
        const unitId = showUnit ? `${controlProps.id}-unit` : undefined;
        // The field contract spreads last: LabeledField owns aria-invalid,
        // and it sets it whenever a message shows, the draft's included.
        const input = (
          <NumberInput
            {...inputProps}
            {...draft.inputProps}
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
            <InputGroupControl width={width}>{input}</InputGroupControl>
            <InputGroupAddon id={unitId}>{unit}</InputGroupAddon>
          </InputGroup>
        );
      }}
    </LabeledField>
  );
}
