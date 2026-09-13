import { readFile } from "node:fs/promises";

import { assertPerFileCoverage } from "./lib/coverage-contract.mjs";
import { repositoryPath } from "./lib/paths.mjs";

const summaryPath = repositoryPath("coverage", "coverage-summary.json");
let summary;
try {
  summary = JSON.parse(await readFile(summaryPath, "utf8"));
} catch (cause) {
  // The cause separates a summary that was never written from one an
  // interrupted run left truncated, which need different repairs.
  throw new Error(
    `Missing or unreadable coverage summary ${summaryPath}. Run the Vitest coverage suite first.`,
    { cause },
  );
}

const fileCount = assertPerFileCoverage(summary, {
  repositoryRoot: repositoryPath(),
});
process.stdout.write(
  `Per-file coverage floors passed for ${fileCount} measured files.\n`,
);
