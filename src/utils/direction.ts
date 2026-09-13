/**
 * Reads the text direction that applies to an element.
 *
 * The computed style rather than a `:dir()` selector, because the package
 * supports Chromium and Edge 118, which match no `:dir()` selector at all:
 * `element.matches(":dir(rtl)")` is false there in a right-to-left panel, so
 * arrow keys would walk the wrong way on the two oldest supported engines.
 * The computed direction is available on every supported engine.
 */
export function isRightToLeft(element: Element): boolean {
  const ownerWindow = element.ownerDocument.defaultView;
  if (ownerWindow === null) return false;
  return ownerWindow.getComputedStyle(element).direction === "rtl";
}
