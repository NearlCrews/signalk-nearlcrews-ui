import { readFile } from "node:fs/promises";

import { assertPerFileCoverage } from "./lib/coverage-contract.mjs";
import { repositoryPath } from "./lib/paths.mjs";

const summaryPath = repositoryPath("coverage", "coverage-summary.json");
let summary;
try {
  summary = JSON.parse(await readFile(summaryPath, "utf8"));
} catch {
  throw new Error(
    "Missing or unreadable coverage summary. Run the Vitest coverage suite first.",
  );
}

const fileCount = assertPerFileCoverage(summary, {
  repositoryRoot: repositoryPath(),
});
process.stdout.write(
  `Per-file coverage floors passed for ${fileCount} source files.\n`,
);
