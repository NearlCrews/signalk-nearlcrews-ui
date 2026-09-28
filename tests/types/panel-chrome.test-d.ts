import type { ReactNode, RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  SaveActionBarAction,
  SaveActionBarFocusTarget,
  SaveActionBarOutcome,
  SaveActionBarProps,
} from "../../src/composites.js";
import type {
  InlineConfirmProps,
  PanelErrorBoundaryProps,
  PanelLabelDefaults,
  PanelLabels,
  PanelShellProps,
  SemanticTone,
  ThemeChoice,
  ThemeToggleProps,
} from "../../src/index.js";
import { PANEL_LABEL_DEFAULTS, useResetDrafts } from "../../src/index.js";

/**
 * The panel chrome's localization surface: one route per string, the bundle
 * and the props keyed alike, and a defaults table a consumer test can read
 * but never change.
 */
describe("panel label defaults", () => {
  it("fills every bundle group except the bound-built number messages", () => {
    expectTypeOf<keyof PanelLabelDefaults>().toEqualTypeOf<
      Exclude<keyof PanelLabels, "numberField">
    >();
    expectTypeOf(PANEL_LABEL_DEFAULTS).toEqualTypeOf<PanelLabelDefaults>();
    expectTypeOf(PANEL_LABEL_DEFAULTS.saveActionBar.clean).toBeString();
    expectTypeOf(
      PANEL_LABEL_DEFAULTS.themeToggle.choiceLabels.auto,
    ).toBeString();
    expectTypeOf(PANEL_LABEL_DEFAULTS.unsupportedBrowser.title).toBeString();
  });

  it("is readonly at every level", () => {
    // @ts-expect-error a group cannot be replaced
    PANEL_LABEL_DEFAULTS.saveActionBar = {
      ...PANEL_LABEL_DEFAULTS.saveActionBar,
    };
    // @ts-expect-error a string cannot be replaced
    PANEL_LABEL_DEFAULTS.saveActionBar.clean = "";
    // @ts-expect-error a nested choice name cannot be replaced
    PANEL_LABEL_DEFAULTS.themeToggle.choiceLabels.auto = "";
  });
});

describe("theme selector names", () => {
  it("names each choice through choiceLabels in the prop and the bundle", () => {
    expectTypeOf<ThemeToggleProps["choiceLabels"]>().toEqualTypeOf<
      Partial<Readonly<Record<ThemeChoice, ReactNode>>> | undefined
    >();
    expectTypeOf<
      NonNullable<PanelLabels["themeToggle"]>["choiceLabels"]
    >().toEqualTypeOf<
      Partial<Readonly<Record<ThemeChoice, string>>> | undefined
    >();
  });

  it("keeps choices for the offered set and retires the per-choice labels prop", () => {
    expectTypeOf<ThemeToggleProps["choices"]>().toEqualTypeOf<
      readonly ThemeChoice[] | undefined
    >();
    expectTypeOf<"labels">().not.toExtend<keyof ThemeToggleProps>();
    expectTypeOf<"choices">().not.toExtend<
      keyof NonNullable<PanelLabels["themeToggle"]>
    >();
  });
});

describe("panel shell localization routes", () => {
  it("names an untitled inline confirmation from the bundle only", () => {
    expectTypeOf<InlineConfirmProps>().not.toHaveProperty("fallbackTitle");
    expectTypeOf<
      NonNullable<PanelLabels["inlineConfirm"]>["fallbackTitle"]
    >().toEqualTypeOf<string | undefined>();
  });

  it("takes the error and compatibility text from its labels bundle only", () => {
    expectTypeOf<"errorLabels">().not.toExtend<keyof PanelShellProps>();
    expectTypeOf<"unsupportedLabels">().not.toExtend<keyof PanelShellProps>();
    expectTypeOf<PanelShellProps["labels"]>().toEqualTypeOf<
      PanelLabels | undefined
    >();
    expectTypeOf<
      keyof NonNullable<PanelLabels["unsupportedBrowser"]>
    >().toEqualTypeOf<"description" | "title">();
  });

  it("describes the error fallback per variant", () => {
    expectTypeOf<PanelErrorBoundaryProps["description"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<PanelErrorBoundaryProps["reloadDescription"]>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf<keyof NonNullable<PanelLabels["panelError"]>>().toEqualTypeOf<
      "description" | "reload" | "reloadDescription" | "retry" | "title"
    >();
  });
});

describe("save action bar focus and outcome", () => {
  it("lets either action return where focus goes next", () => {
    expectTypeOf<() => void>().toExtend<SaveActionBarProps["onSave"]>();
    expectTypeOf<() => HTMLElement>().toExtend<SaveActionBarProps["onSave"]>();
    expectTypeOf<() => RefObject<HTMLInputElement | null>>().toExtend<
      SaveActionBarProps["onSave"]
    >();
    expectTypeOf<() => null>().toExtend<SaveActionBarProps["onDiscard"]>();
    // An async handler compiled against the plain `() => void` these props
    // had before, and a panel that awaits its own validation still does.
    expectTypeOf<() => Promise<void>>().toExtend<
      SaveActionBarProps["onSave"]
    >();
    expectTypeOf<() => Promise<void>>().toExtend<
      SaveActionBarProps["onDiscard"]
    >();
    expectTypeOf<
      SaveActionBarProps["onSave"]
    >().toEqualTypeOf<SaveActionBarAction>();
    expectTypeOf<
      SaveActionBarProps["onDiscard"]
    >().toEqualTypeOf<SaveActionBarAction>();
    expectTypeOf<SaveActionBarFocusTarget>().toEqualTypeOf<
      HTMLElement | RefObject<HTMLElement | null> | null | undefined
    >();
  });

  it("presents an outcome the panel heard back, with a semantic tone", () => {
    expectTypeOf<SaveActionBarProps["outcome"]>().toEqualTypeOf<
      SaveActionBarOutcome | null | undefined
    >();
    expectTypeOf<SaveActionBarOutcome>().toEqualTypeOf<{
      readonly message: string;
      readonly tone: SemanticTone;
    }>();
  });
});

describe("panel draft reset", () => {
  it("hands a discard handler one call that takes and returns nothing", () => {
    expectTypeOf(useResetDrafts).parameters.toEqualTypeOf<[]>();
    expectTypeOf(useResetDrafts).returns.toEqualTypeOf<() => void>();
  });
});
