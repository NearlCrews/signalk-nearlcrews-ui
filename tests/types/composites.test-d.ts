import type { ComponentProps, ErrorInfo, Ref, RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type {
  Accordion,
  SaveActionBarProps,
  TableProps,
  TabsActivation,
} from "../../src/composites.js";
import type {
  AnnouncementMode,
  Badge,
  BannerLive,
  CardDensity,
  CollapsibleSection,
  Density,
  FormatRelativeAgeOptions,
  InputGroup,
  InputGroupAddon,
  InputGroupDensity,
  LiveRegionProps,
  Metric,
  Orientation,
  PanelShellProps,
  RelativeAgeProps,
  Section,
  StackProps,
  StatusIndicator,
  TextTone,
  ThemeChoice,
  UnsupportedBrowserNoticeProps,
} from "../../src/index.js";
import { isThemeChoice, PACKAGE_VERSION } from "../../src/index.js";

/**
 * Type-level contract for the 0.9.0 additions: element-typed layout props,
 * the shared variant vocabularies, refs on single-root components, and the
 * new root and composite exports.
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
  it("pins Density and Orientation", () => {
    expectTypeOf<Density>().toEqualTypeOf<"default" | "compact">();
    expectTypeOf<Orientation>().toEqualTypeOf<"horizontal" | "vertical">();
    expectTypeOf<CardDensity>().toEqualTypeOf<
      "default" | "compact" | "flush"
    >();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    expectTypeOf<InputGroupDensity>().toEqualTypeOf<Density | "comfortable">();
    expectTypeOf<ComponentProps<typeof InputGroup>["density"]>().toEqualTypeOf<
      Density | "comfortable" | undefined
    >();
    expectTypeOf<TableProps["density"]>().toEqualTypeOf<Density | undefined>();
  });

  it("types live regions with AnnouncementMode and keeps the Banner alias", () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    expectTypeOf<BannerLive>().toEqualTypeOf<AnnouncementMode>();
    expectTypeOf<LiveRegionProps["live"]>().toEqualTypeOf<
      AnnouncementMode | undefined
    >();
    expectTypeOf<TextTone>().toEqualTypeOf<
      "neutral" | "muted" | "info" | "success" | "warning" | "danger"
    >();
    expectTypeOf<TabsActivation>().toEqualTypeOf<"automatic" | "manual">();
  });
});

describe("refs on single-root components", () => {
  it("resolves each ref to the element the component renders", () => {
    expectTypeOf<ComponentProps<typeof Section>["ref"]>().toEqualTypeOf<
      Ref<HTMLElement> | undefined
    >();
    expectTypeOf<
      ComponentProps<typeof CollapsibleSection>["ref"]
    >().toEqualTypeOf<Ref<HTMLElement> | undefined>();
    expectTypeOf<ComponentProps<typeof Accordion>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Metric>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Badge>["ref"]>().toEqualTypeOf<
      Ref<HTMLSpanElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof StatusIndicator>["ref"]>().toEqualTypeOf<
      Ref<HTMLSpanElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof InputGroupAddon>["ref"]>().toEqualTypeOf<
      Ref<HTMLSpanElement> | undefined
    >();
  });
});

describe("new root exports", () => {
  it("exposes the heading level on the compatibility notice and keeps role out", () => {
    expectTypeOf<UnsupportedBrowserNoticeProps["headingLevel"]>().toEqualTypeOf<
      1 | 2 | 3 | 4 | 5 | 6 | undefined
    >();
    expectTypeOf<"role">().not.toExtend<keyof UnsupportedBrowserNoticeProps>();
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
