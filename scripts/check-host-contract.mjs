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

import { subset } from "semver";

import { assertKnownOptions, readFlag } from "../bin/lib/cli-arguments.mjs";
import { escapeRegExp } from "../bin/lib/regexp.mjs";
import { SIGNALK_HOST_SHARED_MODULES } from "./lib/federation-share.mjs";
import {
  contractsMatch,
  fetchRegistryContract,
  formatContractDiff,
  isRangeMap,
} from "./lib/host-contract.mjs";
import { runNpm } from "./lib/npm-pack.mjs";
import { readJson, readPackageJson, repositoryPath } from "./lib/paths.mjs";

const OPTIONS = ["--check-registry", "--update"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const baselinePath = repositoryPath("tests", "host-contract.baseline.json");
const contractPackage = "@signalk/server-admin-ui-dependencies";
const shouldUpdate = readFlag(argv, "--update");
const shouldCheckRegistry = readFlag(argv, "--check-registry");

if (shouldUpdate && shouldCheckRegistry) {
  throw new Error("Choose either --update or --check-registry, not both.");
}

/**
 * The shape the registry reader builds, which a committed baseline read back
 * from disk has to carry too.
 */
function assertContractShape(value, source) {
  if (
    value === null ||
    typeof value !== "object" ||
    typeof value.package !== "string" ||
    typeof value.version !== "string" ||
    !isRangeMap(value.peerDependencies)
  ) {
    throw new Error(
      `${source} does not describe ${contractPackage} peer dependencies. Run \`npm run host-contract:update\`.`,
    );
  }
}

// Only the registry modes call this, so the common local validation never
// runs npm and stays offline.
function readRegistryContract() {
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
    return await readJson(baselinePath);
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
// The federation share map is built from this list, so the remotes share
// exactly these modules.
const sharedNames = [...SIGNALK_HOST_SHARED_MODULES].sort();
const peerNames = Object.keys(peerDependencies).sort();

// Every peer dependency is a runtime implementation this library expects its
// host to provide. Keep that set equal to the explicit host-share allowlist so
// a new peer cannot silently escape the range and federation checks below.
if (peerNames.join() !== sharedNames.join()) {
  throw new Error(
    `The peer dependencies are ${peerNames.join(", ")}, but the Signal K Admin loader guarantees ${sharedNames.join(", ")}. Review any new peer against the host loader before changing this allowlist.`,
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
  const range = peerDependencies[name];
  const documented = `requiredVersion: "${range}"`;
  // The module name has to sit in the same share entry as the range, or one
  // documented entry would satisfy every module that shares its range.
  const entry = new RegExp(
    `(?:"${escapeRegExp(name)}"|${escapeRegExp(name)})\\s*:\\s*\\{[^{}]*${escapeRegExp(documented)}`,
  );
  if (!entry.test(migrationGuide)) {
    throw new Error(
      `docs/migration.md must share ${name} at the current peer range: ${documented}.`,
    );
  }
}

process.stdout.write(
  `Host contract ${contractPackage}@${baseline.version} satisfied for ${sharedNames.join(", ")}.\n`,
);
