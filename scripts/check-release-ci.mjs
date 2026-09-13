import {
  assertSuccessfulReleaseChecks,
  fetchAllPages,
  parseCheckRunsPage,
  parseWorkflowRunsPage,
} from "./lib/release-checks.mjs";

const repository = process.env.GITHUB_REPOSITORY;
const releaseSha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;

if (
  typeof repository !== "string" ||
  !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
) {
  throw new Error(
    "GITHUB_REPOSITORY must contain a valid owner and repository.",
  );
}
if (typeof releaseSha !== "string" || !/^[0-9a-f]{40}$/i.test(releaseSha)) {
  throw new Error("RELEASE_SHA must be a full Git commit SHA.");
}
if (typeof token !== "string" || token.length === 0) {
  throw new Error("GITHUB_TOKEN is required to verify release checks.");
}

const checkRuns = await fetchAllPages({
  arrayKey: "check_runs",
  label: "check-runs",
  parse: parseCheckRunsPage,
  searchParams: { filter: "all" },
  token,
  url: `https://api.github.com/repos/${repository}/commits/${releaseSha}/check-runs`,
});

const workflowRuns = await fetchAllPages({
  arrayKey: "workflow_runs",
  label: "workflow-runs",
  parse: parseWorkflowRunsPage,
  searchParams: { exclude_pull_requests: "true", head_sha: releaseSha },
  token,
  url: `https://api.github.com/repos/${repository}/actions/runs`,
});

assertSuccessfulReleaseChecks(checkRuns, workflowRuns, releaseSha, repository);
process.stdout.write(
  `All required CI and CodeQL checks succeeded for ${releaseSha}.\n`,
);
