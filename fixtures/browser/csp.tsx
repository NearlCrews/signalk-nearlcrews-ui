import { Button, PanelRoot } from "signalk-nearlcrews-ui";
import { Progress } from "signalk-nearlcrews-ui/composites";
import { mountFixture } from "./mount.js";

declare const __CSP_FIXTURE_NONCE__: string;
declare const __CSP_WRONG_NONCE__: string;

/*
 * A panel under a Content-Security-Policy that admits one style nonce, for
 * tests/browser/csp.spec.ts. The dev server sets the policy as a header on
 * this page alone, and the `mode` query picks the nonce the panel hands its
 * style elements: the one the policy admits, one it refuses, or none. The
 * page links no stylesheet of its own, since the policy would refuse that
 * too. Progress is here because it installs a module sheet, which has to
 * carry the nonce as the root sheet does.
 */

/** The nonce the panel passes for a mode; any other mode passes none. */
function styleNonceFor(mode: string | null): string | undefined {
  if (mode === "matching") return __CSP_FIXTURE_NONCE__;
  if (mode === "wrong") return __CSP_WRONG_NONCE__;
  return undefined;
}

mountFixture(
  <PanelRoot
    styleNonce={styleNonceFor(
      new URLSearchParams(window.location.search).get("mode"),
    )}
  >
    <Button variant="primary">CSP target</Button>
    <Progress label="CSP progress" value={50} />
  </PanelRoot>,
);
