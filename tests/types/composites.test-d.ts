import type { ComponentProps, ErrorInfo, ReactNode, RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type {
  DisclosureProps,
  SaveActionBarProps,
  TableProps,
  TabPanelProps,
  TabProps,
  TabsActivation,
  TabsProps,
  UseDisclosureOptions,
} from "../../src/composites.js";
import type {
  AnnouncementMode,
  CardDensity,
  Density,
  FormatRelativeAgeOptions,
  InputGroup,
  LiveRegionProps,
  PanelShellProps,
  RelativeAgeProps,
  StackProps,
  TextTone,
  ThemeChoice,
  UnsupportedBrowserNoticeProps,
} from "../../src/index.js";
import { isThemeChoice, PACKAGE_VERSION } from "../../src/index.js";

/**
 * Type-level contract for the layout and composite surface: element-typed
 * layout props, the shared variant vocabularies, the tab value type, the
 * disclosure id options, and the root and composite exports that carry no
 * spec of their own.
 */
describe("polymorphic layout props", () => {
  it("admits form attributes and a form ref only under as=form", () => {
    expectTypeOf<{
      as: "form";
      action: string;
      noValidate: boolean;
    }>().toExtend<StackProps>();
    expectTypeOf<{
      as: "form";
      ref: RefObject<HTMLFormElement | null>;
    }>().toExtend<StackProps>();
    expectTypeOf<{ action: string }>().not.toExtend<StackProps>();
    expectTypeOf<{
      ref: RefObject<HTMLFormElement | null>;
    }>().not.toExtend<StackProps>();
  });

  it("keeps the div default with its own attributes", () => {
    expectTypeOf<{ gap: 3; align: "center" }>().toExtend<StackProps>();
    expectTypeOf<{
      as: "div";
      ref: RefObject<HTMLDivElement | null>;
    }>().toExtend<StackProps>();
    expectTypeOf<{
      as: "ul";
      ref: RefObject<HTMLUListElement | null>;
    }>().toExtend<StackProps>();
  });
});

describe("shared vocabularies", () => {
  it("pins CardDensity, the density props, and the tone and activation unions", () => {
    expectTypeOf<CardDensity>().toEqualTypeOf<
      "default" | "compact" | "flush"
    >();
    expectTypeOf<ComponentProps<typeof InputGroup>["density"]>().toEqualTypeOf<
      Density | undefined
    >();
    expectTypeOf<TableProps["density"]>().toEqualTypeOf<Density | undefined>();
    expectTypeOf<TextTone>().toEqualTypeOf<
      "neutral" | "muted" | "info" | "success" | "warning" | "danger"
    >();
    expectTypeOf<TabsActivation>().toEqualTypeOf<"automatic" | "manual">();
  });

  it("types live regions with AnnouncementMode", () => {
    expectTypeOf<LiveRegionProps["live"]>().toEqualTypeOf<
      AnnouncementMode | undefined
    >();
    // Anything that changes per announcement: a counter or an event id.
    expectTypeOf<LiveRegionProps["announceKey"]>().toEqualTypeOf<
      string | number | undefined
    >();
  });
});

describe("tab values", () => {
  it("carries the consumer's union through every tab part", () => {
    type Category = "engine" | "nav";
    expectTypeOf<TabsProps<Category>["value"]>().toEqualTypeOf<
      Category | undefined
    >();
    expectTypeOf<TabsProps<Category>["defaultValue"]>().toEqualTypeOf<
      Category | undefined
    >();
    expectTypeOf<TabsProps<Category>["onValueChange"]>().toEqualTypeOf<
      ((value: Category) => void) | undefined
    >();
    expectTypeOf<TabProps<Category>["value"]>().toEqualTypeOf<Category>();
    expectTypeOf<TabPanelProps<Category>["value"]>().toEqualTypeOf<Category>();
    // A tab written with a value outside the union fails to compile rather
    // than dropping the press at runtime.
    expectTypeOf<{ value: "engnie" }>().not.toExtend<
      Pick<TabProps<Category>, "value">
    >();
  });

  it("keeps the plain string shape for a reference carrying no value type", () => {
    expectTypeOf<TabsProps["value"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<TabsProps["onValueChange"]>().toEqualTypeOf<
      ((value: string) => void) | undefined
    >();
    expectTypeOf<TabProps["value"]>().toEqualTypeOf<string>();
    expectTypeOf<TabPanelProps["value"]>().toEqualTypeOf<string>();
  });

  it("takes a function child on a panel beside plain children", () => {
    expectTypeOf<ReactNode>().toExtend<TabPanelProps["children"]>();
    expectTypeOf<() => ReactNode>().toExtend<TabPanelProps["children"]>();
    // The child is a thunk, so nothing tempts a consumer to read a selected
    // flag the panel does not pass.
    expectTypeOf<(selected: boolean) => ReactNode>().not.toExtend<
      TabPanelProps["children"]
    >();
  });
});

describe("disclosure ids", () => {
  it("names the trigger, the pair, or neither", () => {
    expectTypeOf<UseDisclosureOptions["id"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<UseDisclosureOptions["idPrefix"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<{
      children: ReactNode;
      id: string;
      idPrefix: string;
    }>().toExtend<DisclosureProps>();
  });
});

describe("root exports", () => {
  it("exposes the heading level on the compatibility notice", () => {
    expectTypeOf<UnsupportedBrowserNoticeProps["headingLevel"]>().toEqualTypeOf<
      1 | 2 | 3 | 4 | 5 | 6 | undefined
    >();
  });

  it("types the relative age surfaces", () => {
    expectTypeOf<FormatRelativeAgeOptions["negative"]>().toEqualTypeOf<
      "clamp" | "fallback" | undefined
    >();
    expectTypeOf<RelativeAgeProps["since"]>().toEqualTypeOf<
      number | string | Date | null | undefined
    >();
    expectTypeOf<RelativeAgeProps["as"]>().toEqualTypeOf<
      "time" | "span" | undefined
    >();
  });

  it("guards theme choices and exposes the version", () => {
    expectTypeOf(isThemeChoice).guards.toEqualTypeOf<ThemeChoice>();
    expectTypeOf(PACKAGE_VERSION).toBeString();
  });

  it("requires the save bar callbacks and the shell content", () => {
    expectTypeOf<SaveActionBarProps>().toHaveProperty("dirty");
    expectTypeOf<{ dirty: boolean }>().not.toExtend<SaveActionBarProps>();
    expectTypeOf<PanelShellProps["themeToggle"]>().toEqualTypeOf<
      "end" | "between" | "none" | undefined
    >();
    // The div's native onError is replaced by the boundary callback.
    expectTypeOf<PanelShellProps["onError"]>().toEqualTypeOf<
      ((error: unknown, info: ErrorInfo) => void) | undefined
    >();
  });
});
