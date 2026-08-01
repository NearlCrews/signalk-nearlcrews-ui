import type { ComponentProps, Ref, RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type {
  Banner,
  Button,
  Checkbox,
  FieldGroup,
  InlineConfirm,
  NumberInput,
  PanelRoot,
  RangeInput,
  SegmentedControlProps,
  Select,
  Textarea,
  TextInput,
} from "../../src/index.js";

/**
 * Stage 1 of the improvement plan requires an accurately typed `ref` on every
 * public prop contract. These assertions fail if a migrated component loses its
 * ref, or resolves to the wrong native element.
 */
describe("public ref types", () => {
  it("types each component ref against its native element", () => {
    expectTypeOf<ComponentProps<typeof Button>["ref"]>().toEqualTypeOf<
      Ref<HTMLButtonElement> | Ref<HTMLAnchorElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Banner>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof FieldGroup>["ref"]>().toEqualTypeOf<
      Ref<HTMLFieldSetElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof InlineConfirm>["ref"]>().toEqualTypeOf<
      Ref<HTMLElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof TextInput>["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof NumberInput>["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof RangeInput>["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Select>["ref"]>().toEqualTypeOf<
      Ref<HTMLSelectElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Textarea>["ref"]>().toEqualTypeOf<
      Ref<HTMLTextAreaElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof Checkbox>["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof PanelRoot>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<SegmentedControlProps<string>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
  });

  it("accepts object refs, callback refs, and callback-ref cleanup", () => {
    expectTypeOf<RefObject<HTMLButtonElement | null>>().toExtend<
      NonNullable<ComponentProps<typeof Button>["ref"]>
    >();
    expectTypeOf<(node: HTMLButtonElement | null) => void>().toExtend<
      NonNullable<ComponentProps<typeof Button>["ref"]>
    >();
    expectTypeOf<(node: HTMLButtonElement) => () => void>().toExtend<
      NonNullable<ComponentProps<typeof Button>["ref"]>
    >();
  });

  it("rejects a ref typed for the wrong element", () => {
    expectTypeOf<RefObject<HTMLDivElement | null>>().not.toExtend<
      NonNullable<ComponentProps<typeof Button>["ref"]>
    >();
  });
});

/**
 * `exactOptionalPropertyTypes` is enabled, so every optional public prop must
 * admit `undefined` or consumers cannot pass a computed optional value.
 */
describe("optional props under exactOptionalPropertyTypes", () => {
  it("accepts an explicitly undefined optional prop", () => {
    expectTypeOf<undefined>().toExtend<
      ComponentProps<typeof Button>["loadingLabel"]
    >();
    expectTypeOf<undefined>().toExtend<
      ComponentProps<typeof Button>["variant"]
    >();
    expectTypeOf<undefined>().toExtend<ComponentProps<typeof Banner>["tone"]>();
    expectTypeOf<undefined>().toExtend<
      ComponentProps<typeof PanelRoot>["styleNonce"]
    >();
    expectTypeOf<undefined>().toExtend<
      ComponentProps<typeof Checkbox>["indeterminate"]
    >();
  });
});
