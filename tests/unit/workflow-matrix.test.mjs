import { describe, expect, it } from "vitest";

import {
  expandMatrixName,
  readInlineList,
  readJobNames,
  readScalarValues,
  readSteps,
  stepBody,
} from "../../scripts/lib/workflow-matrix.mjs";

const WORKFLOW = `name: Example

on:
  push:

jobs:
  validate:
    name: Node \${{ matrix.node }}
    strategy:
      matrix:
        node: [22.22.2, "24.15.0", 26]
    steps:
      - name: Not a job name
        run: echo
  browser:
    # A comment before the name.
    name: "Browser tests (\${{ matrix.architecture }})"
    strategy:
      matrix:
        include:
          - architecture: x64
            snapshot_variant: ubuntu24-x64
          - architecture: arm64
            snapshot_variant: 'ubuntu24-arm64'
    steps:
      - name: Run
        env:
          SNUI_SNAPSHOT_VARIANT: \${{ matrix.snapshot_variant }}
        run: echo
`;

describe("workflow readers", () => {
  it("reads an inline matrix list and strips quotes", () => {
    expect(readInlineList(WORKFLOW, "node")).toEqual([
      "22.22.2",
      "24.15.0",
      "26",
    ]);
  });

  it("requires exactly one inline list for a key", () => {
    expect(() => readInlineList(WORKFLOW, "missing")).toThrow(
      "Expected exactly one inline list for missing, found 0.",
    );
    expect(() => readInlineList(`${WORKFLOW}${WORKFLOW}`, "node")).toThrow(
      "Expected exactly one inline list for node, found 2.",
    );
  });

  it("reads scalar values under one key without matching longer keys", () => {
    expect(readScalarValues(WORKFLOW, "snapshot_variant")).toEqual([
      "ubuntu24-x64",
      "ubuntu24-arm64",
    ]);
    expect(readScalarValues(WORKFLOW, "architecture")).toEqual([
      "x64",
      "arm64",
    ]);
  });

  it("reads job display names and skips step names", () => {
    expect(readJobNames(WORKFLOW)).toEqual([
      `Node \${{ matrix.node }}`,
      `Browser tests (\${{ matrix.architecture }})`,
    ]);
  });

  it("expands a matrix placeholder the way GitHub names matrix jobs", () => {
    expect(
      expandMatrixName(`Node \${{ matrix.node }}`, "node", ["22.22.2", "26"]),
    ).toEqual(["Node 22.22.2", "Node 26"]);
  });

  it("takes a matrix value literally, dollar signs included", () => {
    expect(
      expandMatrixName(`Node \${{ matrix.node }}`, "node", ["$&", "$1"]),
    ).toEqual(["Node $&", "Node $1"]);
  });

  it("treats a key as a literal, not as a pattern", () => {
    const source = "  node.js: 22\n  nodexjs: 24\n";
    expect(readScalarValues(source, "node.js")).toEqual(["22"]);
    expect(
      expandMatrixName(`Node \${{ matrix.node.js }}`, "node.js", ["22.22.2"]),
    ).toEqual(["Node 22.22.2"]);
  });
});

describe("step reader", () => {
  const STEPS = `jobs:
  first:
    name: First
    steps:
      - name: Check out
        uses: actions/checkout@v7
      # A comment between two steps belongs to neither.
      - uses: actions/setup-node@v7
        name: "Set up Node"
        with:
          node-version: 24

      - name: Run
        if: runner.os != 'Windows'
        env:
          VALUE: one
        run: |
          echo one

          echo two
  second:
    steps:
      - run: echo unnamed
    timeout-minutes: 5
top: level
`;

  it("reads every step with its name and dedented lines", () => {
    expect(readSteps(STEPS)).toEqual([
      {
        lines: ["name: Check out", "uses: actions/checkout@v7"],
        name: "Check out",
      },
      {
        lines: [
          "uses: actions/setup-node@v7",
          'name: "Set up Node"',
          "with:",
          "  node-version: 24",
        ],
        name: "Set up Node",
      },
      {
        lines: [
          "name: Run",
          "if: runner.os != 'Windows'",
          "env:",
          "  VALUE: one",
          "run: |",
          "  echo one",
          "",
          "  echo two",
        ],
        name: "Run",
      },
      { lines: ["run: echo unnamed"], name: undefined },
    ]);
  });

  it("compares steps by what they run, not where they run", () => {
    const [, , run] = readSteps(STEPS);
    expect(stepBody(run)).toBe(
      ["env:", "  VALUE: one", "run: |", "  echo one", "", "  echo two"].join(
        "\n",
      ),
    );
    const edited = readSteps(STEPS.replace("echo two", "echo three"))[2];
    expect(stepBody(edited)).not.toBe(stepBody(run));
  });

  it("reads nothing from a file without steps", () => {
    expect(readSteps("name: Empty\non:\n  push:\n")).toEqual([]);
  });
});
