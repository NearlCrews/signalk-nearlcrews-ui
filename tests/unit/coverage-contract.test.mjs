import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertPerFileCoverage,
  COVERAGE_FLOORS,
  TOOLING_COVERAGE_FLOORS,
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

  it("holds the CLI and the release gates to the tooling floors", () => {
    const summary = {
      total: record(),
      "src/utils/ref.ts": record(),
      "bin/lib/panel-runtime.mjs": record({
        branches: TOOLING_COVERAGE_FLOORS.branches,
        functions: TOOLING_COVERAGE_FLOORS.functions,
        lines: TOOLING_COVERAGE_FLOORS.lines,
        statements: TOOLING_COVERAGE_FLOORS.statements,
      }),
      [resolve(repositoryRoot, "scripts/lib/paths.mjs")]: record(),
    };

    expect(assertPerFileCoverage(summary, { repositoryRoot })).toBe(3);
  });

  it("reports a tooling file below the tooling floors", () => {
    const summary = {
      total: record(),
      "src/utils/ref.ts": record(),
      "scripts/lib/host-contract.mjs": record({
        branches: TOOLING_COVERAGE_FLOORS.branches - 1,
      }),
    };

    expect(() => assertPerFileCoverage(summary, { repositoryRoot })).toThrow(
      `- scripts/lib/host-contract.mjs branches ${String(
        TOOLING_COVERAGE_FLOORS.branches - 1,
      )}% is below ${String(TOOLING_COVERAGE_FLOORS.branches)}%`,
    );
  });

  it("rejects a tooling entry that is not a module file", () => {
    expect(() =>
      assertPerFileCoverage(
        { total: record(), "bin/lib/consumer-checks.cjs": record() },
        { repositoryRoot },
      ),
    ).toThrow(
      "Coverage summary contains an invalid bin/lib file: bin/lib/consumer-checks.cjs.",
    );
  });

  it("measures neither an entry script nor a test helper", () => {
    const summary = {
      total: record(),
      "src/utils/ref.ts": record(),
      "bin/snui-check-consumer.mjs": record({ lines: 0 }),
      "scripts/check-coverage.mjs": record({ lines: 0 }),
      "tests/helpers.tsx": record({ branches: 50 }),
    };

    expect(assertPerFileCoverage(summary, { repositoryRoot })).toBe(1);
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

  it("rejects a summary that is not an object", () => {
    expect(() => assertPerFileCoverage(null, { repositoryRoot })).toThrow(
      "Coverage summary must be an object.",
    );
    expect(() => assertPerFileCoverage([record()], { repositoryRoot })).toThrow(
      "Coverage summary must be an object.",
    );
  });

  it("rejects a repository root that is not absolute", () => {
    expect(() =>
      assertPerFileCoverage(
        { total: record(), "src/utils/ref.ts": record() },
        { repositoryRoot: "project" },
      ),
    ).toThrow("Coverage repository root must be an absolute path.");
  });

  it("rejects a floor that is not a percentage or not a known metric", () => {
    const summary = { total: record(), "src/utils/ref.ts": record() };
    expect(() =>
      assertPerFileCoverage(summary, {
        repositoryRoot,
        floors: { branches: 120 },
      }),
    ).toThrow("Invalid per-file branches coverage floor.");
    expect(() =>
      assertPerFileCoverage(summary, {
        repositoryRoot,
        floors: { coverage: 80 },
      }),
    ).toThrow("Invalid per-file coverage coverage floor.");
    expect(() =>
      assertPerFileCoverage(summary, {
        repositoryRoot,
        toolingFloors: { lines: -1 },
      }),
    ).toThrow("Invalid per-file tooling lines coverage floor.");
  });

  it("rejects a src entry that is not a TypeScript source file", () => {
    expect(() =>
      assertPerFileCoverage(
        { total: record(), "src/panel.css": record() },
        { repositoryRoot },
      ),
    ).toThrow("Coverage summary contains an invalid src file: src/panel.css.");
  });
});
