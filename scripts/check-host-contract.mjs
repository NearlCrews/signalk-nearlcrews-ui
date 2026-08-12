/**
 * Compares this package against the Signal K Admin host dependency contract.
 *
 * `@signalk/server-admin-ui-dependencies` is the upstream declaration of which
 * libraries the Signal K Admin UI supplies to embedded webapps and plugin
 * configuration panels. Its `peerDependencies` are the contract: a federated
 * remote may share those modules with the host and must bundle everything else.
 *
 * The contract is compared against a committed baseline rather than installed,
 * because installing it pulls the whole Bootstrap and icon-font tree into a
 * package that renders none of it, and that tree currently carries
 * high-severity advisories with no fix, which this repository's audit gate
 * rejects. Consumer plugins, which do render against the host, should install
 * the real package and import it from their build configuration.
 *
 * Run `npm run host-contract:update` to refresh the baseline from the registry.
 * That refresh then verifies the new contract in the same run, so a host that
 * moved away from this package's peer ranges fails immediately.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { subset } from "semver";

import { readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const baselinePath = repositoryPath("tests", "host-contract.baseline.json");
const contractPackage = "@signalk/server-admin-ui-dependencies";
const shouldUpdate = process.argv.includes("--update");

/** Both the registry result and the committed baseline carry this shape. */
function assertContractShape(value, source) {
  if (
    value === null ||
    typeof value !== "object" ||
    typeof value.version !== "string" ||
    value.peerDependencies === null ||
    typeof value.peerDependencies !== "object" ||
    Object.values(value.peerDependencies).some(
      (range) => typeof range !== "string",
    )
  ) {
    throw new Error(
      `${source} does not describe ${contractPackage} peer dependencies. Run \`npm run host-contract:update\`.`,
    );
  }
}

async function refreshBaseline() {
  // Only the update path reaches npm, so the common path never loads it.
  const { runNpm } = await import("./lib/npm-pack.mjs");
  const parsed = JSON.parse(
    runNpm(["view", contractPackage, "version", "peerDependencies", "--json"]),
  );
  assertContractShape(parsed, "The npm registry result");

  const contract = {
    package: contractPackage,
    peerDependencies: Object.fromEntries(
      Object.entries(parsed.peerDependencies).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    version: parsed.version,
  };
  await writeFile(baselinePath, `${JSON.stringify(contract, undefined, 2)}\n`);
  process.stdout.write(
    `Host contract baseline updated to ${contractPackage}@${contract.version}.\n`,
  );
  return contract;
}

async function readBaseline() {
  try {
    return JSON.parse(await readFile(baselinePath, "utf8"));
  } catch {
    throw new Error(
      "Missing or unreadable host contract baseline. Run `npm run host-contract:update`.",
    );
  }
}

// The three reads are unrelated, so they resolve together.
const [baseline, { dependencies, peerDependencies }, migrationGuide] =
  await Promise.all([
    shouldUpdate ? refreshBaseline() : readBaseline(),
    readPackageJson(),
    readFile(repositoryPath("docs", "migration.md"), "utf8"),
  ]);

assertContractShape(baseline, "The host contract baseline");
if (baseline.package !== contractPackage) {
  throw new Error(
    `The host contract baseline must describe ${contractPackage}.`,
  );
}

const hostRanges = baseline.peerDependencies;
const { FEDERATION_SHARED } = require("../fixtures/federation/shared.cjs");
const sharedNames = Object.keys(FEDERATION_SHARED).sort();
const peerNames = Object.keys(peerDependencies).sort();

// Every peer dependency is a module the remote expects from the host, so the
// two sets must match. Otherwise a third peer would silently escape the
// per-module checks below.
if (sharedNames.join() !== peerNames.join()) {
  throw new Error(
    `The federation remotes share ${sharedNames.join(", ")}, but the peer dependencies are ${peerNames.join(", ")}. Every peer dependency must be shared with the host.`,
  );
}

for (const name of sharedNames) {
  const hostRange = hostRanges[name];
  if (hostRange === undefined) {
    throw new Error(
      `The federation remotes share ${name}, which ${contractPackage}@${baseline.version} does not provide. ` +
        "A remote can only share what the Signal K Admin host supplies, so this module must be bundled instead.",
    );
  }

  const ownRange = peerDependencies[name];
  if (!subset(ownRange, hostRange)) {
    throw new Error(
      `The ${name} peer range ${ownRange} accepts versions outside the host contract ${hostRange}. ` +
        "Narrow the peer range, or refresh the baseline with `npm run host-contract:update` " +
        "once the Signal K Admin host widens the contract.",
    );
  }

  const share = FEDERATION_SHARED[name];
  if (share.singleton !== true || share.import !== false) {
    throw new Error(
      `The ${name} share must be a singleton with no fallback implementation in the remote.`,
    );
  }
}

const bundledHostModules = Object.keys(dependencies).filter((name) =>
  Object.hasOwn(hostRanges, name),
);
if (bundledHostModules.length > 0) {
  throw new Error(
    `${bundledHostModules.join(", ")} would ship as a runtime dependency, but the Signal K Admin host supplies it. ` +
      "Share it with the host instead of bundling a second copy into every remote.",
  );
}

// The documented Webpack snippet is what consumers copy into their own remote,
// so it has to carry the ranges this package actually declares. Earlier release
// sections keep their original ranges as history, so this asserts the current
// one is present rather than that no other appears.
for (const name of sharedNames) {
  const documented = `requiredVersion: "${peerDependencies[name]}"`;
  if (!migrationGuide.includes(documented)) {
    throw new Error(
      `docs/migration.md must share ${name} at the current peer range: ${documented}.`,
    );
  }
}

process.stdout.write(
  `Host contract ${contractPackage}@${baseline.version} satisfied for ${sharedNames.join(", ")}.\n`,
);
