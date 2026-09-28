/**
 * Holds the English defaults table in docs/api-reference.md to the defaults
 * the components render.
 *
 *   node scripts/check-label-table.mjs          compare the committed table
 *   node scripts/check-label-table.mjs --table  print the table to commit
 *
 * The defaults are read from `src` through esbuild, so the check needs no
 * build. The rows are every key of `PANEL_LABEL_DEFAULTS`, the panel label
 * bundle's defaults, followed by the reachability status labels, which a
 * consumer replaces by rendering its own words. The number field messages are
 * built from each field's bounds and stay in the prose beside the table.
 */
import { readFile } from "node:fs/promises";

import { build } from "esbuild";

import { assertKnownOptions, readFlag } from "../bin/lib/cli-arguments.mjs";
import {
  formatLabelTable,
  labelRows,
  labelTableDifferences,
  parseLabelTable,
} from "./lib/label-table.mjs";
import { repositoryPath } from "./lib/paths.mjs";
import { bulletList } from "./lib/text.mjs";

const DOCUMENT = "docs/api-reference.md";

const OPTIONS = ["--table"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const compiled = await build({
  bundle: true,
  format: "esm",
  logLevel: "silent",
  platform: "neutral",
  stdin: {
    contents: [
      'export { PANEL_LABEL_DEFAULTS } from "./src/utils/panel-label-defaults.ts";',
      'export { REACHABILITY_STATUS } from "./src/utils/reachability.ts";',
    ].join("\n"),
    loader: "ts",
    resolveDir: repositoryPath(),
    sourcefile: "label-defaults.ts",
  },
  write: false,
});
const { PANEL_LABEL_DEFAULTS, REACHABILITY_STATUS } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString("base64")}`
);

const generated = [
  ...labelRows(PANEL_LABEL_DEFAULTS),
  ...Object.entries(REACHABILITY_STATUS).map(([status, { label }]) => ({
    key: `REACHABILITY_STATUS.${status}.label`,
    value: label,
  })),
];

if (readFlag(argv, "--table")) {
  process.stdout.write(`${formatLabelTable(generated)}\n`);
} else {
  const committed = parseLabelTable(
    await readFile(repositoryPath(DOCUMENT), "utf8"),
  );
  // A missing table fails rather than retiring the check silently.
  if (committed === undefined) {
    throw new Error(
      `${DOCUMENT} carries no English defaults table. Print it with \`node scripts/check-label-table.mjs --table\`.`,
    );
  }
  const differences = labelTableDifferences(committed, generated);
  if (differences.length > 0) {
    throw new Error(
      `The English defaults table in ${DOCUMENT} does not match the package:\n${bulletList(differences)}\nRegenerate it with \`node scripts/check-label-table.mjs --table\`.`,
    );
  }
  process.stdout.write(
    `The English defaults table matches all ${String(generated.length)} package defaults.\n`,
  );
}
