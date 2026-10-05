import { Children, Fragment, isValidElement, type ReactNode } from "react";

import { packageError } from "./errors.js";

/**
 * A run of whitespace, hoisted because {@link reactNodeText} recurses once per
 * element child and would otherwise build the pattern per node of the tree.
 */
const WHITESPACE_RUN = /\s+/g;

/**
 * Throws when a required slot carries no rendered content. Blank text and
 * empty fragments count as absent, so a component never ships an unnamed
 * control or an untitled surface.
 *
 * @internal
 */
export function requireContent(node: ReactNode, message: string): void {
  if (!hasReactContent(node)) throw packageError(message);
}

/**
 * Whether a node renders anything: blank text, booleans, and empty fragments
 * do not.
 *
 * @internal
 */
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

  // Each flattened child is a single node answered above. Anything else the
  // flattening yields, a portal for example, renders content of its own.
  return Children.toArray(node).some(
    (child) =>
      (typeof child !== "string" && !isValidElement(child)) ||
      hasReactContent(child),
  );
}

/**
 * Requires a control to carry a name at compile time. A component that accepts
 * `label` beside a second naming prop composes its base props with this, so
 * omitting both is a type error rather than a render-time throw. `Alias` is
 * that second prop, a permanent alternative rather than an older spelling:
 * `children` on `Switch` and `Radio`, and `legend` on `FieldGroup`, which
 * renders a real `<legend>`. When both carry content, `label` names the
 * control. `CheckboxGroup` takes the same `label` and `legend` pair, but its
 * props omit keys from `FieldGroupProps`, which leaves both optional, so it
 * refuses an unnamed group only at render.
 */
export type WithLabel<Alias extends string> =
  | ({ readonly label: ReactNode } & Partial<
      Readonly<Record<Alias, ReactNode | undefined>>
    >)
  | ({ readonly label?: ReactNode | undefined } & Readonly<
      Record<Alias, ReactNode>
    >);

/**
 * Resolves the label a control renders from its `label` prop and the alias
 * naming prop it also accepts, and refuses to render an unnamed control.
 * `label` decides when both carry content. `WithLabel` above requires one of
 * the two at compile time; this is the runtime half, where a blank string or
 * an empty fragment counts as absent.
 *
 * @internal
 */
export function resolveLabelContent(
  label: ReactNode,
  alias: ReactNode,
  message: string,
): ReactNode {
  const content = hasReactContent(label) ? label : alias;
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
 * skipping hidden and aria-hidden elements, as an accessible name would, with
 * no space at either end. Components that render text internally contribute
 * nothing, so a node made of such components needs an explicit text value
 * from its caller.
 *
 * @internal
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
  // caller wrote, and the ends are trimmed so no caller has to.
  return fragments.join(" ").replace(WHITESPACE_RUN, " ").trim();
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
 *
 * @internal
 */
export function plainReactNodeText(node: ReactNode): string | undefined {
  let text = "";
  if (typeof node === "string" || typeof node === "number") {
    text = String(node);
  } else {
    for (const part of Children.toArray(node)) {
      if (typeof part !== "string" && typeof part !== "number") {
        return undefined;
      }
      text += String(part);
    }
  }
  return text.trim() === "" ? undefined : text;
}
