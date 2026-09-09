import { describe, expect, it } from "vitest";

import {
  expandMatrixName,
  readInlineList,
  readJobNames,
  readScalarValues,
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
});
