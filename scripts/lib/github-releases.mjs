/**
 * GitHub release lookups the scheduled checks share: the pinned workflow
 * tools and the Signal K Admin loader both ask a repository for its latest
 * release. Node built-ins only, so a workflow step can run them without
 * installing dependencies.
 */

/** Fetches a URL and fails with its status unless the answer is OK. */
export async function fetchOk(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(
      `GET ${url} answered ${String(response.status)} ${response.statusText}.`,
    );
  }
  return response;
}

/** Fetches a URL and parses the answer as JSON. */
export async function fetchJson(url, init) {
  return (await fetchOk(url, init)).json();
}

/**
 * The tag GitHub marks as a repository's latest release, which is not always
 * its highest version tag. A token lifts the anonymous API rate limit.
 */
export async function latestReleaseTag(
  repository,
  { fetchJson: fetchReleaseJson = fetchJson, token } = {},
) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const release = await fetchReleaseJson(
    `https://api.github.com/repos/${repository}/releases/latest`,
    { headers },
  );
  if (typeof release?.tag_name !== "string") {
    throw new Error(`The latest ${repository} release carries no tag_name.`);
  }
  return release.tag_name;
}
