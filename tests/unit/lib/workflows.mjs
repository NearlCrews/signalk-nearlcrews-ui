/**
 * The repository's GitHub workflows, read once for the specs that hold them to
 * account. Read from the directory, so a new workflow is held to the same
 * rules as the ones already there.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { repositoryPath } from "../../../scripts/lib/paths.mjs";
import { readSteps } from "../../../scripts/lib/workflow-matrix.mjs";

const WORKFLOW_DIRECTORY = repositoryPath(".github", "workflows");

/** Every workflow, as its file name and its text. */
export const WORKFLOWS = readdirSync(WORKFLOW_DIRECTORY)
  .filter((name) => name.endsWith(".yml"))
  .map((name) => ({
    name,
    source: readFileSync(join(WORKFLOW_DIRECTORY, name), "utf8"),
  }));

/** Every step of every workflow, each with the file it came from. */
export const WORKFLOW_STEPS = WORKFLOWS.flatMap(({ name, source }) =>
  readSteps(source).map((step) => ({ ...step, workflow: name })),
);
