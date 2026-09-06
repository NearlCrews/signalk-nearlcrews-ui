/**
 * Decides the npm dist-tag for a release candidate and refuses one that would
 * move `latest` backward.
 *
 * Both publish jobs call this with the candidate version and the registry's
 * current `latest`. It has no dependencies because the publish job installs
 * nothing: it downloads the verified tarball and a sparse checkout of this
 * directory.
 *
 * Usage: node scripts/check-registry-order.mjs --candidate 0.9.0 --latest 0.8.2
 * Prints `latest` or `next` on success.
 */
import { resolveDistTag } from "./lib/release-checks.mjs";

function readOption(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? undefined : argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a version.`);
  }
  return value;
}

const argv = process.argv.slice(2);
const candidate = readOption(argv, "--candidate");
const latest = readOption(argv, "--latest");

process.stdout.write(`${resolveDistTag(candidate, latest)}\n`);
