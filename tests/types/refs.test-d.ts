import type { ComponentProps, Ref, RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { Accordion, CheckboxGroupProps } from "../../src/composites.js";
import type {
  Badge,
  Banner,
  Button,
  Checkbox,
  CollapsibleSection,
  FieldGroup,
  InlineConfirm,
  InputGroupAddon,
  LabeledField,
  Metric,
  NumberFieldProps,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  SegmentedControlProps,
  Select,
  StatusIndicator,
  Textarea,
  TextInput,
  ThemeToggle,
} from "../../src/index.js";

/**
 * Public ref targets are versioned API. These assertions fail if a component
 * loses its documented ref or resolves it to the wrong native element.
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
    expectTypeOf<ComponentProps<typeof LabeledField>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<ComponentProps<typeof ThemeToggle>["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<NumberFieldProps["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >();
    expectTypeOf<NumberFieldProps["inputRef"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >();
    expectTypeOf<CheckboxGroupProps<string>["ref"]>().toEqualTypeOf<
      Ref<HTMLFieldSetElement> | undefined
    >();
  });

  it("resolves each single-root component ref to the element it renders", () => {
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
