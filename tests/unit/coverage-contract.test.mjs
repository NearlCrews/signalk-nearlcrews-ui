import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertPerFileCoverage,
  COVERAGE_FLOORS,
} from "../../scripts/lib/coverage-contract.mjs";

const repositoryRoot = "/workspace/project";

function metric(pct, total = 100) {
  return {
    total,
    covered: Math.floor((pct * total) / 100),
    skipped: 0,
    pct,
  };
}

function record(percentages = {}) {
  return {
    branches: metric(percentages.branches ?? 90),
    functions: metric(percentages.functions ?? 90),
    lines: metric(percentages.lines ?? 95),
    statements: metric(percentages.statements ?? 95),
  };
}

describe("per-file coverage contract", () => {
  it("accepts every covered source file at or above the floors", () => {
    const summary = {
      total: record(),
      [resolve(repositoryRoot, "src/components/Button.tsx")]: record({
        branches: COVERAGE_FLOORS.branches,
        functions: COVERAGE_FLOORS.functions,
        lines: COVERAGE_FLOORS.lines,
        statements: COVERAGE_FLOORS.statements,
      }),
      "src/utils/ref.ts": record(),
      "src/forms.ts": {
        branches: metric(0, 0),
        functions: metric(0, 0),
        lines: metric(0, 0),
        statements: metric(0, 0),
      },
      "tests/helpers.tsx": record({ branches: 50 }),
    };

    expect(assertPerFileCoverage(summary, { repositoryRoot })).toBe(3);
  });

  it("reports every metric below its per-file floor", () => {
    const summary = {
      total: record(),
      "src/components/Untested.tsx": record({
        branches: 64,
        functions: 84,
        lines: 81,
        statements: 79,
      }),
    };

    expect(() => assertPerFileCoverage(summary, { repositoryRoot })).toThrow(
      [
        "Per-file coverage floors failed:",
        "- src/components/Untested.tsx branches 64% is below 65%",
        "- src/components/Untested.tsx functions 84% is below 85%",
        "- src/components/Untested.tsx lines 81% is below 82%",
        "- src/components/Untested.tsx statements 79% is below 80%",
      ].join("\n"),
    );
  });

  it("rejects malformed summaries and files outside src", () => {
    expect(() =>
      assertPerFileCoverage({ total: record() }, { repositoryRoot }),
    ).toThrow("Coverage summary does not contain any source files.");
    expect(() =>
      assertPerFileCoverage(
        {
          total: record(),
          "tests/example.ts": record(),
        },
        { repositoryRoot },
      ),
    ).toThrow("Coverage summary does not contain any source files.");
    expect(() =>
      assertPerFileCoverage(
        {
          total: record(),
          "src/example.ts": { ...record(), lines: { pct: 100 } },
        },
        { repositoryRoot },
      ),
    ).toThrow(
      "Coverage for src/example.ts lines has an invalid coverage metric.",
    );
  });
});
