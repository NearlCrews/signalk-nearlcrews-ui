/**
 * Stable x.y.z versions, parsed and ordered here rather than with `semver`:
 * the publish job and the pinned-tools job run before anything is installed,
 * so the modules they load can import Node built-ins and each other only.
 */

const STABLE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/** The three numbers of an x.y.z version, or undefined for any other value. */
export function parseStableVersion(value) {
  const match = STABLE_VERSION.exec(value);
  return match === null ? undefined : match.slice(1).map(Number);
}

/** Orders two parsed versions numerically: negative, zero, or positive. */
export function compareStableVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/**
 * Orders two x.y.z version strings numerically: negative, zero, or positive.
 * Throws for a value that is not a stable version, because ordering a tag the
 * parser could not read would hide the malformed input.
 */
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
