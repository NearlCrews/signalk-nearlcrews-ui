import { prefersReducedMotion } from "./motion.js";

/**
 * The focused element, when the owning document has focused a real element at
 * all. `activeElement` is typed as `Element`, is null between documents, and
 * is the body when nothing is focused, so every caller that wants somewhere to
 * put focus back narrows it the same way.
 */
export function focusedElement(ownerDocument: Document): HTMLElement | null {
  const ownerWindow = ownerDocument.defaultView;
  const target = ownerDocument.activeElement;
  if (ownerWindow === null) return null;
  return target instanceof ownerWindow.HTMLElement ? target : null;
}

/**
 * Whether focus has fallen to the document body, which is where a close that
 * had nowhere to hand focus back to leaves it. The body is what
 * `activeElement` reports when nothing is focused, so the test that a reader
 * was left nowhere is written once rather than per overlay.
 */
export function focusIsOnBody(ownerDocument: Document): boolean {
  return ownerDocument.activeElement === ownerDocument.body;
}

/**
 * Puts focus on the panel root itself, the destination of last resort.
 *
 * The root is not normally focusable, so it borrows a tabindex for the one
 * move that has no better destination and gives it back on blur. An overlay
 * that closes while the element it was opened from is gone would otherwise
 * leave focus on the document body, which costs a keyboard user their place
 * and makes them tab in from the top of the host page.
 */
export function focusPanelRoot(panelRoot: HTMLElement): void {
  let returnTabIndex: (() => void) | undefined;
  if (!panelRoot.hasAttribute("tabindex")) {
    const release = (): void => {
      panelRoot.removeAttribute("tabindex");
    };
    panelRoot.setAttribute("tabindex", "-1");
    panelRoot.addEventListener("blur", release, { once: true });
    returnTabIndex = () => {
      panelRoot.removeEventListener("blur", release);
      release();
    };
  }
  panelRoot.focus({ preventScroll: true });
  // A root that refused the focus hands the attribute back now: the blur that
  // would return it never comes, and a tabindex left behind makes the root a
  // click-focus target for the rest of the panel's life.
  if (panelRoot.ownerDocument.activeElement !== panelRoot) returnTabIndex?.();
}

export interface RevealOptions {
  /** Where the element lands in the scrollport. Defaults to `"nearest"`. */
  readonly block?: ScrollLogicalPosition | undefined;
}

/**
 * Scrolls an element into view before something happens to it.
 *
 * Reduced-motion users get an instant jump instead of a smooth scroll, and
 * jsdom implements no `scrollIntoView` at all, so both are feature detected
 * rather than assumed.
 */
export function revealElement(
  element: HTMLElement,
  { block = "nearest" }: RevealOptions = {},
): void {
  const reduceMotion = prefersReducedMotion(element.ownerDocument.defaultView);
  const scrollable = element as {
    scrollIntoView?: (options: ScrollIntoViewOptions) => void;
  };
  scrollable.scrollIntoView?.({
    behavior: reduceMotion ? "auto" : "smooth",
    block,
  });
}

/**
 * Brings an element on screen and then focuses it, in that order, so the
 * reader arrives at content that is already visible rather than at a control
 * the browser has to scroll to on its own.
 */
export function revealAndFocus(
  element: HTMLElement,
  options?: RevealOptions,
): void {
  revealElement(element, options);
  element.focus();
}
