/**
 * Asserts that a hosted visual-baseline family is complete.
 *
 * The refresh workflow runs this after regenerating one family so an
 * incomplete artifact fails there, where the missing image can still be
 * produced, rather than in the contract test on the next pull request.
 * Without `--variant` it checks every family the CI browser matrix names.
 */
import { readdir, readFile } from "node:fs/promises";

import { assertKnownOptions, readValues } from "../bin/lib/cli-arguments.mjs";
import { repositoryPath } from "./lib/paths.mjs";
import { CI_WORKFLOW_PATH } from "./lib/release-checks.mjs";
import {
  hostedSnapshotVariants,
  missingSnapshotFiles,
  orphanSnapshotFiles,
  PANEL_SNAPSHOT_DIRECTORY,
  PANEL_SPEC,
} from "./lib/snapshot-families.mjs";
import { bulletList } from "./lib/text.mjs";

const OPTIONS = ["--variant"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const [specSource, presentFiles, ciWorkflow] = await Promise.all([
  readFile(repositoryPath(PANEL_SPEC), "utf8"),
  readdir(repositoryPath(PANEL_SNAPSHOT_DIRECTORY)),
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

const failures = variants.flatMap((variant) => [
  ...missingSnapshotFiles(specSource, variant, presentFiles).map(
    (file) => `${variant}: ${file} is missing`,
  ),
  ...orphanSnapshotFiles(specSource, variant, presentFiles).map(
    (file) => `${variant}: ${file} is committed but no screenshot asks for it`,
  ),
]);

if (failures.length > 0) {
  throw new Error(
    `Visual baseline families do not match the browser spec:\n${bulletList(failures)}`,
  );
}

process.stdout.write(
  `Visual baseline families complete: ${variants.join(", ")} (${String(presentFiles.length)} files).\n`,
);
