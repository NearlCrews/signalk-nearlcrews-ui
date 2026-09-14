import type { ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Mounts a browser fixture into the page's root element.
 *
 * Both fixture entries mount the same way, under `StrictMode` so a double
 * invocation surfaces here rather than in a consumer's panel, and both are
 * driven by the same Playwright suite, so the bootstrap is written once and a
 * change to how a fixture mounts reaches both.
 */
export function mountFixture(children: ReactNode): void {
  const container = document.querySelector("#root");
  if (!(container instanceof HTMLElement)) {
    throw new Error("Browser fixture root was not found.");
  }

  createRoot(container).render(<StrictMode>{children}</StrictMode>);
}
