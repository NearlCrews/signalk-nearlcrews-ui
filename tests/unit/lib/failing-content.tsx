/**
 * Panel content that fails to render while armed, shared by the specs for
 * PanelShell's error boundary and PanelErrorBoundary. A spec disarms it to
 * let the next render recover, and re-arms it after each test.
 */
export const failure = { armed: true };

/** Panel content that fails to render while `failure.armed` holds. */
export function Bomb(): React.JSX.Element {
  if (failure.armed) throw new Error("Panel content failed.");
  return <p>Recovered content</p>;
}
