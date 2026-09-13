import { describe, expect, it, vi } from "vitest";

import {
  contractsMatch,
  fetchRegistryContract,
  formatContractDiff,
  parseRegistryContract,
} from "../../scripts/lib/host-contract.mjs";

const PACKAGE_NAME = "@signalk/server-admin-ui-dependencies";
const REGISTRY_RESULT = {
  version: "2.23.0",
  peerDependencies: {
    react: ">=19.2.0 <20.0.0",
    "react-dom": ">=19.2.0 <20.0.0",
  },
};

describe("host contract registry compatibility", () => {
  it("parses the npm 11 object format", () => {
    expect(
      parseRegistryContract(JSON.stringify(REGISTRY_RESULT), PACKAGE_NAME),
    ).toMatchObject({ package: PACKAGE_NAME, version: "2.23.0" });
  });

  it("parses the npm 12 one-element array format", () => {
    expect(
      parseRegistryContract(JSON.stringify([REGISTRY_RESULT]), PACKAGE_NAME),
    ).toMatchObject({ package: PACKAGE_NAME, version: "2.23.0" });
  });

  it("retries a bounded number of times and queries latest explicitly", async () => {
    const failure = Object.assign(new Error("registry body must stay hidden"), {
      status: 503,
    });
    const runNpm = vi
      .fn()
      .mockImplementationOnce(() => {
        throw failure;
      })
      .mockReturnValueOnce(JSON.stringify([REGISTRY_RESULT]));
    const wait = vi.fn();
    const report = vi.fn();

    await expect(
      fetchRegistryContract({
        contractPackage: PACKAGE_NAME,
        runNpm,
        wait,
        report,
      }),
    ).resolves.toMatchObject({ version: "2.23.0" });
    expect(runNpm).toHaveBeenCalledWith([
      "view",
      `${PACKAGE_NAME}@latest`,
      "version",
      "peerDependencies",
      "--json",
    ]);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      expect.stringContaining("npm view exited with status 503"),
    );
    expect(report).not.toHaveBeenCalledWith(
      expect.stringContaining("registry body must stay hidden"),
    );
  });

  it("prints focused drift diagnostics", () => {
    const committed = parseRegistryContract(
      JSON.stringify(REGISTRY_RESULT),
      PACKAGE_NAME,
    );
    const published = {
      ...committed,
      version: "2.24.0",
      peerDependencies: { react: ">=19.3.0 <20.0.0" },
    };

    expect(contractsMatch(committed, published)).toBe(false);
    expect(formatContractDiff(committed, published)).toBe(
      [
        "Host contract drift detected:",
        "- version: 2.23.0",
        "+ version: 2.24.0",
        "- peerDependencies.react: >=19.2.0 <20.0.0",
        "+ peerDependencies.react: >=19.3.0 <20.0.0",
        "- peerDependencies.react-dom: >=19.2.0 <20.0.0",
        "+ peerDependencies.react-dom: <missing>",
      ].join("\n"),
    );
  });

  it("orders peer dependency keys by code unit, not by the runtime locale", () => {
    const contract = parseRegistryContract(
      JSON.stringify({
        version: "2.23.0",
        peerDependencies: {
          react_native: "^19.2.0",
          "react.js": "^19.2.0",
          "react-dom": "^19.2.0",
        },
      }),
      PACKAGE_NAME,
    );

    expect(Object.keys(contract.peerDependencies)).toEqual([
      "react-dom",
      "react.js",
      "react_native",
    ]);
  });

  it("explains drift that no per-field branch describes", () => {
    const committed = parseRegistryContract(
      JSON.stringify(REGISTRY_RESULT),
      PACKAGE_NAME,
    );
    const published = {
      ...committed,
      peerDependencies: {
        "react-dom": committed.peerDependencies["react-dom"],
        react: committed.peerDependencies.react,
      },
    };

    expect(contractsMatch(committed, published)).toBe(false);
    expect(formatContractDiff(committed, published).split("\n")).toEqual([
      "Host contract drift detected:",
      `- peerDependencies: ${JSON.stringify(committed.peerDependencies)}`,
      `+ peerDependencies: ${JSON.stringify(published.peerDependencies)}`,
    ]);
  });

  it("stops after the bounded retry budget", async () => {
    const runNpm = vi.fn(() => {
      throw Object.assign(new Error("private registry response"), {
        status: 502,
      });
    });
    const report = vi.fn();

    await expect(
      fetchRegistryContract({
        contractPackage: PACKAGE_NAME,
        runNpm,
        wait: vi.fn(),
        report,
      }),
    ).rejects.toThrow(
      `Unable to read ${PACKAGE_NAME}@latest after 3 attempts. Last failure: npm view exited with status 502.`,
    );
    expect(runNpm).toHaveBeenCalledTimes(3);
    expect(report).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(report.mock.calls)).not.toContain(
      "private registry response",
    );
  });
});
