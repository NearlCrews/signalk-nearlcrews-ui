import process from "node:process";

import { describe, expect, it } from "vitest";

import { parseNpmPackResult, runNpmPack } from "../../scripts/lib/npm-pack.mjs";

const PACKAGE_NAME = "signalk-nearlcrews-ui";
const PACK_RESULT = {
  filename: "signalk-nearlcrews-ui-0.2.0.tgz",
  files: [{ path: "dist/index.js" }],
  size: 1024,
};

describe("npm pack JSON compatibility", () => {
  it("parses the npm 11 array format", () => {
    expect(
      parseNpmPackResult(JSON.stringify([PACK_RESULT]), PACKAGE_NAME),
    ).toEqual(PACK_RESULT);
  });

  it("parses the npm 12 package-keyed format", () => {
    expect(
      parseNpmPackResult(
        JSON.stringify({ [PACKAGE_NAME]: PACK_RESULT }),
        PACKAGE_NAME,
      ),
    ).toEqual(PACK_RESULT);
  });

  it("rejects ambiguous or malformed results", () => {
    for (const value of [
      [],
      [PACK_RESULT, PACK_RESULT],
      { [PACKAGE_NAME]: PACK_RESULT, unexpected: PACK_RESULT },
      { [PACKAGE_NAME]: { ...PACK_RESULT, files: [{ path: 42 }] } },
    ]) {
      expect(() =>
        parseNpmPackResult(JSON.stringify(value), PACKAGE_NAME),
      ).toThrow("npm pack returned an unexpected JSON result.");
    }
  });
});

it("requires the package script npm executable", () => {
  const originalNpmExecPath = process.env.npm_execpath;
  delete process.env.npm_execpath;

  try {
    expect(() => runNpmPack([])).toThrow(
      "Package validation must run through npm so npm_execpath is available.",
    );
  } finally {
    if (originalNpmExecPath === undefined) {
      delete process.env.npm_execpath;
    } else {
      process.env.npm_execpath = originalNpmExecPath;
    }
  }
});
