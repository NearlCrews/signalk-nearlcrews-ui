import type { ComponentProps, ReactElement, ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  ActionBar,
  ActionBarSticky,
  AnnouncementMode,
  BannerTone,
  ButtonAsAnchorProps,
  ButtonAsButtonProps,
  DataGridProps,
  FieldControlProps,
  LabeledFieldChild,
  LabeledFieldControlProps,
  ProgressTone,
  SegmentedControlOption,
  SegmentedControlProps,
  StatusTone,
  TextInput,
  TextInputType,
  ThemeChoice,
} from "../../src/index.js";
import { SegmentedControl } from "../../src/index.js";

/**
 * The public type surface is part of the package contract: these assertions
 * fail when a literal union widens, a required prop goes optional, or a
 * generic stops flowing into the props that consume it.
 */
describe("segmented control generics", () => {
  type Mode = "minimal" | "normal" | "verbose";

  it("flows the value type into onChange and options", () => {
    expectTypeOf<SegmentedControlProps<Mode>["onChange"]>().toEqualTypeOf<
      (value: Mode) => void
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
      legend: "Log detail",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "normal", label: "Normal" },
      ] as const,
      onChange: (value) => {
        expectTypeOf(value).toEqualTypeOf<"minimal" | "normal">();
      },
    });
    expectTypeOf(element).toEqualTypeOf<React.JSX.Element>();
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

  it("rejects plain text, unrelated elements, and wrong render functions", () => {
    expectTypeOf<string>().not.toExtend<LabeledFieldChild>();
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

describe("literal unions", () => {
  it("pins the theme choices", () => {
    expectTypeOf<ThemeChoice>().toEqualTypeOf<
      "auto" | "light" | "dark" | "night"
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
    expectTypeOf<ActionBarSticky>().toEqualTypeOf<"bottom" | "top">();
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
});
