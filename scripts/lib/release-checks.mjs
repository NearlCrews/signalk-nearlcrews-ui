import { githubApiHeaders } from "./github-releases.mjs";
import { bulletList } from "./text.mjs";
import { compareStableVersions, parseStableVersion } from "./version.mjs";

export const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
export const CODEQL_WORKFLOW_PATH = "dynamic/github-code-scanning/codeql";

/** A full Git commit SHA, the only form a release commit is named by. */
export const COMMIT_SHA = /^[0-9a-f]{40}$/i;

/** An owner and repository, as GITHUB_REPOSITORY names them. */
export const REPOSITORY_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * The checks a release commit must carry, each with the workflow that is
 * allowed to have produced it.
 *
 * The host contract drift workflow is deliberately absent: it runs on a
 * schedule and on manual dispatch, never on a push, so it has no run on the
 * release commit for assertSuccessfulReleaseChecks to match by head SHA. A
 * release proves the baseline against the registry by dispatching that
 * workflow, not by listing it here.
 */
export const REQUIRED_RELEASE_CHECKS = Object.freeze(
  [
    ["Workflow lint", CI_WORKFLOW_PATH],
    ["Node 22.22.2", CI_WORKFLOW_PATH],
    ["Node 24.15.0", CI_WORKFLOW_PATH],
    ["Node 26", CI_WORKFLOW_PATH],
    ["Windows package validation", CI_WORKFLOW_PATH],
    ["Browser tests (x64)", CI_WORKFLOW_PATH],
    ["Browser tests (arm64)", CI_WORKFLOW_PATH],
    ["Analyze (javascript-typescript)", CODEQL_WORKFLOW_PATH],
    ["Analyze (actions)", CODEQL_WORKFLOW_PATH],
  ].map(([name, workflowPath]) => Object.freeze({ name, workflowPath })),
);

function requireCheckRun(check) {
  if (
    check === null ||
    typeof check !== "object" ||
    !Number.isSafeInteger(check.id) ||
    typeof check.name !== "string" ||
    typeof check.head_sha !== "string" ||
    typeof check.status !== "string" ||
    (check.conclusion !== null && typeof check.conclusion !== "string") ||
    // GitHub documents details_url as nullable, and this runs over every check
    // run on the commit, third-party apps included, before any filtering to
    // the required names.
    (check.details_url !== null &&
      check.details_url !== undefined &&
      typeof check.details_url !== "string") ||
    check.app === null ||
    typeof check.app !== "object" ||
    typeof check.app.slug !== "string"
  ) {
    throw new Error("GitHub returned an invalid check-run record.");
  }
  return check;
}

function requireWorkflowRun(run) {
  if (
    run === null ||
    typeof run !== "object" ||
    !Number.isSafeInteger(run.id) ||
    typeof run.path !== "string" ||
    typeof run.head_sha !== "string" ||
    typeof run.status !== "string" ||
    (run.conclusion !== null && typeof run.conclusion !== "string") ||
    typeof run.created_at !== "string" ||
    !Number.isFinite(Date.parse(run.created_at)) ||
    !Number.isInteger(run.run_attempt) ||
    run.run_attempt < 1
  ) {
    throw new Error("GitHub returned an invalid workflow-run record.");
  }
  return run;
}

function actionsRunId(detailsUrl, repository) {
  if (typeof detailsUrl !== "string") return undefined;
  let url;
  try {
    url = new URL(detailsUrl);
  } catch {
    return undefined;
  }
  const expectedPrefix = `/${repository}/actions/runs/`.toLowerCase();
  if (
    url.origin !== "https://github.com" ||
    !url.pathname.toLowerCase().startsWith(expectedPrefix)
  ) {
    return undefined;
  }
  const suffix = url.pathname.slice(expectedPrefix.length);
  const id = /^([1-9]\d*)(?:\/|$)/.exec(suffix)?.[1];
  if (id === undefined) return undefined;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function newerWorkflowRun(left, right) {
  const timeDifference =
    Date.parse(left.created_at) - Date.parse(right.created_at);
  if (timeDifference !== 0) return timeDifference > 0 ? left : right;
  if (left.id !== right.id) return left.id > right.id ? left : right;
  return left.run_attempt >= right.run_attempt ? left : right;
}

/** A run's status and conclusion, as the failure lines print them. */
function stateOf({ conclusion, status }) {
  return `${status}/${conclusion ?? "none"}`;
}

function describeCheck(check) {
  if (check === undefined) return "missing";
  return `${stateOf(check)} from ${check.app.slug}`;
}

export function assertSuccessfulReleaseChecks(
  checkRuns,
  workflowRuns,
  expectedSha,
  repository,
  requiredChecks = REQUIRED_RELEASE_CHECKS,
) {
  if (!Array.isArray(checkRuns)) {
    throw new Error("GitHub returned an invalid check-runs collection.");
  }
  if (!Array.isArray(workflowRuns)) {
    throw new Error("GitHub returned an invalid workflow-runs collection.");
  }
  if (typeof expectedSha !== "string" || !COMMIT_SHA.test(expectedSha)) {
    throw new Error("A full Git commit SHA is required.");
  }
  if (typeof repository !== "string" || !REPOSITORY_NAME.test(repository)) {
    throw new Error("A valid owner and repository is required.");
  }

  const checks = checkRuns.map(requireCheckRun);
  const workflows = workflowRuns.map(requireWorkflowRun);
  const newestRuns = new Map();
  const workflowPaths = new Set(
    requiredChecks.map(({ workflowPath }) => workflowPath),
  );
  for (const workflowPath of workflowPaths) {
    const candidates = workflows.filter(
      (run) => run.head_sha === expectedSha && run.path === workflowPath,
    );
    const newest = candidates.reduce(
      (current, candidate) =>
        current === undefined
          ? candidate
          : newerWorkflowRun(current, candidate),
      undefined,
    );
    newestRuns.set(workflowPath, newest);
  }

  const failures = [];
  for (const { name, workflowPath } of requiredChecks) {
    const workflow = newestRuns.get(workflowPath);
    if (workflow === undefined) {
      failures.push(`${name}: trusted workflow ${workflowPath} is missing`);
      continue;
    }
    if (workflow.status !== "completed" || workflow.conclusion !== "success") {
      failures.push(
        `${name}: newest ${workflowPath} run ${workflow.id} is ${stateOf(workflow)}`,
      );
      continue;
    }

    const matchingChecks = checks.filter(
      (check) =>
        check.name === name &&
        check.head_sha === expectedSha &&
        actionsRunId(check.details_url, repository) === workflow.id,
    );
    const newestCheck = matchingChecks.reduce(
      (current, candidate) =>
        current === undefined || candidate.id > current.id
          ? candidate
          : current,
      undefined,
    );
    if (
      newestCheck?.app.slug !== "github-actions" ||
      newestCheck.status !== "completed" ||
      newestCheck.conclusion !== "success"
    ) {
      failures.push(`${name}: ${describeCheck(newestCheck)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Release commit ${expectedSha} lacks required successful checks from the newest trusted workflow runs:\n${bulletList(failures)}`,
    );
  }
}

/** A paged GitHub list response: a total plus the array named by `arrayKey`. */
export function parsePage(value, arrayKey, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isInteger(value.total_count) ||
    !Array.isArray(value[arrayKey])
  ) {
    throw new Error(`GitHub returned an invalid ${label} response.`);
  }
  return value;
}

function stableVersionParts(value, label) {
  const parts = parseStableVersion(value);
  if (parts === undefined) {
    throw new Error(
      `Expected a stable semantic version for ${label}, received ${String(value)}.`,
    );
  }
  return parts;
}

/**
 * Returns the dist-tag a candidate publishes under. A prerelease publishes
 * under `next`. A stable version publishes under `latest` only when it is
 * newer than the version `latest` currently points at, so a re-run or a
 * delayed release can never move `latest` backward.
 */
export function resolveDistTag(candidate, latestPublished) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error("A candidate version is required.");
  }
  // Build metadata carries no precedence and may hold a hyphen of its own, so
  // it comes off before the prerelease test rather than reading as one.
  const [core = ""] = candidate.split("+", 1);
  if (core.includes("-")) return "next";

  const candidateParts = stableVersionParts(core, "the candidate");
  const currentParts = stableVersionParts(latestPublished, "npm latest");
  if (compareStableVersions(candidateParts, currentParts) > 0) return "latest";
  throw new Error(
    `${candidate} must be newer than npm latest ${latestPublished}.`,
  );
}

/** Whether a paged GitHub list has pages left after the one just collected. */
export function hasMorePages({
  collectedCount,
  pageCount,
  perPage,
  totalCount,
}) {
  return collectedCount < totalCount && pageCount === perPage;
}

const GITHUB_PER_PAGE = 100;
const GITHUB_MAXIMUM_PAGES = 20;

/**
 * Collects every page of one paged GitHub list endpoint. Both release lists
 * page the same way, so the paging, the headers, and the overflow guard have
 * one definition rather than a copy per endpoint.
 */
export async function fetchAllPages({
  url,
  searchParams = {},
  arrayKey,
  token,
  label,
  fetchPage = fetch,
  perPage = GITHUB_PER_PAGE,
  maximumPages = GITHUB_MAXIMUM_PAGES,
}) {
  const collected = [];
  let expectedTotal;

  for (let page = 1; page <= maximumPages; page += 1) {
    const target = new URL(url);
    for (const [name, value] of Object.entries(searchParams)) {
      target.searchParams.set(name, value);
    }
    target.searchParams.set("per_page", String(perPage));
    target.searchParams.set("page", String(page));

    const response = await fetchPage(target, {
      headers: {
        ...githubApiHeaders(token),
        "User-Agent": "signalk-nearlcrews-ui-release-check",
      },
    });
    if (!response.ok) {
      throw new Error(
        `GitHub ${label} request failed with HTTP ${String(response.status)}.`,
      );
    }

    const result = parsePage(await response.json(), arrayKey, label);
    expectedTotal ??= result.total_count;
    const items = result[arrayKey];
    collected.push(...items);
    if (
      !hasMorePages({
        collectedCount: collected.length,
        pageCount: items.length,
        perPage,
        totalCount: expectedTotal,
      })
    ) {
      return collected;
    }
  }

  throw new Error(
    `GitHub returned more than ${String(maximumPages * perPage)} ${label} records for the release commit.`,
  );
}
