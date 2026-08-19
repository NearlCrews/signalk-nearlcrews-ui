/**
 * Compares this package against the Signal K Admin host dependency contract.
 *
 * `@signalk/server-admin-ui-dependencies` is the upstream compatibility
 * inventory for libraries used by the Signal K Admin UI, embedded webapps, and
 * plugin configuration panels. Its peer dependencies do not promise that every
 * entry exists in the host federation share scope. The current Admin loader's
 * guaranteed Webpack-compatible shares are enforced separately below.
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

import {
  contractsMatch,
  fetchRegistryContract,
  formatContractDiff,
} from "./lib/host-contract.mjs";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const baselinePath = repositoryPath("tests", "host-contract.baseline.json");
const contractPackage = "@signalk/server-admin-ui-dependencies";
const shouldUpdate = process.argv.includes("--update");
const shouldCheckRegistry = process.argv.includes("--check-registry");

if (shouldUpdate && shouldCheckRegistry) {
  throw new Error("Choose either --update or --check-registry, not both.");
}

/** Both the registry result and the committed baseline carry this shape. */
function assertContractShape(value, source) {
  if (
    value === null ||
    typeof value !== "object" ||
    typeof value.package !== "string" ||
    typeof value.version !== "string" ||
    value.peerDependencies === null ||
    typeof value.peerDependencies !== "object" ||
    Array.isArray(value.peerDependencies) ||
    Object.values(value.peerDependencies).some(
      (range) => typeof range !== "string",
    )
  ) {
    throw new Error(
      `${source} does not describe ${contractPackage} peer dependencies. Run \`npm run host-contract:update\`.`,
    );
  }
}

async function readRegistryContract() {
  // Only registry modes reach npm, so the common local validation stays offline.
  const { runNpm } = await import("./lib/npm-pack.mjs");
  return fetchRegistryContract({ contractPackage, runNpm });
}

async function refreshBaseline() {
  const contract = await readRegistryContract();
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

// These reads are unrelated, so they resolve together.
const [
  committedBaseline,
  registryContract,
  { dependencies, peerDependencies },
  migrationGuide,
] = await Promise.all([
  shouldUpdate ? refreshBaseline() : readBaseline(),
  shouldCheckRegistry ? readRegistryContract() : undefined,
  readPackageJson(),
  readFile(repositoryPath("docs", "migration.md"), "utf8"),
]);

assertContractShape(committedBaseline, "The committed host contract baseline");
if (registryContract !== undefined) {
  assertContractShape(registryContract, "The registry host contract");
}

if (
  registryContract !== undefined &&
  !contractsMatch(committedBaseline, registryContract)
) {
  throw new Error(formatContractDiff(committedBaseline, registryContract));
}

const baseline = registryContract ?? committedBaseline;
if (baseline.package !== contractPackage) {
  throw new Error(
    `The host contract baseline must describe ${contractPackage}.`,
  );
}

const hostRanges = baseline.peerDependencies;
const {
  FEDERATION_SHARED,
  SIGNALK_HOST_SHARED_MODULES,
} = require("../fixtures/federation/shared.cjs");
const sharedNames = Object.keys(FEDERATION_SHARED).sort();
const guaranteedHostShareNames = [...SIGNALK_HOST_SHARED_MODULES].sort();
const peerNames = Object.keys(peerDependencies).sort();

if (sharedNames.join() !== guaranteedHostShareNames.join()) {
  throw new Error(
    `The federation remotes share ${sharedNames.join(", ")}, but the Signal K Admin loader guarantees ${guaranteedHostShareNames.join(", ")}.`,
  );
}

// Every peer dependency is a runtime implementation this library expects its
// host to provide. Keep that set equal to the explicit host-share allowlist so
// a new peer cannot silently escape the range and federation checks below.
if (peerNames.join() !== guaranteedHostShareNames.join()) {
  throw new Error(
    `The peer dependencies are ${peerNames.join(", ")}, but the Signal K Admin loader guarantees ${guaranteedHostShareNames.join(", ")}. Review any new peer against the host loader before changing this allowlist.`,
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

const hostInventoryDependencies = Object.keys(dependencies).filter((name) =>
  Object.hasOwn(hostRanges, name),
);
if (hostInventoryDependencies.length > 0) {
  throw new Error(
    `${hostInventoryDependencies.join(", ")} appears in the Signal K Admin compatibility inventory. ` +
      "This host-independent design system must not adopt Admin UI libraries without an explicit contract review.",
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
