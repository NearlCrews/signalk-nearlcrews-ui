import { onTestFinished } from "vitest";

/**
 * An element appended to `parent` for the length of one spec. It is removed
 * when the spec finishes, whether it passed or threw, so a failed assertion
 * cannot leave the node, or the focus it held, for the next spec.
 */
export function attached<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent: ParentNode = document.body,
): HTMLElementTagNameMap[K] {
  // A parent inside a frame gets an element from its own document.
  const element = (parent.ownerDocument ?? document).createElement(tag);
  parent.append(element);
  onTestFinished(() => {
    element.remove();
  });
  return element;
}
