/**
 * Reports the user's reduced-motion preference for a given view.
 *
 * jsdom implements neither matchMedia nor the media query, so the lookup is
 * feature detected rather than assumed, and a missing implementation reads as
 * "motion is fine".
 */
export function prefersReducedMotion(view: unknown): boolean {
  const candidate = view as
    | {
        matchMedia?: (query: string) => { matches: boolean } | undefined;
      }
    | null
    | undefined;
  return (
    candidate?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ===
    true
  );
}
