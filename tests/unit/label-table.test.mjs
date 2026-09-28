import { describe, expect, it } from "vitest";

import {
  formatLabelTable,
  labelRows,
  labelTableDifferences,
  parseLabelTable,
} from "../../scripts/lib/label-table.mjs";

const GROUPS = {
  saveActionBar: { clean: "Nothing to save", saved: "Save sent to the server" },
  themeToggle: {
    choiceLabels: { auto: "Match Admin", night: "Night" },
    label: "Panel theme",
  },
};

describe("English defaults table", () => {
  it("flattens label groups into one row per key, in order", () => {
    expect(labelRows(GROUPS)).toEqual([
      { key: "saveActionBar.clean", value: "Nothing to save" },
      { key: "saveActionBar.saved", value: "Save sent to the server" },
      { key: "themeToggle.choiceLabels.auto", value: "Match Admin" },
      { key: "themeToggle.choiceLabels.night", value: "Night" },
      { key: "themeToggle.label", value: "Panel theme" },
    ]);
    expect(() => labelRows({ numberField: { empty: () => "" } })).toThrow(
      "numberField.empty is not a label or a group of labels.",
    );
  });

  it("renders each default verbatim and reads it back", () => {
    const rows = [
      { key: "a.pipe", value: "Left | right" },
      { key: "a.tick", value: "Press `Save`" },
      { key: "a.edge", value: "`quoted`" },
      { key: "a.plain", value: "Checked {age}" },
    ];
    const table = formatLabelTable(rows);
    expect(table).toBe(
      [
        "| Key | English default |",
        "| --- | --- |",
        "| `a.pipe` | `Left \\| right` |",
        "| `a.tick` | `` Press `Save` `` |",
        "| `a.edge` | `` `quoted` `` |",
        "| `a.plain` | `Checked {age}` |",
      ].join("\n"),
    );
    expect(
      parseLabelTable(`# API\n\nProse.\n\n${table}\n\nMore prose.\n`),
    ).toEqual(rows);
  });

  it("finds the table under a formatter's padding, or reports none", () => {
    const padded = [
      "|  Key                  | English default   |",
      "| --------------------- | ----------------- |",
      "| `saveActionBar.clean` | `Nothing to save` |",
    ].join("\n");
    expect(parseLabelTable(padded)).toEqual([
      { key: "saveActionBar.clean", value: "Nothing to save" },
    ]);
    expect(parseLabelTable("| Surface | Default |\n| --- | --- |\n")).toBe(
      undefined,
    );
  });

  it("names every missing, extra, and reworded row", () => {
    const generated = labelRows(GROUPS);
    expect(labelTableDifferences(generated, generated)).toEqual([]);
    expect(
      labelTableDifferences(
        [
          { key: "saveActionBar.clean", value: "No unsaved changes" },
          { key: "saveActionBar.dismissed", value: "Dismissed" },
          ...generated.slice(2),
        ],
        generated,
      ),
    ).toEqual([
      'saveActionBar.clean reads "No unsaved changes", but the package renders "Nothing to save".',
      'saveActionBar.saved is missing; its default is "Save sent to the server".',
      "saveActionBar.dismissed is listed, but the package has no such default.",
    ]);
  });

  it("asks for a regeneration when only the order differs", () => {
    const generated = labelRows(GROUPS);
    expect(labelTableDifferences([...generated].reverse(), generated)).toEqual([
      "The rows are out of order; regenerate the table.",
    ]);
  });
});
