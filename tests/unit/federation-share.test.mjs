import { createRequire } from "node:module";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  createFederationShared,
  HOST_NOTES,
  renderFederationEntry,
  SIGNALK_HOST_SHARED_MODULES,
} from "../../scripts/lib/federation-share.mjs";
import { removeTemporaryTrees, temporaryTree } from "./lib/temporary-tree.mjs";

const peerDependencies = { react: "^19.2.0", "react-dom": "^19.2.0" };

afterAll(removeTemporaryTrees);

describe("federation share map", () => {
  it("shares exactly the host-guaranteed modules as non-strict singletons without fallback", () => {
    expect([...SIGNALK_HOST_SHARED_MODULES]).toEqual(["react", "react-dom"]);
    const shared = createFederationShared(peerDependencies);
    expect(shared).toEqual({
      react: { singleton: true, requiredVersion: "^19.2.0", import: false },
      "react-dom": {
        singleton: true,
        requiredVersion: "^19.2.0",
        import: false,
      },
    });
    expect(Object.isFrozen(shared)).toBe(true);
    expect("strictVersion" in shared.react).toBe(false);
  });

  it("requires a peer range for every shared module", () => {
    expect(() => createFederationShared({ react: "^19.2.0" })).toThrow(
      "peerDependencies must declare react-dom",
    );
  });

  it("renders a CommonJS entry that loads with the same map and notes", () => {
    const { cjs, dts, shared } = renderFederationEntry(
      peerDependencies,
      "0.9.0",
    );
    const directory = temporaryTree("snui-federation-", {
      "federation.cjs": cjs,
    });
    const loaded = createRequire(import.meta.url)(
      join(directory, "federation.cjs"),
    );
    expect(loaded.shared).toEqual(shared);
    expect(Object.isFrozen(loaded.shared)).toBe(true);
    for (const share of Object.values(loaded.shared)) {
      expect(Object.isFrozen(share)).toBe(true);
    }
    expect(loaded.hostNotes).toBe(HOST_NOTES);
    expect([...loaded.SIGNALK_HOST_SHARED_MODULES]).toEqual([
      "react",
      "react-dom",
    ]);
    expect(cjs).toContain("signalk-nearlcrews-ui 0.9.0");
    expect(dts).toContain('"react" | "react-dom"');
    expect(dts).toContain("export declare const shared");
    expect(dts).toContain("export declare const hostNotes: string");
  });

  it("explains the non-strict singleton decision", () => {
    expect(HOST_NOTES).toContain("React.version");
    expect(HOST_NOTES).toContain("strictVersion");
  });

  it("bounds the hosts that under-report React to the releases that did", () => {
    // Read from the Admin loader source at the release tags: 2.24.0 and
    // 2.25.0 register 19.0.0, and 2.26.0 onward registers React.version.
    expect(HOST_NOTES).toContain(
      "Signal K Admin 2.24.0 and 2.25.0 register their React share as 19.0.0 while shipping a newer React; every release from 2.26.0 registers React.version.",
    );
    expect(HOST_NOTES).toContain(
      "A strictVersion check would therefore refuse to mount on those two supported hosts",
    );
    expect(HOST_NOTES).not.toContain("up to at least");
    expect(HOST_NOTES).not.toContain("current master");
  });

  it("says what a host with an older React shows, with and without the shell", () => {
    // PanelShell checks the host's React before it renders and shows its
    // compatibility notice; only a panel composed without it reaches the
    // error boundary.
    expect(HOST_NOTES).toContain(
      "on a host whose React really is older the share resolves, and PanelShell renders its compatibility notice naming both versions; a panel composed without the shell fails inside its error boundary.",
    );
    expect(HOST_NOTES).not.toContain("the panel then fails");
  });
});
