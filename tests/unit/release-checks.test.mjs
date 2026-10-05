import { describe, expect, it } from "vitest";

import {
  assertSuccessfulReleaseChecks,
  CI_WORKFLOW_PATH,
  CODEQL_WORKFLOW_PATH,
  fetchAllPages,
  hasMorePages,
  parsePage,
  REQUIRED_RELEASE_CHECKS,
  resolveDistTag,
} from "../../scripts/lib/release-checks.mjs";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const REPOSITORY = "NearlCrews/signalk-nearlcrews-ui";

/** The check most cases single out. An empty list would leave them nothing to break. */
const [FIRST_CHECK] = REQUIRED_RELEASE_CHECKS;
if (FIRST_CHECK === undefined) {
  throw new Error("REQUIRED_RELEASE_CHECKS is empty.");
}

function workflowRun(id, path, overrides = {}) {
  return {
    id,
    path,
    head_sha: SHA,
    status: "completed",
    conclusion: "success",
    created_at: `2026-08-19T12:${String(id % 60).padStart(2, "0")}:00Z`,
    run_attempt: 1,
    ...overrides,
  };
}

function checkRun(requirement, workflowRunId, id, overrides = {}) {
  return {
    id,
    name: requirement.name,
    head_sha: SHA,
    status: "completed",
    conclusion: "success",
    app: { slug: "github-actions" },
    details_url: `https://github.com/${REPOSITORY}/actions/runs/${workflowRunId}/job/${id}`,
    ...overrides,
  };
}

function successfulFixture() {
  const workflowRuns = [
    workflowRun(100, CI_WORKFLOW_PATH),
    workflowRun(200, CODEQL_WORKFLOW_PATH),
  ];
  const checkRuns = REQUIRED_RELEASE_CHECKS.map((requirement, index) =>
    checkRun(
      requirement,
      requirement.workflowPath === CI_WORKFLOW_PATH ? 100 : 200,
      1_000 + index,
    ),
  );
  return { checkRuns, workflowRuns };
}

function assertFixture(checkRuns, workflowRuns) {
  return assertSuccessfulReleaseChecks(
    checkRuns,
    workflowRuns,
    SHA,
    REPOSITORY,
  );
}

describe("release check parser", () => {
  it("accepts the newest success for every job in the newest trusted workflow runs", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    checkRuns.push(
      checkRun(FIRST_CHECK, 100, 1, {
        conclusion: "failure",
      }),
      checkRun(
        { name: "Unrelated check", workflowPath: CI_WORKFLOW_PATH },
        100,
        2_000,
      ),
    );

    expect(() => assertFixture(checkRuns, workflowRuns)).not.toThrow();
  });

  it("rejects missing, pending, failed, and wrong-commit-only checks", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    const [missing, pending, failed, wrongCommit] = REQUIRED_RELEASE_CHECKS;
    expect(missing).toBeDefined();
    expect(pending).toBeDefined();
    expect(failed).toBeDefined();
    expect(wrongCommit).toBeDefined();

    const brokenChecks = checkRuns
      .filter((candidate) => candidate.name !== missing.name)
      .map((candidate) => {
        if (candidate.name === pending.name) {
          return { ...candidate, status: "in_progress", conclusion: null };
        }
        if (candidate.name === failed.name) {
          return { ...candidate, conclusion: "failure" };
        }
        if (candidate.name === wrongCommit.name) {
          return { ...candidate, head_sha: OTHER_SHA };
        }
        return candidate;
      });

    expect(() => assertFixture(brokenChecks, workflowRuns)).toThrow(
      `${missing.name}: missing`,
    );
    expect(() => assertFixture(brokenChecks, workflowRuns)).toThrow(
      `${pending.name}: in_progress/none from github-actions`,
    );
    expect(() => assertFixture(brokenChecks, workflowRuns)).toThrow(
      `${failed.name}: completed/failure from github-actions`,
    );
    expect(() => assertFixture(brokenChecks, workflowRuns)).toThrow(
      `${wrongCommit.name}: missing`,
    );
  });

  it("rejects a newer failure even when an older check with the same name passed", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    checkRuns.push(
      checkRun(FIRST_CHECK, 100, 9_000, { conclusion: "failure" }),
    );

    expect(() => assertFixture(checkRuns, workflowRuns)).toThrow(
      `${FIRST_CHECK.name}: completed/failure from github-actions`,
    );
  });

  it("rejects an older successful workflow run when the newest trusted run failed", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    workflowRuns.push(
      workflowRun(101, CI_WORKFLOW_PATH, {
        conclusion: "failure",
        created_at: "2026-08-19T13:00:00Z",
      }),
    );

    expect(() => assertFixture(checkRuns, workflowRuns)).toThrow(
      `${FIRST_CHECK.name}: newest ${CI_WORKFLOW_PATH} run 101 is completed/failure`,
    );
  });

  it("rejects duplicate job names from a different workflow", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    workflowRuns.push(workflowRun(300, ".github/workflows/spoof.yml"));
    const spoofedChecks = checkRuns.map((candidate) =>
      candidate.name === FIRST_CHECK.name
        ? {
            ...candidate,
            id: 9_000,
            details_url: `https://github.com/${REPOSITORY}/actions/runs/300/job/9000`,
          }
        : candidate,
    );

    expect(() => assertFixture(spoofedChecks, workflowRuns)).toThrow(
      `${FIRST_CHECK.name}: missing`,
    );
  });

  it("rejects a spoofed required name from another GitHub App", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    const spoofedChecks = checkRuns.map((candidate) =>
      candidate.name === FIRST_CHECK.name
        ? { ...candidate, app: { slug: "untrusted-app" } }
        : candidate,
    );

    expect(() => assertFixture(spoofedChecks, workflowRuns)).toThrow(
      `${FIRST_CHECK.name}: completed/success from untrusted-app`,
    );
  });

  it("accepts an unrelated check run with no details URL", () => {
    const { checkRuns, workflowRuns } = successfulFixture();
    const thirdPartyCheck = checkRun({ name: "Some other app" }, 0, 9_000, {
      app: { slug: "third-party-app" },
      details_url: null,
    });

    expect(() =>
      assertFixture([thirdPartyCheck, ...checkRuns], workflowRuns),
    ).not.toThrow();
  });

  it("validates paginated API response shapes", () => {
    const candidateCheck = checkRun(FIRST_CHECK, 100, 1_000);
    const checkPage = { total_count: 1, check_runs: [candidateCheck] };
    const workflowPage = {
      total_count: 1,
      workflow_runs: [workflowRun(100, CI_WORKFLOW_PATH)],
    };
    expect(parsePage(checkPage, "check_runs", "check-runs")).toEqual(checkPage);
    expect(parsePage(workflowPage, "workflow_runs", "workflow-runs")).toEqual(
      workflowPage,
    );
    expect(() =>
      parsePage({ check_runs: [] }, "check_runs", "check-runs"),
    ).toThrow("GitHub returned an invalid check-runs response.");
    expect(() =>
      parsePage({ workflow_runs: [] }, "workflow_runs", "workflow-runs"),
    ).toThrow("GitHub returned an invalid workflow-runs response.");
    expect(() =>
      parsePage(
        { total_count: 1, workflow_runs: [] },
        "check_runs",
        "check-runs",
      ),
    ).toThrow("GitHub returned an invalid check-runs response.");
    expect(
      hasMorePages({
        collectedCount: 100,
        pageCount: 100,
        perPage: 100,
        totalCount: 101,
      }),
    ).toBe(true);
    expect(
      hasMorePages({
        collectedCount: 101,
        pageCount: 1,
        perPage: 100,
        totalCount: 101,
      }),
    ).toBe(false);
  });
});

describe("paged GitHub collections", () => {
  /** What every call asks for; each case adds its own pages and limits. */
  const request = {
    arrayKey: "check_runs",
    label: "check-runs",
    token: "test-token",
    url: "https://api.github.com/repos/owner/name/commits/sha/check-runs",
  };

  function pagedFetch(pages) {
    return (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      const body = pages[page - 1];
      return Promise.resolve({
        ok: body !== undefined,
        status: body === undefined ? 404 : 200,
        json: () => Promise.resolve(body),
      });
    };
  }

  it("collects every page of a list endpoint", async () => {
    const pages = [
      { total_count: 3, check_runs: [{ id: 1 }, { id: 2 }] },
      { total_count: 3, check_runs: [{ id: 3 }] },
    ];

    await expect(
      fetchAllPages({
        ...request,
        fetchPage: pagedFetch(pages),
        perPage: 2,
      }),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("reports a failed request and refuses to page forever", async () => {
    await expect(
      fetchAllPages({ ...request, fetchPage: pagedFetch([]) }),
    ).rejects.toThrow("GitHub check-runs request failed with HTTP 404.");

    const full = { total_count: 10, check_runs: [{ id: 1 }] };
    await expect(
      fetchAllPages({
        ...request,
        fetchPage: pagedFetch([full, full, full]),
        maximumPages: 2,
        perPage: 1,
      }),
    ).rejects.toThrow(
      "GitHub returned more than 2 check-runs records for the release commit.",
    );
  });
});

describe("registry ordering", () => {
  it("publishes prereleases under next without consulting latest", () => {
    expect(resolveDistTag("0.9.0-rc.1", "0.8.2")).toBe("next");
    expect(resolveDistTag("1.0.0-beta.2", "not-a-version")).toBe("next");
  });

  it("reads build metadata as part of a stable version, not as a prerelease", () => {
    expect(resolveDistTag("0.9.0+2026-08-19", "0.8.2")).toBe("latest");
    expect(resolveDistTag("0.9.0-rc.1+2026-08-19", "0.8.2")).toBe("next");
  });

  it("publishes a newer stable version under latest", () => {
    expect(resolveDistTag("0.9.0", "0.8.2")).toBe("latest");
    expect(resolveDistTag("0.8.10", "0.8.9")).toBe("latest");
    expect(resolveDistTag("1.0.0", "0.99.99")).toBe("latest");
  });

  it("refuses a stable version that would move latest backward or repeat it", () => {
    expect(() => resolveDistTag("0.8.2", "0.8.2")).toThrow(
      "0.8.2 must be newer than npm latest 0.8.2.",
    );
    expect(() => resolveDistTag("0.8.1", "0.8.2")).toThrow(
      "0.8.1 must be newer than npm latest 0.8.2.",
    );
    expect(() => resolveDistTag("0.9.0", "1.0.0")).toThrow(
      "0.9.0 must be newer than npm latest 1.0.0.",
    );
  });

  it("rejects malformed versions on either side", () => {
    expect(() => resolveDistTag("0.9", "0.8.2")).toThrow(
      "Expected a stable semantic version for the candidate, received 0.9.",
    );
    expect(() => resolveDistTag("0.9.0", "")).toThrow(
      "Expected a stable semantic version for npm latest, received .",
    );
    expect(() => resolveDistTag("", "0.8.2")).toThrow(
      "A candidate version is required.",
    );
  });
});
