/**
 * The part of a view a media query needs, so a module-scope constant can ask
 * the global scope the same way a component asks its owning window.
 */
interface MediaQueryView {
  readonly matchMedia?: (
    query: string,
  ) => { readonly matches: boolean } | undefined;
}

/**
 * Whether a view matches a media query, for a view that may not implement one.
 *
 * Pass the window that owns the element the answer is about, usually
 * `element.ownerDocument.defaultView`, which is null for a document no window
 * presents. jsdom implements neither `matchMedia` nor these queries, so the
 * lookup is feature detected rather than assumed and an unanswerable query
 * reads as unmatched.
 */
export function mediaMatches(
  view: MediaQueryView | null | undefined,
  query: string,
): boolean {
  return view?.matchMedia?.(query)?.matches === true;
}

/**
 * Reports the user's reduced-motion preference for a given view. A view that
 * cannot answer reads as "motion is fine".
 */
export function prefersReducedMotion(view: Window | null | undefined): boolean {
  return mediaMatches(view, "(prefers-reduced-motion: reduce)");
}
