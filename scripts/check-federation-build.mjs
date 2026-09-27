import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  assertConsumedShares,
  assertNoReactRuntime,
  assertVersionStamp,
} from "../bin/lib/consumer-checks.mjs";
import {
  BUNDLED_REACT_MODULE,
  publicJavaScriptEntries,
} from "./lib/bundle-contract.mjs";
import { createFederationShared } from "./lib/federation-share.mjs";
import { readJson, readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const {
  exports: packageExports,
  peerDependencies,
  version,
} = await readPackageJson();
const expectedShared = createFederationShared(peerDependencies);
// Derived from the exports map rather than listed here, so an entry point
// added in a release is verified by the build it ships in.
const packageEntryFiles = [...publicJavaScriptEntries(packageExports).keys()]
  .map((entry) => `${entry}.js`)
  .sort();

/**
 * An ES module says so with an export statement. A substring test for the word
 * would also pass on a CommonJS bundle that merely names an exports object.
 */
const ESM_EXPORT =
  /(?:^|[\s;}])export\s*(?:[{*]|default\b|(?:async\s+)?(?:function|class|const|let|var)\b)/;

// webpack does not export lib/util/semver.js, and this check requires it
// anyway so the fixture assertions encode ranges exactly as the webpack that
// built them does. Naming that when the internal moves beats a bare
// module-not-found from the top of the script.
let parseRange;
try {
  ({ parseRange } = require("webpack/lib/util/semver.js"));
} catch (cause) {
  throw new Error(
    "webpack/lib/util/semver.js could not be loaded; the federation check needs webpack's own range encoder.",
    { cause },
  );
}

// The fixtures build against the generated entry, so the entry has to exist
// and carry the map rendered from this package.json before the remotes are
// inspected.
const federationEntry = require(repositoryPath("dist", "federation.cjs"));
if (JSON.stringify(federationEntry.shared) !== JSON.stringify(expectedShared)) {
  throw new Error(
    "dist/federation.cjs does not carry the share map rendered from package.json peerDependencies.",
  );
}

async function readJavaScript(directory) {
  const names = await readdir(directory);
  return Promise.all(
    names
      .filter((name) => name.endsWith(".js"))
      .map(async (name) => ({
        name,
        source: await readFile(join(directory, name), "utf8"),
      })),
  );
}

async function readStats(directory) {
  const stats = await readJson(join(directory, "stats.json"));
  if (stats.errorsCount !== 0 || stats.warningsCount !== 0) {
    throw new Error(
      `Federation build reported ${stats.errorsCount} errors and ${stats.warningsCount} warnings.`,
    );
  }
  return stats;
}

function collectModuleNames(modules) {
  return modules.flatMap((module) => [
    module.name,
    ...collectModuleNames(module.modules ?? []),
  ]);
}

/** One fixture build's scripts, stats, and remote entry, read together. */
async function readFixture(format) {
  const dist = repositoryPath("fixtures", "federation", format, "dist");
  const [files, stats] = await Promise.all([
    readJavaScript(dist),
    readStats(dist),
  ]);
  const remote = files.find((file) => file.name === "remoteEntry.js");
  return { files, format, remote, stats };
}

const fixtures = await Promise.all(["classic", "esm"].map(readFixture));
const [{ remote: classicRemote }, { remote: esmRemote }] = fixtures;

if (!classicRemote?.source.includes("signalk_nearlcrews_ui")) {
  throw new Error(
    "Classic remoteEntry.js does not expose the global container.",
  );
}

if (esmRemote === undefined || !ESM_EXPORT.test(esmRemote.source)) {
  throw new Error("ESM remoteEntry.js does not contain module exports.");
}

// Both remotes exist past the two checks above.
for (const { format, remote } of fixtures) {
  if (!remote.source.includes("./PluginConfigurationPanel")) {
    throw new Error(
      `${format} remoteEntry.js does not expose ./PluginConfigurationPanel.`,
    );
  }
  // The same checks the shipped consumer bin runs against a consumer's remote.
  assertConsumedShares(remote.source, expectedShared, parseRange);
}

for (const { files, format, stats } of fixtures) {
  const sources = files.map((file) => file.source);
  assertVersionStamp(sources, version);
  assertNoReactRuntime(sources.join("\n"), `The ${format} fixture`);

  const moduleNames = collectModuleNames(stats.modules ?? []).filter(
    (name) => typeof name === "string",
  );
  for (const entryPoint of packageEntryFiles) {
    if (!moduleNames.some((name) => name.includes(`dist/${entryPoint}`))) {
      throw new Error(
        `${format} fixture did not consume the ${entryPoint} package entry point.`,
      );
    }
  }
  for (const [shared, share] of Object.entries(expectedShared)) {
    const consumed = `consume shared module (default) ${shared}@${share.requiredVersion} (singleton)`;
    if (!moduleNames.includes(consumed)) {
      throw new Error(
        `${format} fixture did not consume host-shared ${shared} at ${share.requiredVersion} as a singleton.`,
      );
    }
  }

  const bundledReactModules = moduleNames.filter((name) =>
    BUNDLED_REACT_MODULE.test(name),
  );
  const unexpectedReactModules = bundledReactModules.filter(
    (name) =>
      !/[\\/]react[\\/]jsx-runtime\.js$/.test(name) &&
      !/[\\/]react[\\/]cjs[\\/]react-jsx-runtime\.production\.js$/.test(name),
  );
  if (unexpectedReactModules.length > 0) {
    throw new Error(
      `${format} fixture bundled unexpected React modules: ${unexpectedReactModules.join(", ")}.`,
    );
  }
}

process.stdout.write(
  "Classic var and output-module ESM Module Federation fixtures passed with the published share map.\n",
);
