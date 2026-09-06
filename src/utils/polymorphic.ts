import {
  type ComponentPropsWithRef,
  createElement,
  type ReactNode,
} from "react";

type IntrinsicElement = keyof React.JSX.IntrinsicElements;

/**
 * Props for a component that renders one of several intrinsic elements chosen
 * by `as`. The union is discriminated on `as`, so `as="form"` admits form
 * attributes and the ref resolves to the element actually rendered. The
 * default element leaves `as` optional; every other element requires it. A
 * computed `as` of the whole element union falls back to the attributes every
 * HTML element shares.
 */
export type PolymorphicProps<
  Element extends IntrinsicElement,
  DefaultElement extends Element,
  OwnProps extends object,
> =
  | {
      [E in Element]: OwnProps &
        Omit<ComponentPropsWithRef<E>, keyof OwnProps | "as"> &
        (E extends DefaultElement
          ? { readonly as?: E | undefined }
          : { readonly as: E });
    }[Element]
  | (OwnProps &
      Omit<ComponentPropsWithRef<"div">, keyof OwnProps | "as" | "ref"> & {
        readonly as: Element;
        readonly ref?: React.Ref<HTMLElement> | undefined;
      });

/**
 * Creates the element a polymorphic component resolved. The props union and
 * the `as` union are correlated by construction but not in a way TypeScript
 * can follow, so this is the one place the pairing is asserted.
 */
export function createPolymorphicElement(
  as: IntrinsicElement,
  props: object,
  ...children: readonly ReactNode[]
): React.JSX.Element {
  return createElement(as, props as Record<string, unknown>, ...children);
}
