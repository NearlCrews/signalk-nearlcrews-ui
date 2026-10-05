/**
 * The release source of every checksum-pinned workflow tool.
 *
 * actionlint, zizmor, and lychee are downloaded as release archives rather
 * than run as actions, so no dependency updater sees their versions. This
 * table says where each one is released and which archive the workflows
 * download, so a scheduled check can compare every pin with the latest
 * release and print the new version with the checksum of the archive the
 * workflows would fetch. A unit test holds each workflow's install step to
 * the URL this table builds, so the two cannot name different archives.
 */

import { settleInOrder } from "./promises.mjs";
import { compareStableVersions, parseStableVersion } from "./version.mjs";

/** The pin file every workflow reads, from the repository root. */
export const PINNED_TOOLS_PATH = ".github/pinned-tools.json";

export const PINNED_TOOL_RELEASES = Object.freeze({
  actionlint: {
    archive: (version) => `actionlint_${version}_linux_amd64.tar.gz`,
    repository: "rhysd/actionlint",
    tagPrefix: "v",
  },
  lychee: {
    archive: () => "lychee-x86_64-unknown-linux-gnu.tar.gz",
    repository: "lycheeverse/lychee",
    tagPrefix: "lychee-v",
  },
  zizmor: {
    archive: () => "zizmor-x86_64-unknown-linux-gnu.tar.gz",
    repository: "zizmorcore/zizmor",
    tagPrefix: "v",
  },
});

function releaseOf(tool) {
  const release = PINNED_TOOL_RELEASES[tool];
  if (release === undefined) {
    throw new Error(
      `${PINNED_TOOLS_PATH} pins ${tool}, which has no release source in scripts/lib/pinned-tools.mjs.`,
    );
  }
  return release;
}

/** The archive URL a workflow downloads for one version of a tool. */
export function archiveUrl(tool, version) {
  const { archive, repository, tagPrefix } = releaseOf(tool);
  return `https://github.com/${repository}/releases/download/${tagPrefix}${version}/${archive(version)}`;
}

/** The version a release tag names, or undefined for a tag of another shape. */
export function versionFromTag(tool, tag) {
  const { tagPrefix } = releaseOf(tool);
  if (!tag.startsWith(tagPrefix)) return undefined;
  const version = tag.slice(tagPrefix.length);
  return parseStableVersion(version) === undefined ? undefined : version;
}

/** Orders two x.y.z versions numerically: negative, zero, or positive. */
export function compareVersions(left, right) {
  const parse = (version) => {
    const parts = parseStableVersion(version);
    if (parts === undefined) {
      throw new Error(`${version} is not an x.y.z version.`);
    }
    return parts;
  };
  return compareStableVersions(parse(left), parse(right));
}

/**
 * Every pin with a newer release, each with the checksum of the archive the
 * workflows would download for it. `latestTag(repository)` returns the tag of
 * a repository's latest release, and `archiveChecksum(url)` the SHA-256 of a
 * download, so the network stays with the caller.
 */
export async function findOutdatedTools(pins, { archiveChecksum, latestTag }) {
  // The tools are independent lookups, so they run together; results and the
  // first failure both follow pin-file order, which is the order the report
  // prints.
  const checked = await settleInOrder(
    Object.entries(pins).map(async ([tool, pin]) => {
      const { repository } = releaseOf(tool);
      const tag = await latestTag(repository);
      const latest = versionFromTag(tool, tag);
      if (latest === undefined) {
        throw new Error(
          `The latest ${repository} release is tagged ${tag}, which does not name a ${tool} version.`,
        );
      }
      if (compareVersions(latest, pin.version) <= 0) return undefined;
      const url = archiveUrl(tool, latest);
      return {
        latest,
        pinned: pin.version,
        sha256: await archiveChecksum(url),
        tool,
        url,
      };
    }),
  );
  return checked.filter((tool) => tool !== undefined);
}
