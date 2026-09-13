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
import { readOption } from "../bin/lib/cli-arguments.mjs";
import { resolveDistTag } from "./lib/release-checks.mjs";

const argv = process.argv.slice(2);
// The shared reader answers undefined for an option nobody passed, so the
// required half is stated here where the usage line is.
const candidate = readOption(argv, "--candidate", "a version");
const latest = readOption(argv, "--latest", "a version");
if (candidate === undefined || latest === undefined) {
  throw new Error("Pass --candidate <version> and --latest <version>.");
}

process.stdout.write(`${resolveDistTag(candidate, latest)}\n`);
