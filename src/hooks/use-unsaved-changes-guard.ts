import { useEffect } from "react";

/**
 * Asks the browser to confirm before the page unloads while `dirty` is true.
 * The browser owns the prompt and ignores custom wording, so none is offered.
 * Pair it with `SaveActionBar`: the same `dirty` flag drives both.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return undefined;

    const confirmUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", confirmUnload);
    return () => window.removeEventListener("beforeunload", confirmUnload);
  }, [dirty]);
}
