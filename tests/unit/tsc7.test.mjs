import { spawnSync } from "node:child_process";
import process from "node:process";
import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";

describe("scripts/tsc7.mjs", () => {
  it("runs the TypeScript 7 compiler regardless of which package owns the tsc bin link", () => {
    const result = spawnSync(
      process.execPath,
      [repositoryPath("scripts", "tsc7.mjs"), "--version"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^Version 7\./);
  });
});
