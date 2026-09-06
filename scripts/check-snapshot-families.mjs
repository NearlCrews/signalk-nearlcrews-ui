/**
 * Asserts that a hosted visual-baseline family is complete.
 *
 * The refresh workflow runs this after regenerating one family so an
 * incomplete artifact fails there, where the missing image can still be
 * produced, rather than in the browser meta-test on the next pull request.
 * Without `--variant` it checks every family the CI browser matrix names.
 */
import { readdir, readFile } from "node:fs/promises";

import { repositoryPath } from "./lib/paths.mjs";
import {
  hostedSnapshotVariants,
  missingSnapshotFiles,
} from "./lib/snapshot-families.mjs";

const SPEC_PATH = repositoryPath("tests", "browser", "panel.spec.ts");
const SNAPSHOT_DIRECTORY = `${SPEC_PATH}-snapshots`;

function requestedVariants(argv) {
  const variants = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--variant") continue;
    const variant = argv[index + 1];
    if (variant === undefined || variant.startsWith("--")) {
      throw new Error("--variant requires a family name such as ubuntu24-x64.");
    }
    variants.push(variant);
    index += 1;
  }
  return variants;
}

const [specSource, presentFiles, ciWorkflow] = await Promise.all([
  readFile(SPEC_PATH, "utf8"),
  readdir(SNAPSHOT_DIRECTORY),
  readFile(repositoryPath(".github", "workflows", "ci.yml"), "utf8"),
]);

const explicitVariants = requestedVariants(process.argv.slice(2));
const variants =
  explicitVariants.length > 0
    ? explicitVariants
    : hostedSnapshotVariants(ciWorkflow);

const failures = variants.flatMap((variant) =>
  missingSnapshotFiles(specSource, variant, presentFiles).map(
    (file) => `${variant}: ${file}`,
  ),
);

if (failures.length > 0) {
  throw new Error(
    `Visual baseline families are incomplete:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

console.log(
  `Visual baseline families complete: ${variants.join(", ")} (${presentFiles.length} files).`,
);
