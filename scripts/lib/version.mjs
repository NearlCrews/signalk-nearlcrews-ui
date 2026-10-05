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
