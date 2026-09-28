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

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

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
  return VERSION.test(version) ? version : undefined;
}

/** Orders two x.y.z versions numerically: negative, zero, or positive. */
export function compareVersions(left, right) {
  const parse = (version) => {
    const match = VERSION.exec(version);
    if (match === null) throw new Error(`${version} is not an x.y.z version.`);
    return match.slice(1).map(Number);
  };
  const [a, b] = [parse(left), parse(right)];
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

/**
 * Every pin with a newer release, each with the checksum of the archive the
 * workflows would download for it. `latestTag(repository)` returns the tag of
 * a repository's latest release, and `archiveChecksum(url)` the SHA-256 of a
 * download, so the network stays with the caller.
 */
export async function findOutdatedTools(pins, { archiveChecksum, latestTag }) {
  const outdated = [];
  for (const [tool, pin] of Object.entries(pins)) {
    const { repository } = releaseOf(tool);
    const tag = await latestTag(repository);
    const latest = versionFromTag(tool, tag);
    if (latest === undefined) {
      throw new Error(
        `The latest ${repository} release is tagged ${tag}, which does not name a ${tool} version.`,
      );
    }
    if (compareVersions(latest, pin.version) <= 0) continue;
    const url = archiveUrl(tool, latest);
    outdated.push({
      latest,
      pinned: pin.version,
      sha256: await archiveChecksum(url),
      tool,
      url,
    });
  }
  return outdated;
}
