import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";
import { runNode, runNodeWith } from "./lib/run-node.mjs";

const SCRIPT = repositoryPath("scripts", "fetch-baselines.mjs");

describe("fetch-baselines", () => {
  it("names the usage for a missing or malformed run id", () => {
    for (const args of [[], ["abc"], ["1", "2"]]) {
      const result = runNode(SCRIPT, ...args);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Usage: npm run baselines:fetch");
    }
  });

  it("refuses an option, since the script takes none", () => {
    const result = runNode(SCRIPT, "--run", "1");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--run is not an option this check takes.");
  });

  it("says the GitHub CLI is needed instead of a bare ENOENT", () => {
    // An empty PATH leaves no gh to find, so nothing is downloaded.
    const result = runNodeWith({ env: { PATH: "" } }, SCRIPT, "123");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("The GitHub CLI (gh) is required");
  });
});
