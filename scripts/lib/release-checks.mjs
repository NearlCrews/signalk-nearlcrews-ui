const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const CODEQL_WORKFLOW_PATH = "dynamic/github-code-scanning/codeql";

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
    typeof check.details_url !== "string" ||
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

function describeCheck(check) {
  if (check === undefined) return "missing";
  return `${check.status}/${check.conclusion ?? "none"} from ${check.app.slug}`;
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
  if (typeof expectedSha !== "string" || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
    throw new Error("A full Git commit SHA is required.");
  }
  if (
    typeof repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
  ) {
    throw new Error("A valid owner and repository is required.");
  }

  const checks = checkRuns.map(requireCheckRun);
  const workflows = workflowRuns.map(requireWorkflowRun);
  const newestRuns = new Map();
  for (const { workflowPath } of requiredChecks) {
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
        `${name}: newest ${workflowPath} run ${workflow.id} is ${workflow.status}/${workflow.conclusion ?? "none"}`,
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
      `Release commit ${expectedSha} lacks required successful checks from the newest trusted workflow runs:\n${failures
        .map((failure) => `- ${failure}`)
        .join("\n")}`,
    );
  }
}

export function parseCheckRunsPage(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isInteger(value.total_count) ||
    !Array.isArray(value.check_runs)
  ) {
    throw new Error("GitHub returned an invalid check-runs response.");
  }
  return value;
}

export function parseWorkflowRunsPage(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isInteger(value.total_count) ||
    !Array.isArray(value.workflow_runs)
  ) {
    throw new Error("GitHub returned an invalid workflow-runs response.");
  }
  return value;
}

export function hasMoreCheckRunPages({
  collectedCount,
  pageCount,
  perPage,
  totalCount,
}) {
  return collectedCount < totalCount && pageCount === perPage;
}
