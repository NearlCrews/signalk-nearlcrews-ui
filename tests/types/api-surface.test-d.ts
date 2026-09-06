import type { ComponentProps, ReactElement, ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { CheckboxGroupProps, ProgressTone } from "../../src/composites.js";
import type { DataGridProps } from "../../src/data-grid.js";
import type {
  RadioGroupErrorLive,
  RadioGroupOrientation,
  RadioGroupProps,
  RadioProps,
  SecretInputProps,
  SwitchProps,
} from "../../src/forms.js";
import type {
  ActionBar,
  ActionBarSticky,
  AnnouncementMode,
  BannerTone,
  ButtonAsAnchorProps,
  ButtonAsButtonProps,
  CheckboxErrorLive,
  CheckboxProps,
  FieldControlProps,
  FieldErrorLive,
  FormatRelativeAgeOptions,
  LabeledFieldChild,
  LabeledFieldControlProps,
  LabeledFieldDensity,
  LabeledFieldProps,
  NumberDraftResolution,
  NumberFieldProps,
  SegmentedControlLegendVisibility,
  SegmentedControlOption,
  SegmentedControlOrientation,
  SegmentedControlProps,
  SplitLabeledFieldControlProps,
  StackProps,
  StatusTone,
  TextareaProps,
  TextInput,
  TextInputProps,
  TextInputType,
  ThemeChoice,
  ThemeToggleProps,
  UnsupportedBrowserNoticeProps,
} from "../../src/index.js";
import { SegmentedControl } from "../../src/index.js";
import type { DialogProps } from "../../src/overlays.js";
import type { Density, Orientation } from "../../src/utils/variants.js";

/**
 * The public type surface is part of the package contract: these assertions
 * fail when a literal union widens, a required prop goes optional, or a
 * generic stops flowing into the props that consume it.
 */
describe("segmented control generics", () => {
  type Mode = "minimal" | "normal" | "verbose";

  it("flows the value type into onChange and options", () => {
    expectTypeOf<SegmentedControlProps<Mode>["onChange"]>().toEqualTypeOf<
      ((value: Mode) => void) | undefined
    >();
    expectTypeOf<SegmentedControlProps<Mode>["options"]>().toEqualTypeOf<
      readonly SegmentedControlOption<Mode>[]
    >();
    expectTypeOf<SegmentedControlProps<Mode>["value"]>().toEqualTypeOf<
      Mode | undefined
    >();
  });

  it("infers the value type from the options at the call site", () => {
    // A direct call is the only form that exercises generic inference on the
    // component signature; type test files are never executed.
    const element = SegmentedControl({
      label: "Log detail",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "normal", label: "Normal" },
      ] as const,
      onValueChange: (value) => {
        expectTypeOf(value).toEqualTypeOf<"minimal" | "normal">();
      },
    });
    expectTypeOf(element).toEqualTypeOf<React.JSX.Element>();
  });

  it("keeps the deprecated legend and onChange spellings usable", () => {
    expectTypeOf<SegmentedControlProps<Mode>["legend"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<SegmentedControlProps<Mode>["label"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<SegmentedControlProps<Mode>["onValueChange"]>().toEqualTypeOf<
      SegmentedControlProps<Mode>["onChange"]
    >();
    expectTypeOf<
      SegmentedControlProps<Mode>["labelVisibility"]
    >().toEqualTypeOf<SegmentedControlProps<Mode>["legendVisibility"]>();
  });

  it("rejects options outside the value type", () => {
    expectTypeOf<readonly { value: "fast"; label: string }[]>().not.toExtend<
      SegmentedControlProps<Mode>["options"]
    >();
    // A handler narrowed to a foreign literal cannot receive Mode values.
    expectTypeOf<(value: "fast") => void>().not.toExtend<
      SegmentedControlProps<Mode>["onChange"]
    >();
  });
});

describe("labeled field children", () => {
  it("accepts a control element and a render function", () => {
    expectTypeOf<
      ReactElement<FieldControlProps>
    >().toExtend<LabeledFieldChild>();
    // A control with extra props of its own still satisfies the contract.
    expectTypeOf<
      ReactElement<FieldControlProps & { defaultValue: string }>
    >().toExtend<LabeledFieldChild>();
    expectTypeOf<
      (controlProps: LabeledFieldControlProps) => ReactNode
    >().toExtend<LabeledFieldChild>();
  });

  it("rejects plain text, incompatible declared props, and wrong render functions", () => {
    expectTypeOf<string>().not.toExtend<LabeledFieldChild>();
    // JSX widens an instantiated element enough that TypeScript cannot prove
    // its intrinsic control kind. Runtime validation covers that boundary.
    expectTypeOf<
      ReactElement<{ bogus: true }>
    >().not.toExtend<LabeledFieldChild>();
    expectTypeOf<
      (controlProps: { bogus: true }) => ReactNode
    >().not.toExtend<LabeledFieldChild>();
  });
});

describe("text input types", () => {
  it("accepts the supported native types", () => {
    expectTypeOf<"month">().toExtend<TextInputType>();
    expectTypeOf<"week">().toExtend<TextInputType>();
    expectTypeOf<"date">().toExtend<TextInputType>();
  });

  it("rejects number, which NumberInput owns", () => {
    expectTypeOf<"number">().not.toExtend<TextInputType>();
    expectTypeOf<"number">().not.toExtend<
      NonNullable<ComponentProps<typeof TextInput>["type"]>
    >();
  });
});

describe("shared vocabularies and their deprecated aliases", () => {
  it("types density with the shared Density plus the deprecated comfortable", () => {
    expectTypeOf<Density>().toEqualTypeOf<"default" | "compact">();
    expectTypeOf<LabeledFieldProps["density"]>().toEqualTypeOf<
      Density | "comfortable" | undefined
    >();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<LabeledFieldDensity>().toEqualTypeOf<
      Density | "comfortable"
    >();
  });

  it("types orientation with the shared Orientation", () => {
    expectTypeOf<Orientation>().toEqualTypeOf<"horizontal" | "vertical">();
    expectTypeOf<RadioGroupProps["orientation"]>().toEqualTypeOf<
      Orientation | undefined
    >();
    expectTypeOf<SegmentedControlProps<string>["orientation"]>().toEqualTypeOf<
      Orientation | undefined
    >();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<RadioGroupOrientation>().toEqualTypeOf<Orientation>();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<SegmentedControlOrientation>().toEqualTypeOf<Orientation>();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<SegmentedControlLegendVisibility>().toEqualTypeOf<
      "hidden" | "visible"
    >();
  });

  it("types announcement props with AnnouncementMode and keeps the aliases", () => {
    expectTypeOf<LabeledFieldProps["errorLive"]>().toEqualTypeOf<
      AnnouncementMode | undefined
    >();
    expectTypeOf<CheckboxProps["errorLive"]>().toEqualTypeOf<
      AnnouncementMode | undefined
    >();
    expectTypeOf<RadioGroupProps["errorLive"]>().toEqualTypeOf<
      AnnouncementMode | undefined
    >();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<FieldErrorLive>().toEqualTypeOf<AnnouncementMode>();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<CheckboxErrorLive>().toEqualTypeOf<AnnouncementMode>();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated spelling is still honored
    expectTypeOf<RadioGroupErrorLive>().toEqualTypeOf<AnnouncementMode>();
  });
});

describe("selection control labels and value callbacks", () => {
  it("accepts label or children on Switch and Radio", () => {
    expectTypeOf<SwitchProps["label"]>().toEqualTypeOf<ReactNode | undefined>();
    expectTypeOf<SwitchProps["children"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<RadioProps["label"]>().toEqualTypeOf<ReactNode | undefined>();
    expectTypeOf<{ label: "Autopilot" }>().toExtend<SwitchProps>();
    expectTypeOf<{ value: "sail"; label: "Sail" }>().toExtend<RadioProps>();
  });

  it("names value callbacks by their payload", () => {
    expectTypeOf<SwitchProps["onCheckedChange"]>().toEqualTypeOf<
      ((checked: boolean) => void) | undefined
    >();
    expectTypeOf<SwitchProps["onChange"]>().toEqualTypeOf<
      SwitchProps["onCheckedChange"]
    >();
    expectTypeOf<RadioGroupProps["onValueChange"]>().toEqualTypeOf<
      ((value: string) => void) | undefined
    >();
    expectTypeOf<ThemeToggleProps["onValueChange"]>().toEqualTypeOf<
      ((theme: ThemeChoice) => void) | undefined
    >();
    expectTypeOf<
      CheckboxGroupProps<"a" | "b">["onValueChange"]
    >().toEqualTypeOf<((values: readonly ("a" | "b")[]) => void) | undefined>();
  });

  it("lets ThemeToggle carry native attributes and a label", () => {
    expectTypeOf<{
      "data-testid": string;
      id: string;
      label: string;
    }>().toExtend<ThemeToggleProps>();
    expectTypeOf<"options">().not.toExtend<keyof ThemeToggleProps>();
    expectTypeOf<"value">().not.toExtend<keyof ThemeToggleProps>();
  });
});

describe("text control modifiers", () => {
  it("adds monospace to text controls and minRows to Textarea", () => {
    expectTypeOf<TextInputProps["monospace"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<TextareaProps["monospace"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<SecretInputProps["monospace"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<TextareaProps["minRows"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<CheckboxProps["labelVisibility"]>().toEqualTypeOf<
      "hidden" | "visible" | undefined
    >();
  });
});

describe("number field value contract", () => {
  it("narrows the value and callback on allowEmpty", () => {
    expectTypeOf<{
      label: string;
      value: number;
      onValueChange: (value: number) => void;
    }>().toExtend<NumberFieldProps>();
    expectTypeOf<{
      label: string;
      allowEmpty: true;
      value: number | undefined;
      onValueChange: (value: number | undefined) => void;
    }>().toExtend<NumberFieldProps>();
    // Without allowEmpty the value cannot be undefined.
    expectTypeOf<{
      label: string;
      value: number | undefined;
      onValueChange: (value: number | undefined) => void;
    }>().not.toExtend<NumberFieldProps>();
    // A field is not a bare input: the draft owns these.
    expectTypeOf<"onChange">().not.toExtend<
      keyof NonNullable<NumberFieldProps["inputProps"]>
    >();
  });

  it("resolves a draft to a valid value or an invalid reason", () => {
    expectTypeOf<NumberDraftResolution>().toEqualTypeOf<
      | { readonly status: "valid"; readonly value: number | undefined }
      | {
          readonly status: "invalid";
          readonly reason:
            | "empty"
            | "notANumber"
            | "notAnInteger"
            | "belowMin"
            | "aboveMax";
        }
    >();
    expectTypeOf<SplitLabeledFieldControlProps["controlProps"]>().toExtend<
      FieldControlProps & { readonly id: string }
    >();
  });
});

describe("literal unions", () => {
  it("pins the theme choices", () => {
    expectTypeOf<ThemeChoice>().toEqualTypeOf<
      "auto" | "system" | "light" | "dark" | "night"
    >();
  });

  it("pins the announcement modes", () => {
    expectTypeOf<AnnouncementMode>().toEqualTypeOf<
      "off" | "polite" | "assertive"
    >();
  });

  it("pins the tone unions", () => {
    expectTypeOf<StatusTone>().toEqualTypeOf<
      "neutral" | "info" | "success" | "warning" | "danger"
    >();
    expectTypeOf<BannerTone>().toEqualTypeOf<StatusTone>();
    expectTypeOf<ProgressTone>().toEqualTypeOf<
      Exclude<StatusTone, "neutral">
    >();
  });
});

describe("relative age formatting", () => {
  it("exports the formatter option contract", () => {
    expectTypeOf<FormatRelativeAgeOptions["numeric"]>().toEqualTypeOf<
      Intl.RelativeTimeFormatNumeric | undefined
    >();
    expectTypeOf<FormatRelativeAgeOptions["style"]>().toEqualTypeOf<
      Intl.RelativeTimeFormatStyle | undefined
    >();
  });
});

describe("unsupported browser notice", () => {
  it("keeps the mandatory alert role out of consumer props", () => {
    expectTypeOf<"role">().not.toExtend<keyof UnsupportedBrowserNoticeProps>();
  });
});

describe("button element forms", () => {
  it("requires href on the anchor form", () => {
    expectTypeOf<ButtonAsAnchorProps["as"]>().toEqualTypeOf<"a">();
    expectTypeOf<ButtonAsAnchorProps["href"]>().toEqualTypeOf<string>();
    expectTypeOf<{ as: "a" }>().not.toExtend<ButtonAsAnchorProps>();
  });

  it("forbids href on the native button form", () => {
    expectTypeOf<ButtonAsButtonProps["href"]>().toEqualTypeOf<undefined>();
    expectTypeOf<{ href: "/docs" }>().not.toExtend<ButtonAsButtonProps>();
  });
});

describe("action bar stickiness", () => {
  it("accepts only the edge literals", () => {
    expectTypeOf<ActionBarSticky>().toEqualTypeOf<
      "bottom" | "top" | "viewport-bottom"
    >();
  });

  it("rejects a boolean sticky prop", () => {
    expectTypeOf<boolean>().not.toExtend<ActionBarSticky>();
    expectTypeOf<boolean>().not.toExtend<
      ComponentProps<typeof ActionBar>["sticky"]
    >();
  });
});

describe("data grid accessible name", () => {
  it("keeps both naming props optional at the type level", () => {
    // A mutually-required union of aria-label and aria-labelledby is not
    // expressible here without breaking the react-aria collection spread, so
    // the component enforces the name at runtime by throwing. The unit suite
    // covers the throw; these assertions pin the deliberate type shape.
    expectTypeOf<DataGridProps<unknown>["aria-label"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<DataGridProps<unknown>["aria-labelledby"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("requires replay-safe dynamic column arrays", () => {
    interface ColumnData {
      readonly key: string;
    }
    expectTypeOf<DataGridProps<unknown, ColumnData>["columns"]>().toEqualTypeOf<
      readonly ColumnData[] | undefined
    >();
    expectTypeOf<Set<ColumnData>>().not.toExtend<
      DataGridProps<unknown, ColumnData>["columns"]
    >();
  });
});

describe("exact optional public props", () => {
  it("accepts explicit undefined for custom optional props", () => {
    expectTypeOf<{ gap: undefined }>().toExtend<Pick<StackProps, "gap">>();
    expectTypeOf<{ density: undefined }>().toExtend<
      Pick<DataGridProps<unknown>, "density">
    >();
    expectTypeOf<{ width: undefined }>().toExtend<Pick<DialogProps, "width">>();
    expectTypeOf<{ layout: undefined }>().toExtend<
      Pick<LabeledFieldProps, "layout">
    >();
  });
});
