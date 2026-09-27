/**
 * Keeps the values that GitHub, npm, and the release scripts each read from a
 * different file in step: the CI Node matrix, the required release checks,
 * the devEngines floors, and the hosted visual-baseline families.
 */
import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readPackageJson, repositoryPath } from "../../scripts/lib/paths.mjs";
import {
  CI_WORKFLOW_PATH,
  REQUIRED_RELEASE_CHECKS,
} from "../../scripts/lib/release-checks.mjs";
import {
  hostedSnapshotVariants,
  missingSnapshotFiles,
  orphanSnapshotFiles,
  PANEL_SNAPSHOT_DIRECTORY,
  PANEL_SPEC,
} from "../../scripts/lib/snapshot-families.mjs";
import {
  expandMatrixName,
  readInlineList,
  readJobNames,
  readScalarValues,
} from "../../scripts/lib/workflow-matrix.mjs";

const ciWorkflow = readFileSync(repositoryPath(CI_WORKFLOW_PATH), "utf8");
const refreshWorkflow = readFileSync(
  repositoryPath(".github", "workflows", "update-baselines.yml"),
  "utf8",
);
const panelSpec = readFileSync(repositoryPath(PANEL_SPEC), "utf8");
const packageJson = await readPackageJson();

/** The devEngines Node floors, as bare versions. */
const nodeFloors = packageJson.devEngines.runtime.version
  .split("||")
  .map((part) => part.trim().replace(/^\^/, ""));

const nodeMatrix = readInlineList(ciWorkflow, "node");
const architectures = readScalarValues(ciWorkflow, "architecture");
const packageLabels = readScalarValues(ciWorkflow, "label");
/** The values a CI job name expands over, by matrix key. */
const matrixValues = {
  architecture: architectures,
  label: packageLabels,
  node: nodeMatrix,
};
const ciJobNames = readJobNames(ciWorkflow).flatMap((name) => {
  const key = Object.keys(matrixValues).find((candidate) =>
    name.includes(`matrix.${candidate}`),
  );
  return key === undefined
    ? [name]
    : expandMatrixName(name, key, matrixValues[key]);
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
    expect(nodeFloors).toHaveLength(nodeMatrix.length);
    for (const floor of nodeFloors) {
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

  /*
   * Every standalone `node-version` in the workflow claims to be the floor
   * from devEngines or a floating major line. Only the matrix was checked
   * before, so moving the floor left the standalone pins testing against a
   * version the package no longer declares, with their comments still saying
   * otherwise.
   */
  it("sets up Node at a declared floor or a floating major everywhere", () => {
    const versions = readScalarValues(ciWorkflow, "node-version").filter(
      (version) => !version.includes("${{"),
    );
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      const floating = /^\d+$/.test(version);
      expect(
        floating || nodeFloors.includes(version),
        `node-version ${version} is neither a devEngines floor nor a floating major`,
      ).toBe(true);
    }
  });

  it("names one package-validation job per platform label", () => {
    expect(packageLabels).toEqual(["Windows", "macOS"]);
    expect(requiredCiChecks).toContain("Windows package validation");
    // macOS reports without blocking, so it must not become a required check.
    expect(requiredCiChecks).not.toContain("macOS package validation");
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

  it("has a committed baseline for every screenshot in every family", () => {
    const present = readdirSync(repositoryPath(PANEL_SNAPSHOT_DIRECTORY));
    for (const variant of ciVariants) {
      expect(
        missingSnapshotFiles(panelSpec, variant, present),
        `Refresh the ${variant} family through the Update visual baselines workflow.`,
      ).toEqual([]);
    }
  });

  it("keeps no baseline a renamed or deleted screenshot left behind", () => {
    const present = readdirSync(repositoryPath(PANEL_SNAPSHOT_DIRECTORY));
    for (const variant of ciVariants) {
      expect(
        orphanSnapshotFiles(panelSpec, variant, present),
        `Delete the ${variant} images no screenshot in ${PANEL_SPEC} asks for.`,
      ).toEqual([]);
    }
  });
});
