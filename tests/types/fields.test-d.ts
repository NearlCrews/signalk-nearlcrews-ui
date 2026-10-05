import type { AriaAttributes, ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  CheckboxGroupOption,
  CheckboxGroupProps,
} from "../../src/composites.js";
import type { SwitchProps } from "../../src/forms.js";
import type {
  ButtonAsButtonProps,
  ButtonReasonVisibility,
  CheckboxProps,
  CheckboxReasonVisibility,
  FieldControlProps,
  FieldValidity,
  IconOnlyButtonProps,
  NamedUnit,
  NumberDraft,
  NumberFieldMessage,
  NumberFieldMessageContext,
  NumberFieldProps,
  RangeInputProps,
  SegmentedControlOption,
  UnitContent,
} from "../../src/index.js";

/**
 * Field and choice control additions: blocked reasons a sighted reader can
 * see, data attributes on segmented options, the Switch description and error
 * slots, spoken unit names, rule-built number messages, and the validity
 * reads a refused save needs. The panel draft reset is pinned beside the
 * other panel chrome in panel-chrome.test-d.ts.
 */
describe("field control additions", () => {
  it("draws a blocked reason on request", () => {
    expectTypeOf<ButtonReasonVisibility>().toEqualTypeOf<
      "hidden" | "visible"
    >();
    expectTypeOf<CheckboxReasonVisibility>().toEqualTypeOf<
      "hidden" | "visible"
    >();
    expectTypeOf<
      ButtonAsButtonProps["disabledReasonVisibility"]
    >().toEqualTypeOf<ButtonReasonVisibility | undefined>();
    expectTypeOf<CheckboxProps["disabledReason"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<CheckboxProps["disabledReasonVisibility"]>().toEqualTypeOf<
      CheckboxReasonVisibility | undefined
    >();
    expectTypeOf<CheckboxGroupOption<"a">["disabledReason"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<
      CheckboxGroupProps<"a">["selectAllDisabledReason"]
    >().toEqualTypeOf<ReactNode | undefined>();
    expectTypeOf<
      CheckboxGroupProps<"a">["disabledReasonVisibility"]
    >().toEqualTypeOf<CheckboxReasonVisibility | undefined>();
  });

  it("blocks a segmented option in place and carries its data attributes", () => {
    const option: SegmentedControlOption<"auto"> = {
      ariaDisabled: true,
      dataAttributes: { "data-snui-theme-choice": "auto" },
      label: "Match Admin",
      value: "auto",
    };
    expectTypeOf(option.ariaDisabled).toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SegmentedControlOption<"a">["disabledReason"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    const stray: SegmentedControlOption<"auto"> = {
      dataAttributes: {
        // @ts-expect-error only data attributes pass through to the radio
        title: "Follows Admin",
      },
      label: "Match Admin",
      value: "auto",
    };
    expectTypeOf(stray).not.toBeNever();
    // An option type a consumer declared as an interface still fits.
    interface ViewOption {
      readonly label: string;
      readonly value: "list";
    }
    expectTypeOf<ViewOption>().toExtend<SegmentedControlOption<"list">>();
  });

  it("gives Switch the description and error slots of the other choices", () => {
    const described: SwitchProps = {
      description: "Publishes onto the vessel bus.",
      error: "Choose a source first.",
      errorLive: "polite",
      label: "Emit computed values",
    };
    expectTypeOf(described).not.toBeNever();
  });

  it("reads a named unit and builds a message from the rules", () => {
    expectTypeOf<NamedUnit>().toEqualTypeOf<{
      readonly name: string;
      readonly symbol: ReactNode;
    }>();
    expectTypeOf<UnitContent>().toEqualTypeOf<ReactNode | NamedUnit>();
    expectTypeOf<NumberFieldProps["unit"]>().toEqualTypeOf<
      ReactNode | NamedUnit | undefined
    >();
    expectTypeOf<RangeInputProps["unit"]>().toEqualTypeOf<
      ReactNode | NamedUnit | undefined
    >();
    expectTypeOf<NumberFieldMessage>().toEqualTypeOf<
      ReactNode | ((context: NumberFieldMessageContext) => ReactNode)
    >();
    const messages: NumberFieldProps["messages"] = {
      aboveMax: "Höchstens {max}.",
      belowMin: ({ min }) => `At least ${String(min)}.`,
    };
    expectTypeOf(messages).not.toBeNever();
  });

  it("exposes per-keystroke validity and the first invalid field", () => {
    expectTypeOf<NumberDraft["valid"]>().toEqualTypeOf<boolean>();
    expectTypeOf<FieldValidity["firstInvalid"]>().toEqualTypeOf<
      () => HTMLElement | null
    >();
  });
});

/** What a control has to accept, and what a nameless one has to supply. */
describe("field control contracts", () => {
  it("exports the complete native aria-invalid type", () => {
    expectTypeOf<FieldControlProps["aria-invalid"]>().toEqualTypeOf<
      AriaAttributes["aria-invalid"]
    >();
  });

  it("requires an icon-only button to carry an accessible name", () => {
    expectTypeOf<IconOnlyButtonProps>().toExtend<{ readonly iconOnly: true }>();
    expectTypeOf({
      "aria-label": "Add source",
      children: null,
      iconOnly: true,
    } as const).toExtend<IconOnlyButtonProps>();
    expectTypeOf({
      "aria-labelledby": "add-source-label",
      children: null,
      iconOnly: true,
    } as const).toExtend<IconOnlyButtonProps>();
    // @ts-expect-error an icon-only button needs one of the two naming props
    const unnamed: IconOnlyButtonProps = { children: null, iconOnly: true };
    expectTypeOf(unnamed).not.toBeNever();
  });
});
