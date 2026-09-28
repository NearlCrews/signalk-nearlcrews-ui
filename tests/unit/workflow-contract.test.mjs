/**
 * Keeps the values that GitHub, npm, and the release scripts each read from a
 * different file in step: the CI Node matrix, the required release checks,
 * the devEngines floors, the hosted visual-baseline families, and the npm
 * bootstrap every workflow repeats.
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
  readSnapshotSpecs,
  SNAPSHOT_SPECS,
  snapshotDirectory,
  takesScreenshots,
} from "../../scripts/lib/snapshot-families.mjs";
import {
  expandMatrixName,
  readInlineList,
  readJobNames,
  readScalarValues,
  readSteps,
  stepBody,
} from "../../scripts/lib/workflow-matrix.mjs";

const ciWorkflow = readFileSync(repositoryPath(CI_WORKFLOW_PATH), "utf8");
const refreshWorkflow = readFileSync(
  repositoryPath(".github", "workflows", "update-baselines.yml"),
  "utf8",
);
const snapshotSpecs = await readSnapshotSpecs(repositoryPath);
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

  it("lists every browser spec that takes screenshots as a snapshot spec", () => {
    // Found by reading the specs, not the list, so a new spec that compares
    // screenshots cannot miss the family checks, the refresh upload, and
    // baselines:fetch.
    const takingScreenshots = readdirSync(repositoryPath("tests", "browser"))
      .filter((name) => name.endsWith(".spec.ts"))
      .map((name) => `tests/browser/${name}`)
      .filter((spec) =>
        takesScreenshots(readFileSync(repositoryPath(spec), "utf8")),
      )
      .sort();
    expect(
      takingScreenshots,
      "Add the spec to SNAPSHOT_SPECS in scripts/lib/snapshot-families.mjs.",
    ).toEqual([...SNAPSHOT_SPECS].sort());
  });

  it("has a committed baseline for every screenshot in every family", () => {
    for (const { present, source, spec } of snapshotSpecs) {
      for (const variant of ciVariants) {
        expect(
          missingSnapshotFiles(source, variant, present),
          `Refresh the ${variant} family of ${spec} through the Update visual baselines workflow, then run npm run baselines:fetch.`,
        ).toEqual([]);
      }
    }
  });

  it("keeps no baseline a renamed or deleted screenshot left behind", () => {
    for (const { present, source, spec } of snapshotSpecs) {
      for (const variant of ciVariants) {
        expect(
          orphanSnapshotFiles(source, variant, present),
          `Delete the ${variant} images in ${snapshotDirectory(spec)} that no screenshot in ${spec} asks for.`,
        ).toEqual([]);
      }
    }
  });

  it("uploads every snapshot directory from the refresh workflow", () => {
    for (const spec of SNAPSHOT_SPECS) {
      expect(refreshWorkflow).toContain(`${snapshotDirectory(spec)}/`);
    }
  });
});

/*
 * The npm bootstrap is written inline in every job that installs
 * dependencies. A local composite action would hold it once, but the workflow
 * security audit reports a GITHUB_PATH write inside one at high severity, and
 * the write has to happen: nested `npm run` calls resolve npm from PATH. So
 * the copies stay, and this holds every copy to one canonical body, so the
 * pin policy cannot change in one workflow and silently not in another.
 */
const NPM_BOOTSTRAP_BODIES = new Map([
  [
    "Set up npm",
    `env:
  NPM_CONFIG_PREFIX: \${{ runner.temp }}/npm-global
run: |
  npm install --global "npm@$(node -p "require('./package.json').devEngines.packageManager.version")"
  echo "\${NPM_CONFIG_PREFIX}/bin" >> "$GITHUB_PATH"
  "\${NPM_CONFIG_PREFIX}/bin/npm" --version`,
  ],
  [
    "Set up npm on Windows",
    `shell: pwsh
run: |
  $npmPrefix = Join-Path $env:RUNNER_TEMP "npm-global"
  $npmRange = node -p "require('./package.json').devEngines.packageManager.version"
  npm install --global "npm@$npmRange" --prefix $npmPrefix
  $npmPrefix | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
  & (Join-Path $npmPrefix "npm.cmd") --version`,
  ],
]);

describe("npm bootstrap steps", () => {
  const steps = readdirSync(repositoryPath(".github", "workflows"))
    .filter((name) => name.endsWith(".yml"))
    .flatMap((workflow) =>
      readSteps(
        readFileSync(repositoryPath(".github", "workflows", workflow), "utf8"),
      ).map((step) => ({ ...step, workflow })),
    );
  const bootstrapSteps = steps.filter((step) =>
    step.lines.some((line) =>
      line.includes("devEngines.packageManager.version"),
    ),
  );

  it("installs the pinned npm only in steps named for it", () => {
    expect(bootstrapSteps.length).toBeGreaterThan(0);
    for (const step of bootstrapSteps) {
      expect(
        [...NPM_BOOTSTRAP_BODIES.keys()],
        `${step.workflow} installs npm in a step named ${String(step.name)}`,
      ).toContain(step.name);
    }
  });

  it("writes every copy of the bootstrap exactly as the canonical body", () => {
    for (const [name, body] of NPM_BOOTSTRAP_BODIES) {
      const copies = steps.filter((step) => step.name === name);
      expect(copies.length, `no workflow has a ${name} step`).toBeGreaterThan(
        0,
      );
      for (const copy of copies) {
        expect(
          stepBody(copy),
          `${copy.workflow} has a ${name} step that differs from the canonical body; change every copy together`,
        ).toBe(body);
      }
    }
  });
});
