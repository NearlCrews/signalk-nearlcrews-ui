import { settleInOrder } from "./lib/promises.mjs";
import {
  assertSuccessfulReleaseChecks,
  COMMIT_SHA,
  fetchAllPages,
  REPOSITORY_NAME,
} from "./lib/release-checks.mjs";

const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;

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

const [checkRuns, workflowRuns] = await settleInOrder([
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

assertSuccessfulReleaseChecks(checkRuns, workflowRuns, releaseSha, repository);
process.stdout.write(
  `All required CI and CodeQL checks succeeded for ${releaseSha}.\n`,
);
