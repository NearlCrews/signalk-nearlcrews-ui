/**
 * Compares every checksum-pinned workflow tool with its latest release.
 *
 * Run weekly by the host contract workflow, and by hand with
 * `npm run tools:outdated`. It fails when a tool has a newer release and
 * prints the version and archive checksum to put into
 * .github/pinned-tools.json. It needs network access; a GITHUB_TOKEN in the
 * environment lifts the anonymous API rate limit. It imports nothing outside
 * Node itself, so the workflow runs it without installing dependencies.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { fetchOk, latestReleaseTag } from "./lib/github-releases.mjs";
import { repositoryPath } from "./lib/paths.mjs";
import { findOutdatedTools, PINNED_TOOLS_PATH } from "./lib/pinned-tools.mjs";
import { bulletList } from "./lib/text.mjs";

const token = process.env.GITHUB_TOKEN;

async function archiveChecksum(url) {
  const response = await fetchOk(url);
  const archive = Buffer.from(await response.arrayBuffer());
  return createHash("sha256").update(archive).digest("hex");
}

const pins = JSON.parse(
  await readFile(repositoryPath(...PINNED_TOOLS_PATH.split("/")), "utf8"),
);
const outdated = await findOutdatedTools(pins, {
  archiveChecksum,
  latestTag: (repository) => latestReleaseTag(repository, { token }),
});

if (outdated.length > 0) {
  throw new Error(
    `A pinned workflow tool has a newer release. Update ${PINNED_TOOLS_PATH}:\n` +
      bulletList(
        outdated.map(
          ({ latest, pinned, sha256, tool, url }) =>
            `${tool} ${pinned} is pinned; ${latest} is released. Set "version": "${latest}" and "sha256": "${sha256}" (${url}).`,
        ),
      ),
  );
}

process.stdout.write(
  `Every pinned workflow tool is on its latest release: ${Object.entries(pins)
    .map(([tool, pin]) => `${tool} ${pin.version}`)
    .join(", ")}.\n`,
);
