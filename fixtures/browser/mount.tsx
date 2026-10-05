import type { ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * Mounts a browser fixture into a root element of the page, `#root` unless
 * the page holds several, and returns the React root.
 *
 * Every fixture entry mounts the same way, under `StrictMode` so a double
 * invocation surfaces here rather than in a consumer's panel, and all are
 * driven by the same Playwright suite, so the bootstrap is written once and a
 * change to how a fixture mounts reaches all of them.
 */
export function mountFixture(children: ReactNode, rootId = "root"): Root {
  const container = document.querySelector(`#${rootId}`);
  if (!(container instanceof HTMLElement)) {
    throw new Error(`Browser fixture root #${rootId} was not found.`);
  }

  const root = createRoot(container);
  root.render(<StrictMode>{children}</StrictMode>);
  return root;
}
