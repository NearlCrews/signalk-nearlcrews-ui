import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createFederationShared,
  HOST_NOTES,
  renderFederationEntry,
  SIGNALK_HOST_SHARED_MODULES,
} from "../../scripts/lib/federation-share.mjs";

const peerDependencies = { react: "^19.2.0", "react-dom": "^19.2.0" };

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
    const directory = mkdtempSync(join(tmpdir(), "snui-federation-"));
    try {
      const entryPath = join(directory, "federation.cjs");
      writeFileSync(entryPath, cjs);
      const loaded = createRequire(import.meta.url)(entryPath);
      expect(loaded.shared).toEqual(shared);
      expect(loaded.hostNotes).toBe(HOST_NOTES);
      expect([...loaded.SIGNALK_HOST_SHARED_MODULES]).toEqual([
        "react",
        "react-dom",
      ]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
    expect(cjs).toContain("signalk-nearlcrews-ui 0.9.0");
    expect(dts).toContain('"react" | "react-dom"');
    expect(dts).toContain("export declare const shared");
    expect(dts).toContain("export declare const hostNotes: string");
  });

  it("explains the non-strict singleton decision", () => {
    expect(HOST_NOTES).toContain("2.24.0");
    expect(HOST_NOTES).toContain("React.version");
    expect(HOST_NOTES).toContain("strictVersion");
  });
});
