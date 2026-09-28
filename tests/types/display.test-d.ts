import type { ComponentProps, ReactNode, Ref } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  BannerProps,
  Card,
  FreshnessNoteLabels,
  FreshnessNoteProps,
  LiveRegionProps,
  MetricProps,
  PanelLabels,
  RelativeAgeTimestamp,
  SectionProps,
  StackProps,
  StatusIndicatorProps,
  UnitContent,
} from "../../src/index.js";

/**
 * The display components' announcing and structural props. A rename here
 * must fail to compile at the old call site, which is why the retired names
 * are pinned as absent rather than left to fall out of the types.
 */
describe("announcing components", () => {
  it("defers the first message under a name that reads the right way round", () => {
    expectTypeOf<LiveRegionProps>().not.toHaveProperty("announceOnMount");
    expectTypeOf<LiveRegionProps["deferFirstMessage"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<BannerProps["deferFirstMessage"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<StatusIndicatorProps["deferFirstMessage"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<MetricProps["deferFirstMessage"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it("lets a region wait for its text to settle", () => {
    expectTypeOf<LiveRegionProps["settleMs"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<StatusIndicatorProps["settleMs"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<MetricProps["settleMs"]>().toEqualTypeOf<number | undefined>();
  });
});

describe("layout structure", () => {
  it("names a card through the native attributes only", () => {
    type CardProps = ComponentProps<typeof Card>;
    expectTypeOf<CardProps>().not.toHaveProperty("labelledBy");
    expectTypeOf<CardProps["aria-labelledby"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<CardProps["aria-label"]>().toEqualTypeOf<string | undefined>();
  });

  it("shows a metric's unit in the shape the fields take", () => {
    expectTypeOf<MetricProps["unit"]>().toEqualTypeOf<
      UnitContent | undefined
    >();
  });

  it("divides a stack and leads a section header", () => {
    expectTypeOf<StackProps["divided"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<SectionProps["leading"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
  });
});

describe("freshness readout", () => {
  it("takes the sample time and the panel's own stale verdict", () => {
    expectTypeOf<FreshnessNoteProps["since"]>().toEqualTypeOf<
      RelativeAgeTimestamp | null | undefined
    >();
    expectTypeOf<FreshnessNoteProps["stale"]>().toEqualTypeOf<boolean>();
    expectTypeOf<{ since: null }>().not.toExtend<FreshnessNoteProps>();
    expectTypeOf<FreshnessNoteProps["ref"]>().toEqualTypeOf<
      Ref<HTMLSpanElement> | undefined
    >();
    expectTypeOf<"children">().not.toExtend<keyof FreshnessNoteProps>();
  });

  it("keys its labels prop exactly like the bundle group", () => {
    expectTypeOf<FreshnessNoteLabels>().toEqualTypeOf<
      NonNullable<PanelLabels["freshnessNote"]>
    >();
    expectTypeOf<keyof FreshnessNoteLabels>().toEqualTypeOf<
      | "fresh"
      | "freshAnnouncement"
      | "freshUnknown"
      | "pending"
      | "stale"
      | "staleAnnouncement"
      | "staleUnknown"
    >();
  });
});
