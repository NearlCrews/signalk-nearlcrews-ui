import { useEffect } from "react";

/**
 * Asks the browser to confirm before the page unloads while `dirty` is true.
 * The browser owns the prompt and ignores custom wording, so none is offered.
 * Pair it with `SaveActionBar`: the same `dirty` flag drives both.
 *
 * It covers leaving the page, and only that. Signal K Admin is a single-page
 * application, so moving from one plugin panel to another is a client-side
 * route change that fires no unload at all, and mobile browsers fire the
 * event unreliably even when the page really goes. A panel that must stop
 * those departures has to intercept them itself, in the host router, and
 * raise its own confirmation.
 *
 * @param dirty Whether the panel holds edits that have not been saved.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return undefined;

    const confirmUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // Both, because the two ways of asking are not interchangeable across
      // the supported floor: Chromium and Edge below 119 prompt only when
      // returnValue is set, while the current specification asks for the
      // cancellation instead. The value itself is never shown: the browser
      // owns the wording.
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated property is the only lever the Chromium and Edge 118 floor reads, and the replacement it names is already called above.
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", confirmUnload);
    return () => window.removeEventListener("beforeunload", confirmUnload);
  }, [dirty]);
}
