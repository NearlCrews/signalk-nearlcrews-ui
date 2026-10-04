/**
 * Asserts that a hosted visual-baseline family is complete.
 *
 * The refresh workflow runs this after regenerating one family so an
 * incomplete artifact fails there, where the missing image can still be
 * produced, rather than in the contract test on the next pull request.
 * Without `--variant` it checks every family the CI browser matrix names,
 * across every spec that takes screenshots.
 */
import { readFile } from "node:fs/promises";

import { assertKnownOptions, readValues } from "../bin/lib/cli-arguments.mjs";
import { repositoryPath } from "./lib/paths.mjs";
import { CI_WORKFLOW_PATH } from "./lib/release-checks.mjs";
import {
  familyFailures,
  hostedSnapshotVariants,
  readSnapshotSpecs,
} from "./lib/snapshot-families.mjs";
import { bulletList } from "./lib/text.mjs";

const OPTIONS = ["--variant"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS, { valued: OPTIONS });

const [specs, ciWorkflow] = await Promise.all([
  readSnapshotSpecs(repositoryPath),
  readFile(repositoryPath(CI_WORKFLOW_PATH), "utf8"),
]);

const explicitVariants = readValues(
  argv,
  "--variant",
  "a family name such as ubuntu24-x64",
);
const variants =
  explicitVariants.length > 0
    ? explicitVariants
    : hostedSnapshotVariants(ciWorkflow);

const failures = familyFailures(specs, variants);
if (failures.length > 0) {
  throw new Error(
    `Visual baseline families do not match the browser specs:\n${bulletList(failures)}`,
  );
}

const fileCount = specs.reduce(
  (total, { present }) => total + present.length,
  0,
);
process.stdout.write(
  `Visual baseline families complete: ${variants.join(", ")} (${String(fileCount)} files across ${String(specs.length)} specs).\n`,
);
