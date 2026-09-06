import type { ComponentProps, ReactNode, Ref } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type {
  Column,
  DataGridColumnProps,
  DataGridDensity,
  DataGridProps,
} from "../../src/data-grid.js";
import type { ActionBar } from "../../src/index.js";
import type {
  AlertDialogProps,
  DialogProps,
  Menu,
  MenuItem,
  MenuItemProps,
  MenuSection,
  MenuSeparator,
  PopoverProps,
  ToastRegionProps,
} from "../../src/overlays.js";
import type { Density } from "../../src/utils/variants.js";

/**
 * Overlay and data-grid ref targets and prop vocabularies are versioned API.
 * These assertions fail if a component loses its ref, resolves it to the
 * wrong element, or drifts from the shared vocabularies.
 */
describe("overlay and data-grid ref types", () => {
  it("types each ref against its owning element", () => {
    expectTypeOf<ComponentProps<typeof Menu>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof MenuItem>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof MenuSection>["ref"]>().toEqualTypeOf<
      Ref<HTMLElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof MenuSeparator>["ref"]>().toEqualTypeOf<
      Ref<HTMLElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof ActionBar>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Column>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement | HTMLTableCellElement> | undefined
    >();
    expectTypeOf<ToastRegionProps["ref"]>().toEqualTypeOf<
      Ref<HTMLElement> | undefined
    >();
  });

  it("offers menu elements only the attributes React Aria forwards", () => {
    expectTypeOf<MenuItemProps>().toHaveProperty("style");
    expectTypeOf<MenuItemProps>().toHaveProperty("onPointerDown");
    expectTypeOf<MenuItemProps>().not.toHaveProperty("title");
    expectTypeOf<MenuItemProps>().not.toHaveProperty("onClick");
    expectTypeOf<MenuItemProps>().not.toHaveProperty("tabIndex");
    expectTypeOf<{ "data-testid": string }>().toExtend<
      Pick<MenuItemProps, "data-testid">
    >();
  });
});

describe("overlay prop vocabularies", () => {
  it("accepts a render function for dialog actions", () => {
    expectTypeOf<(close: () => void) => ReactNode>().toExtend<
      NonNullable<DialogProps["actions"]>
    >();
    expectTypeOf<ReactNode>().toExtend<DialogProps["actions"]>();
    expectTypeOf<(close: () => void) => ReactNode>().toExtend<
      NonNullable<AlertDialogProps["actions"]>
    >();
    expectTypeOf<undefined>().toExtend<DialogProps["keyboardDismissable"]>();
    expectTypeOf<undefined>().toExtend<DialogProps["onCancel"]>();
  });

  it("accepts a CSS length string for popover width", () => {
    expectTypeOf<"18rem">().toExtend<PopoverProps["width"]>();
    expectTypeOf<"auto">().toExtend<PopoverProps["width"]>();
    expectTypeOf<240>().toExtend<PopoverProps["width"]>();
    expectTypeOf<undefined>().toExtend<PopoverProps["width"]>();
  });

  it("types data-grid density with the shared vocabulary", () => {
    expectTypeOf<DataGridProps<unknown>["density"]>().toEqualTypeOf<
      Density | undefined
    >();
    // The alias is deprecated but must keep matching the shared union.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    expectTypeOf<DataGridDensity>().toEqualTypeOf<Density>();
    expectTypeOf<DataGridColumnProps["numeric"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<DataGridColumnProps["wrap"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });
});
