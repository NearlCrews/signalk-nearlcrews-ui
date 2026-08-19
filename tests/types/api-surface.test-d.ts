import type { ComponentProps, ReactElement, ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { ProgressTone } from "../../src/composites.js";
import type { DataGridProps } from "../../src/data-grid.js";
import type {
  ActionBar,
  ActionBarSticky,
  AnnouncementMode,
  BannerTone,
  ButtonAsAnchorProps,
  ButtonAsButtonProps,
  FieldControlProps,
  FormatRelativeAgeOptions,
  LabeledFieldChild,
  LabeledFieldControlProps,
  LabeledFieldProps,
  SegmentedControlOption,
  SegmentedControlProps,
  StackProps,
  StatusTone,
  TextInput,
  TextInputType,
  ThemeChoice,
  UnsupportedBrowserNoticeProps,
} from "../../src/index.js";
import { SegmentedControl } from "../../src/index.js";
import type { DialogProps } from "../../src/overlays.js";

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
