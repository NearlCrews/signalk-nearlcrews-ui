import {
  assertSuccessfulReleaseChecks,
  hasMoreCheckRunPages,
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

const perPage = 100;
const maximumPages = 20;
const checkRuns = [];
let expectedTotal;

for (let page = 1; page <= maximumPages; page += 1) {
  const url = new URL(
    `https://api.github.com/repos/${repository}/commits/${releaseSha}/check-runs`,
  );
  url.searchParams.set("filter", "all");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "signalk-nearlcrews-ui-release-check",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub check-runs request failed with HTTP ${response.status}.`,
    );
  }

  const result = parseCheckRunsPage(await response.json());
  expectedTotal ??= result.total_count;
  checkRuns.push(...result.check_runs);
  if (
    !hasMoreCheckRunPages({
      collectedCount: checkRuns.length,
      pageCount: result.check_runs.length,
      perPage,
      totalCount: expectedTotal,
    })
  ) {
    break;
  }
  if (page === maximumPages) {
    throw new Error(
      `GitHub returned more than ${maximumPages * perPage} check runs for the release commit.`,
    );
  }
}

const workflowRuns = [];
expectedTotal = undefined;
for (let page = 1; page <= maximumPages; page += 1) {
  const url = new URL(
    `https://api.github.com/repos/${repository}/actions/runs`,
  );
  url.searchParams.set("exclude_pull_requests", "true");
  url.searchParams.set("head_sha", releaseSha);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "signalk-nearlcrews-ui-release-check",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub workflow-runs request failed with HTTP ${response.status}.`,
    );
  }

  const result = parseWorkflowRunsPage(await response.json());
  expectedTotal ??= result.total_count;
  workflowRuns.push(...result.workflow_runs);
  if (
    !hasMoreCheckRunPages({
      collectedCount: workflowRuns.length,
      pageCount: result.workflow_runs.length,
      perPage,
      totalCount: expectedTotal,
    })
  ) {
    break;
  }
  if (page === maximumPages) {
    throw new Error(
      `GitHub returned more than ${maximumPages * perPage} workflow runs for the release commit.`,
    );
  }
}

assertSuccessfulReleaseChecks(checkRuns, workflowRuns, releaseSha, repository);
process.stdout.write(
  `All required CI and CodeQL checks succeeded for ${releaseSha}.\n`,
);
