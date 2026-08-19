import { isAbsolute, relative, resolve } from "node:path";

export const COVERAGE_FLOORS = Object.freeze({
  branches: 65,
  functions: 85,
  lines: 82,
  statements: 80,
});

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

export function assertPerFileCoverage(
  summary,
  { repositoryRoot, floors = COVERAGE_FLOORS },
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
  for (const [metricName, floor] of Object.entries(floors)) {
    if (
      !Object.hasOwn(COVERAGE_FLOORS, metricName) ||
      typeof floor !== "number" ||
      !Number.isFinite(floor) ||
      floor < 0 ||
      floor > 100
    ) {
      throw new Error(`Invalid per-file ${metricName} coverage floor.`);
    }
  }

  assertCoverageRecord(summary.total, "Coverage total");
  const sourceRoot = resolve(repositoryRoot, "src");
  const files = Object.entries(summary).filter(([name]) => name !== "total");

  const failures = [];
  let sourceFileCount = 0;
  for (const [name, record] of files) {
    const filePath = isAbsolute(name)
      ? resolve(name)
      : resolve(repositoryRoot, name);
    const sourceName = relative(sourceRoot, filePath);
    if (sourceName.startsWith("..") || isAbsolute(sourceName)) {
      continue;
    }
    if (sourceName.length === 0 || !/\.tsx?$/.test(sourceName)) {
      throw new Error(
        `Coverage summary contains an invalid src file: ${name}.`,
      );
    }

    sourceFileCount += 1;
    assertCoverageRecord(record, `Coverage for src/${sourceName}`);
    for (const [metricName, floor] of Object.entries(floors)) {
      const metric = record[metricName];
      if (metric.total === 0) {
        continue;
      }
      const percentage = metric.pct;
      if (percentage < floor) {
        failures.push(
          `src/${sourceName} ${metricName} ${percentage}% is below ${floor}%`,
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

  if (sourceFileCount === 0) {
    throw new Error("Coverage summary does not contain any source files.");
  }

  return sourceFileCount;
}
