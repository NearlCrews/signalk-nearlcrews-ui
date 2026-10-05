import { afterEach } from "vitest";

/**
 * Panel content that fails to render while armed, shared by the specs for
 * PanelShell's error boundary, PanelErrorBoundary, and the panel labels. A
 * spec disarms it to let the next render recover, and the fixture re-arms
 * itself after each test: the hook below lands on the root suite of the file
 * that imports this module, and each spec file loads its own copy of it.
 */
export const failure = { armed: true };

afterEach(() => {
  failure.armed = true;
});

/** Panel content that fails to render while `failure.armed` holds. */
export function Bomb(): React.JSX.Element {
  if (failure.armed) throw new Error("Panel content failed.");
  return <p>Recovered content</p>;
}
