import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";
import {
  archiveUrl,
  compareVersions,
  findOutdatedTools,
  PINNED_TOOL_RELEASES,
  PINNED_TOOLS_PATH,
  versionFromTag,
} from "../../scripts/lib/pinned-tools.mjs";
import { readSteps } from "../../scripts/lib/workflow-matrix.mjs";

const pins = JSON.parse(
  readFileSync(repositoryPath(...PINNED_TOOLS_PATH.split("/")), "utf8"),
);

/** Every workflow step that installs a pinned tool, by tool. */
const installSteps = readdirSync(repositoryPath(".github", "workflows"))
  .filter((name) => name.endsWith(".yml"))
  .flatMap((name) =>
    readSteps(
      readFileSync(repositoryPath(".github", "workflows", name), "utf8"),
    ).map((step) => ({ ...step, workflow: name })),
  )
  .filter((step) => /^Install (\w+)$/.test(step.name ?? ""));

/** The URL an install step downloads, with the pinned version filled in. */
function downloadedUrl(step, version) {
  const text = step.lines.join("\n");
  const archive = /archive="([^"]+)"/.exec(text)?.[1];
  const url = /url="([^"]+)"/.exec(text)?.[1];
  if (archive === undefined || url === undefined) {
    throw new Error(`${step.workflow}: ${step.name} sets no archive and url.`);
  }
  // The shell variables the step expands, as they appear in its text.
  const fill = (value) => value.replaceAll(`\${version}`, version);
  return fill(url).replaceAll(`\${archive}`, fill(archive));
}

describe("pinned tool releases", () => {
  it("knows the release source of every pinned tool", () => {
    expect(Object.keys(PINNED_TOOL_RELEASES).sort()).toEqual(
      Object.keys(pins).sort(),
    );
  });

  it("builds the archive URL every workflow install step downloads", () => {
    for (const tool of Object.keys(pins)) {
      const steps = installSteps.filter(
        (step) => step.name === `Install ${tool}`,
      );
      expect(steps.length, `no workflow installs ${tool}`).toBeGreaterThan(0);
      for (const step of steps) {
        expect(downloadedUrl(step, pins[tool].version), step.workflow).toBe(
          archiveUrl(tool, pins[tool].version),
        );
      }
    }
  });

  it("reads versions from release tags and ignores other tags", () => {
    expect(versionFromTag("zizmor", "v1.30.1")).toBe("1.30.1");
    expect(versionFromTag("lychee", "lychee-v0.24.2")).toBe("0.24.2");
    expect(versionFromTag("lychee", "v0.24.2")).toBeUndefined();
    expect(versionFromTag("actionlint", "v1.8.0-rc.1")).toBeUndefined();
  });

  it("orders versions numerically", () => {
    expect(compareVersions("1.30.1", "1.29.0")).toBeGreaterThan(0);
    expect(compareVersions("1.9.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
    expect(() => compareVersions("2.0", "2.0.0")).toThrow(
      "2.0 is not an x.y.z version.",
    );
  });

  it("reports each tool with a newer release and its archive checksum", async () => {
    const latest = new Map([
      ["rhysd/actionlint", "v1.7.12"],
      ["zizmorcore/zizmor", "v1.30.1"],
    ]);
    const outdated = await findOutdatedTools(
      {
        actionlint: { sha256: "a".repeat(64), version: "1.7.12" },
        zizmor: { sha256: "b".repeat(64), version: "1.29.0" },
      },
      {
        archiveChecksum: async (url) => `checksum of ${url}`,
        latestTag: async (repository) => latest.get(repository),
      },
    );
    const url = archiveUrl("zizmor", "1.30.1");
    expect(outdated).toEqual([
      {
        latest: "1.30.1",
        pinned: "1.29.0",
        sha256: `checksum of ${url}`,
        tool: "zizmor",
        url,
      },
    ]);
  });

  it("fails on a release tag it cannot read and a tool it does not know", async () => {
    const network = {
      archiveChecksum: async () => "",
      latestTag: async () => "nightly",
    };
    await expect(
      findOutdatedTools({ zizmor: { version: "1.29.0" } }, network),
    ).rejects.toThrow(
      "The latest zizmorcore/zizmor release is tagged nightly, which does not name a zizmor version.",
    );
    await expect(
      findOutdatedTools({ shellcheck: { version: "0.10.0" } }, network),
    ).rejects.toThrow("pins shellcheck, which has no release source");
  });
});
