import { setTimeout as sleep } from "node:timers/promises";

import { settleInOrder } from "./lib/promises.mjs";
import {
  assertSuccessfulReleaseChecks,
  COMMIT_SHA,
  fetchAllPages,
  hasPendingReleaseWorkflow,
  REPOSITORY_NAME,
} from "./lib/release-checks.mjs";

const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;

// A release published while CI is still running settles in minutes, so a
// pending required workflow is waited on rather than failed on.
const POLL_INTERVAL_MS = 30_000;
const MAXIMUM_WAIT_MS = 30 * 60_000;

if (typeof repository !== "string" || !REPOSITORY_NAME.test(repository)) {
  throw new Error(
    "GITHUB_REPOSITORY must contain a valid owner and repository.",
  );
}
if (typeof releaseSha !== "string" || !COMMIT_SHA.test(releaseSha)) {
  throw new Error("RELEASE_SHA must be a full Git commit SHA.");
}
if (typeof token !== "string" || token.length === 0) {
  throw new Error("GITHUB_TOKEN is required to verify release checks.");
}

async function readRuns() {
  return settleInOrder([
    fetchAllPages({
      arrayKey: "check_runs",
      label: "check-runs",
      searchParams: { filter: "all" },
      token,
      url: `https://api.github.com/repos/${repository}/commits/${releaseSha}/check-runs`,
    }),
    fetchAllPages({
      arrayKey: "workflow_runs",
      label: "workflow-runs",
      searchParams: { exclude_pull_requests: "true", head_sha: releaseSha },
      token,
      url: `https://api.github.com/repos/${repository}/actions/runs`,
    }),
  ]);
}

const deadline = Date.now() + MAXIMUM_WAIT_MS;
let [checkRuns, workflowRuns] = await readRuns();
while (
  hasPendingReleaseWorkflow(workflowRuns, releaseSha) &&
  Date.now() < deadline
) {
  process.stdout.write(
    `Required workflows are still running for ${releaseSha}; checking again in ${String(POLL_INTERVAL_MS / 1000)} seconds.\n`,
  );
  await sleep(POLL_INTERVAL_MS);
  [checkRuns, workflowRuns] = await readRuns();
}

assertSuccessfulReleaseChecks(checkRuns, workflowRuns, releaseSha, repository);
process.stdout.write(
  `All required CI and CodeQL checks succeeded for ${releaseSha}.\n`,
);
