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
import {
  hostedSnapshotVariants,
  missingSnapshotFiles,
  orphanSnapshotFiles,
} from "./lib/snapshot-families.mjs";

const OPTIONS = ["--variant"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const SPEC_PATH = repositoryPath("tests", "browser", "panel.spec.ts");
const SNAPSHOT_DIRECTORY = `${SPEC_PATH}-snapshots`;

const [specSource, presentFiles, ciWorkflow] = await Promise.all([
  readFile(SPEC_PATH, "utf8"),
  readdir(SNAPSHOT_DIRECTORY),
  readFile(repositoryPath(".github", "workflows", "ci.yml"), "utf8"),
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
    `Visual baseline families do not match the browser spec:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

process.stdout.write(
  `Visual baseline families complete: ${variants.join(", ")} (${String(presentFiles.length)} files).\n`,
);
