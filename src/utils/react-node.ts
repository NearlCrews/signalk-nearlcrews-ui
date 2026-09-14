import { Children, Fragment, isValidElement, type ReactNode } from "react";

/**
 * A run of whitespace, hoisted because {@link reactNodeText} recurses once per
 * element child and would otherwise build the pattern per node of the tree.
 */
const WHITESPACE_RUN = /\s+/g;

/**
 * Throws when a required slot carries no rendered content. Blank text and
 * empty fragments count as absent, so a component never ships an unnamed
 * control or an untitled surface.
 */
export function requireContent(node: ReactNode, message: string): void {
  if (!hasReactContent(node)) throw new Error(message);
}

export function hasReactContent(node: ReactNode): boolean {
  // The single-node answers come first. This is the most called helper in the
  // package, several times per render of every field, card, and banner, and
  // the slot is almost always absent, one string, or one element, none of
  // which needs the array Children.toArray builds and re-keys.
  if (node === null || node === undefined || typeof node === "boolean") {
    return false;
  }
  if (typeof node === "string") return node.trim().length > 0;
  if (typeof node === "number") return true;
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return node.type !== Fragment || hasReactContent(node.props.children);
  }

  return Children.toArray(node).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (isValidElement<{ children?: ReactNode }>(child)) {
      return child.type !== Fragment || hasReactContent(child.props.children);
    }
    return true;
  });
}

/**
 * Requires a control to carry a name at compile time. A component that accepts
 * `label` beside an older naming prop composes its base props with this, so
 * omitting both is a type error rather than a render-time throw. `Legacy` is
 * the older prop, `children` on most controls and `legend` on the ones that
 * once rendered a fieldset.
 */
export type WithLabel<Legacy extends string> =
  | ({ readonly label: ReactNode } & Partial<
      Readonly<Record<Legacy, ReactNode | undefined>>
    >)
  | ({ readonly label?: ReactNode | undefined } & Readonly<
      Record<Legacy, ReactNode>
    >);

/**
 * Resolves the label a control renders from its `label` prop and the older
 * naming prop it still accepts, and refuses to render an unnamed control.
 * `WithLabel` above requires one of the two at compile time; this is the
 * runtime half, where a blank string or an empty fragment counts as absent.
 */
export function resolveLabelContent(
  label: ReactNode,
  legacy: ReactNode,
  message: string,
): ReactNode {
  const content = hasReactContent(label) ? label : legacy;
  requireContent(content, message);
  return content;
}

/** The props a text walk reads off an element child. */
interface TextBearingProps {
  readonly "aria-hidden"?: boolean | "false" | "true" | undefined;
  readonly children?: ReactNode;
  readonly hidden?: boolean | undefined;
}

/**
 * Concatenates the text a node renders, descending into element children and
 * skipping hidden and aria-hidden elements, as an accessible name would.
 * Components that render text internally contribute nothing, so a node made of
 * such components needs an explicit text value from its caller.
 */
export function reactNodeText(node: ReactNode): string {
  const fragments: string[] = [];
  for (const child of Children.toArray(node)) {
    if (typeof child === "string" || typeof child === "number") {
      fragments.push(String(child));
    } else if (isValidElement<TextBearingProps>(child)) {
      const { "aria-hidden": ariaHidden, hidden } = child.props;
      if (ariaHidden === true || ariaHidden === "true" || hidden === true) {
        continue;
      }
      fragments.push(reactNodeText(child.props.children));
    }
  }
  // Siblings are separate boxes on screen, so they read as separate words:
  // joined edge to edge, two spans reading "Delete" and "route" would run
  // together into one word and typeahead on the second word would never
  // match. Runs of whitespace collapse so the join does not double a space the
  // caller wrote.
  return fragments.join(" ").replace(WHITESPACE_RUN, " ");
}

/**
 * The text a node renders when it is only strings and numbers, and undefined
 * for anything else, including blank text.
 *
 * The strict answer is for a caller that must either have the real text or
 * treat the node as opaque, such as a grid cell deciding whether it can supply
 * its own text value. A lone string is the overwhelmingly common case and runs
 * once per visible cell per render, so it is taken without allocating the
 * array `Children.toArray` would build around it.
 */
export function plainReactNodeText(node: ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") {
    const only = String(node);
    return only.trim() === "" ? undefined : only;
  }

  const parts = Children.toArray(node);
  if (parts.length === 0) return undefined;

  let text = "";
  for (const part of parts) {
    if (typeof part !== "string" && typeof part !== "number") return undefined;
    text += String(part);
  }
  return text.trim() === "" ? undefined : text;
}
