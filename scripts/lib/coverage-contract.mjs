import { isAbsolute, relative, resolve } from "node:path";

export const COVERAGE_FLOORS = Object.freeze({
  branches: 65,
  functions: 85,
  lines: 82,
  statements: 80,
});

/**
 * Floors for the published CLI under bin/lib and the release-gate modules
 * under scripts/lib.
 *
 * They sit below the src floors because these modules are tested through the
 * behavior a release depends on rather than line by line: a gate's failure
 * branches for a malformed manifest, an unreachable file, or a broken npm
 * invocation are proven by the gate itself failing in CI. The floors are set
 * under the measured numbers so an ordinary refactor passes, and high enough
 * that a module losing its tests does not.
 */
export const TOOLING_COVERAGE_FLOORS = Object.freeze({
  branches: 45,
  functions: 65,
  lines: 65,
  statements: 65,
});

/**
 * Where measured files live, with the floors, the file type, and the glob each
 * root takes. A summary entry outside every root, such as a test helper, is
 * not measured at all.
 *
 * Exported because the Vitest configuration measures the same partition, and a
 * root declared in one place and not the other would leave the per-file gate
 * quietly measuring nothing while the aggregate still passed. A unit test
 * holds the two lists together.
 */
export const COVERAGE_ROOTS = Object.freeze([
  Object.freeze({
    directory: "src",
    extension: /\.tsx?$/,
    files: "**/*.{ts,tsx}",
    key: "source",
  }),
  Object.freeze({
    directory: "bin/lib",
    extension: /\.mjs$/,
    files: "**/*.mjs",
    key: "tooling",
  }),
  Object.freeze({
    directory: "scripts/lib",
    extension: /\.mjs$/,
    files: "**/*.mjs",
    key: "tooling",
  }),
]);

function assertMetric(metric, description) {
  if (
    metric === null ||
    typeof metric !== "object" ||
    !Number.isInteger(metric.total) ||
    metric.total < 0 ||
    !Number.isInteger(metric.covered) ||
    metric.covered < 0 ||
    metric.covered > metric.total ||
    !Number.isInteger(metric.skipped) ||
    metric.skipped < 0 ||
    typeof metric.pct !== "number" ||
    !Number.isFinite(metric.pct) ||
    metric.pct < 0 ||
    metric.pct > 100
  ) {
    throw new Error(`${description} has an invalid coverage metric.`);
  }
}

function assertCoverageRecord(record, description) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${description} must be a coverage record.`);
  }
  for (const metricName of Object.keys(COVERAGE_FLOORS)) {
    assertMetric(record[metricName], `${description} ${metricName}`);
  }
}

function assertFloors(floors, description) {
  for (const [metricName, floor] of Object.entries(floors)) {
    if (
      !Object.hasOwn(COVERAGE_FLOORS, metricName) ||
      typeof floor !== "number" ||
      !Number.isFinite(floor) ||
      floor < 0 ||
      floor > 100
    ) {
      throw new Error(`Invalid ${description} ${metricName} coverage floor.`);
    }
  }
}

/** The root a summary entry belongs to, and its path relative to that root. */
function locateFile(roots, repositoryRoot, name) {
  const filePath = isAbsolute(name)
    ? resolve(name)
    : resolve(repositoryRoot, name);
  for (const { root, rootPath } of roots) {
    const withinRoot = relative(rootPath, filePath);
    if (
      withinRoot.length === 0 ||
      withinRoot.startsWith("..") ||
      isAbsolute(withinRoot)
    ) {
      continue;
    }
    return { root, relativeName: `${root.directory}/${withinRoot}` };
  }
  return undefined;
}

export function assertPerFileCoverage(
  summary,
  {
    repositoryRoot,
    floors = COVERAGE_FLOORS,
    toolingFloors = TOOLING_COVERAGE_FLOORS,
  },
) {
  if (
    summary === null ||
    typeof summary !== "object" ||
    Array.isArray(summary)
  ) {
    throw new Error("Coverage summary must be an object.");
  }
  if (typeof repositoryRoot !== "string" || !isAbsolute(repositoryRoot)) {
    throw new Error("Coverage repository root must be an absolute path.");
  }
  assertFloors(floors, "per-file");
  assertFloors(toolingFloors, "per-file tooling");

  assertCoverageRecord(summary.total, "Coverage total");
  const floorsByKey = { source: floors, tooling: toolingFloors };
  const files = Object.entries(summary).filter(([name]) => name !== "total");
  // Resolved once rather than once per root per summary entry, which is a
  // thousand redundant path resolutions on a summary of a few hundred files.
  const roots = COVERAGE_ROOTS.map((root) => ({
    root,
    rootPath: resolve(repositoryRoot, root.directory),
  }));

  const failures = [];
  let measuredFileCount = 0;
  for (const [name, record] of files) {
    const located = locateFile(roots, repositoryRoot, name);
    if (located === undefined) {
      continue;
    }
    const { root, relativeName } = located;
    if (!root.extension.test(relativeName)) {
      throw new Error(
        `Coverage summary contains an invalid ${root.directory} file: ${name}.`,
      );
    }

    measuredFileCount += 1;
    assertCoverageRecord(record, `Coverage for ${relativeName}`);
    for (const [metricName, floor] of Object.entries(floorsByKey[root.key])) {
      const metric = record[metricName];
      if (metric.total === 0) {
        continue;
      }
      const percentage = metric.pct;
      if (percentage < floor) {
        failures.push(
          `${relativeName} ${metricName} ${percentage}% is below ${floor}%`,
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Per-file coverage floors failed:\n${failures
        .map((failure) => `- ${failure}`)
        .join("\n")}`,
    );
  }

  if (measuredFileCount === 0) {
    throw new Error("Coverage summary does not contain any source files.");
  }

  return measuredFileCount;
}
