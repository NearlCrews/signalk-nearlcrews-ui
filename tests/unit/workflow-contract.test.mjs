/**
 * Keeps the values that GitHub, npm, and the release scripts each read from a
 * different file in step: the CI Node matrix, the required release checks,
 * the devEngines floors, and the hosted visual-baseline families.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";
import { REQUIRED_RELEASE_CHECKS } from "../../scripts/lib/release-checks.mjs";
import { hostedSnapshotVariants } from "../../scripts/lib/snapshot-families.mjs";
import {
  expandMatrixName,
  readInlineList,
  readJobNames,
  readScalarValues,
} from "../../scripts/lib/workflow-matrix.mjs";

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const ciWorkflow = readFileSync(repositoryPath(CI_WORKFLOW_PATH), "utf8");
const refreshWorkflow = readFileSync(
  repositoryPath(".github", "workflows", "update-baselines.yml"),
  "utf8",
);
const panelSpec = readFileSync(
  repositoryPath("tests", "browser", "panel.spec.ts"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(repositoryPath("package.json"), "utf8"),
);

const nodeMatrix = readInlineList(ciWorkflow, "node");
const architectures = readScalarValues(ciWorkflow, "architecture");
const ciJobNames = readJobNames(ciWorkflow).flatMap((name) => {
  if (name.includes("matrix.node")) {
    return expandMatrixName(name, "node", nodeMatrix);
  }
  if (name.includes("matrix.architecture")) {
    return expandMatrixName(name, "architecture", architectures);
  }
  return [name];
});
const requiredCiChecks = REQUIRED_RELEASE_CHECKS.filter(
  (check) => check.workflowPath === CI_WORKFLOW_PATH,
).map((check) => check.name);

describe("CI matrix and required release checks", () => {
  it("names every required CI check as a job in ci.yml", () => {
    for (const name of requiredCiChecks) {
      expect(ciJobNames, `${name} must be a ci.yml job`).toContain(name);
    }
  });

  it("requires every Node matrix entry as a release check", () => {
    for (const node of nodeMatrix) {
      expect(requiredCiChecks).toContain(`Node ${node}`);
    }
    expect(
      requiredCiChecks.filter((name) => name.startsWith("Node ")),
    ).toHaveLength(nodeMatrix.length);
  });

  it("pins the devEngines Node floors in the matrix", () => {
    const floors = packageJson.devEngines.runtime.version
      .split("||")
      .map((part) => part.trim().replace(/^\^/, ""));
    expect(floors).toHaveLength(nodeMatrix.length);
    for (const floor of floors) {
      const [major, minor, patch] = floor.split(".");
      const pinned = nodeMatrix.includes(floor);
      const floating =
        nodeMatrix.includes(major) && minor === "0" && patch === "0";
      expect(
        pinned || floating,
        `devEngines floor ${floor} needs a matching ci.yml matrix entry`,
      ).toBe(true);
    }
  });

  it("keeps the full dependency audit out of the required checks", () => {
    expect(ciJobNames).toContain("Full dependency audit");
    expect(requiredCiChecks).not.toContain("Full dependency audit");
  });
});

describe("hosted visual-baseline families", () => {
  const ciVariants = hostedSnapshotVariants(ciWorkflow);

  it("names one browser job per hosted family", () => {
    expect(ciVariants).toHaveLength(architectures.length);
    for (const architecture of architectures) {
      expect(requiredCiChecks).toContain(`Browser tests (${architecture})`);
    }
  });

  it("refreshes exactly the families CI verifies", () => {
    expect(readScalarValues(refreshWorkflow, "snapshot_variant")).toEqual(
      ciVariants,
    );
  });

  it("checks exactly the families CI verifies in the browser meta-test", () => {
    const literal = /const CI_SNAPSHOT_VARIANTS = \[([^\]]*)\]/.exec(
      panelSpec,
    )?.[1];
    expect(
      literal,
      "panel.spec.ts must declare CI_SNAPSHOT_VARIANTS",
    ).toBeDefined();
    const specVariants = [...(literal ?? "").matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    expect(
      specVariants,
      "tests/browser/panel.spec.ts CI_SNAPSHOT_VARIANTS must equal the ci.yml browser matrix snapshot_variant values",
    ).toEqual(ciVariants);
  });
});
