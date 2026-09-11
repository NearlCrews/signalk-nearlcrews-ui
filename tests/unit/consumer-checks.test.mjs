import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  assertConfiguredShares,
  assertConsumedShares,
  assertExactPin,
  assertNoReactRuntime,
  assertProductionJsxRuntime,
  assertSizeBaseline,
  assertVersionStamp,
  DEVELOPMENT_JSX_MARKERS,
  encodeRequiredVersion,
  findConsumedShares,
  findVersionStamps,
  gzipBytesOf,
  REACT_RUNTIME_MARKERS,
} from "../../bin/lib/consumer-checks.mjs";

const shared = {
  react: { singleton: true, requiredVersion: "^19.2.0", import: false },
  "react-dom": { singleton: true, requiredVersion: "^19.2.0", import: false },
};

/** The shape Webpack 5 minifies a consume-shared registration into. */
const REMOTE_ENTRY =
  'l={90:()=>s("default","react",!1,[1,19,2,0]),91:()=>s("default","react-dom",!1,[1,19,2,0])}';

describe("exact pin", () => {
  const installed = { version: "0.9.0" };

  it("accepts an exact pin that matches the installed package", () => {
    expect(
      assertExactPin(
        { devDependencies: { "signalk-nearlcrews-ui": "0.9.0" } },
        installed,
      ),
    ).toBe("0.9.0");
    expect(
      assertExactPin(
        { dependencies: { "signalk-nearlcrews-ui": "0.9.0" } },
        installed,
      ),
    ).toBe("0.9.0");
  });

  it("rejects ranges, missing declarations, and installed drift", () => {
    expect(() =>
      assertExactPin(
        { devDependencies: { "signalk-nearlcrews-ui": "^0.9.0" } },
        installed,
      ),
    ).toThrow("must be pinned to an exact version such as 0.9.0, got ^0.9.0");
    expect(() => assertExactPin({ devDependencies: {} }, installed)).toThrow(
      "does not declare signalk-nearlcrews-ui",
    );
    expect(() =>
      assertExactPin(
        { devDependencies: { "signalk-nearlcrews-ui": "0.9.0" } },
        { version: "0.8.2" },
      ),
    ).toThrow(
      "package.json pins signalk-nearlcrews-ui 0.9.0, but node_modules/signalk-nearlcrews-ui is 0.8.2.",
    );
  });
});

describe("version stamp", () => {
  const chunk =
    'const f="0.9.0";jsx("div",{"data-snui-root":"","data-snui-version":"0.9.0"});"0.9.0"===o.getAttribute("data-snui-version")';

  it("finds every stamped version", () => {
    expect([...findVersionStamps(chunk)]).toEqual(["0.9.0"]);
    expect([
      ...findVersionStamps('[data-snui-version="0.8.2"] .snui-button'),
    ]).toEqual(["0.8.2"]);
    expect([
      ...findVersionStamps('[data-snui-version=\\"0.8.2\\"] .snui-button'),
    ]).toEqual(["0.8.2"]);
  });

  it("accepts a remote stamped with exactly the installed version", () => {
    expect(() =>
      assertVersionStamp(["/* remoteEntry */", chunk], "0.9.0"),
    ).not.toThrow();
  });

  it("rejects a remote without the library, with another version, or with two versions", () => {
    expect(() => assertVersionStamp(["nothing here"], "0.9.0")).toThrow(
      "does not contain data-snui-version",
    );
    expect(() => assertVersionStamp([chunk], "0.8.2")).toThrow(
      "stamps data-snui-version with 0.9.0; expected exactly 0.8.2.",
    );
    expect(() =>
      assertVersionStamp([chunk, '"data-snui-version":"0.8.2"'], "0.9.0"),
    ).toThrow(
      "stamps data-snui-version with 0.9.0, 0.8.2; expected exactly 0.9.0.",
    );
  });

  it("falls back to the bare literal when the minifier kept the version in a constant", () => {
    const hoisted = `const f="0.9.0",v="snui-root",b=\`.\${v}[data-snui-version="\${f}"]\`;jsx("div",{"data-snui-version":f})`;
    expect(() => assertVersionStamp([hoisted], "0.9.0")).not.toThrow();
    expect(() => assertVersionStamp([hoisted], "0.8.2")).toThrow(
      'carries data-snui-version but no "0.8.2" literal beside it',
    );
  });
});

describe("React runtime markers", () => {
  it("rejects each marker and passes clean output", () => {
    expect(() => assertNoReactRuntime("clean bundle")).not.toThrow();
    for (const marker of REACT_RUNTIME_MARKERS) {
      expect(() => assertNoReactRuntime(`x${marker}y`, "The chunk")).toThrow(
        `The chunk bundled a React runtime marker: ${marker}.`,
      );
    }
  });
});

describe("development JSX runtime markers", () => {
  it("names the file that carries a development runtime and passes clean files", () => {
    expect(() =>
      assertProductionJsxRuntime([
        { name: "remoteEntry.js", source: 'jsx("div")' },
      ]),
    ).not.toThrow();
    for (const marker of DEVELOPMENT_JSX_MARKERS) {
      expect(() =>
        assertProductionJsxRuntime(
          [
            { name: "remoteEntry.js", source: "clean" },
            { name: "main.chunk.js", source: `x${marker}y` },
          ],
          "The fixture",
        ),
      ).toThrow(
        `The fixture uses the React development JSX runtime: main.chunk.js contains ${marker}.`,
      );
    }
  });
});

describe("consumed shares", () => {
  it("reads the shares a remote entry consumes with their encoded ranges", () => {
    expect([...findConsumedShares(REMOTE_ENTRY)]).toEqual([
      ["react", "[1,19,2,0]"],
      ["react-dom", "[1,19,2,0]"],
    ]);
    expect([
      ...findConsumedShares(
        'loadSingletonVersionCheck("default", "react", false, [1, 19, 2, 0])',
      ),
    ]).toEqual([["react", "[1,19,2,0]"]]);
  });

  it("encodes caret ranges without Webpack and defers to Webpack when present", () => {
    expect(encodeRequiredVersion("^19.2.0")).toBe("[1,19,2,0]");
    expect(() => encodeRequiredVersion(">=19.2.0 <20.0.0")).toThrow(
      "only caret ranges such as ^19.2.0 are understood",
    );
    expect(encodeRequiredVersion("^19.2.0", () => [9, 9])).toBe("[9,9]");
  });

  it("accepts a remote that consumes exactly the published map", () => {
    expect(() => assertConsumedShares(REMOTE_ENTRY, shared)).not.toThrow();
  });

  it("rejects a missing, extra, or differently versioned share", () => {
    expect(() =>
      assertConsumedShares('s("default","react",!1,[1,19,2,0])', shared),
    ).toThrow(
      "consumes host shares react; the published share map is react, react-dom.",
    );
    expect(() =>
      assertConsumedShares(
        `${REMOTE_ENTRY},92:()=>s("default","react-aria",!1,[1,3,51,0])`,
        shared,
      ),
    ).toThrow("consumes host shares react, react-aria, react-dom");
    expect(() =>
      assertConsumedShares(
        's("default","react",!1,[1,19,0,0]),s("default","react-dom",!1,[1,19,2,0])',
        shared,
      ),
    ).toThrow(
      "requires react as [1,19,0,0]; the published share map requires ^19.2.0 ([1,19,2,0]).",
    );
  });
});

describe("configured shares", () => {
  it("accepts a configuration that spreads the published map", () => {
    expect(() => assertConfiguredShares({ ...shared }, shared)).not.toThrow();
  });

  it("rejects a strict, non-singleton, fallback, or extra share", () => {
    expect(() => assertConfiguredShares(undefined, shared)).toThrow(
      "has no ModuleFederationPlugin shared option",
    );
    expect(() =>
      assertConfiguredShares(
        { ...shared, react: { ...shared.react, strictVersion: true } },
        shared,
      ),
    ).toThrow("Spread `shared` from signalk-nearlcrews-ui/federation");
    expect(() =>
      assertConfiguredShares(
        { ...shared, react: { ...shared.react, import: undefined } },
        shared,
      ),
    ).toThrow("shares react as");
    expect(() =>
      assertConfiguredShares({ ...shared, "react-aria": shared.react }, shared),
    ).toThrow(
      "shares react, react-aria, react-dom; the published share map is react, react-dom.",
    );
  });
});

describe("size baseline", () => {
  const baseline = {
    gzipBytes: 1000,
    maximumIncreasePercent: 5,
    approvedCeilingGzipBytes: 1200,
  };

  it("sums gzip sizes", () => {
    const buffers = [Buffer.from("a".repeat(500)), Buffer.from("b".repeat(50))];
    expect(gzipBytesOf(buffers)).toBe(
      gzipSync(buffers[0], { level: 9 }).byteLength +
        gzipSync(buffers[1], { level: 9 }).byteLength,
    );
  });

  it("passes within the growth allowance and within the approved ceiling", () => {
    expect(assertSizeBaseline(1050, baseline)).toBe(
      "1050 gzip bytes, within 5% of the 1000-byte baseline",
    );
    expect(assertSizeBaseline(1150, baseline)).toBe(
      "1150 gzip bytes, 15.0% above the 1000-byte baseline and within the approved 1200-byte ceiling",
    );
  });

  it("fails above the ceiling, or above the allowance with no ceiling", () => {
    expect(() => assertSizeBaseline(1201, baseline)).toThrow(
      "1201 gzip bytes, 20.1% above the 1000-byte baseline and over the approved 1200-byte ceiling.",
    );
    expect(() =>
      assertSizeBaseline(1100, { gzipBytes: 1000, maximumIncreasePercent: 5 }),
    ).toThrow("over the 5% limit, with no approved ceiling.");
    expect(() => assertSizeBaseline(1, { gzipBytes: "1000" })).toThrow(
      "needs integer gzipBytes and a numeric maximumIncreasePercent",
    );
  });
});
