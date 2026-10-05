/**
 * Checks the two production Module Federation fixture builds a consumer is
 * told to copy, which `npm run test:federation:built` makes with webpack
 * before running this script, so a direct run reads whatever was built last.
 * It holds them to what the Signal K Admin needs, with the same checks the
 * shipped `snui-check-consumer` runs against a consumer's own remote: the
 * container runtime, the exposed panel, an entry that carries no library, the
 * consumed shares, the version stamp, no React or test harness inside the
 * remote, the classic global and the module exports the loader reads, and a
 * render of the exposed panel in each state the Admin opens it in.
 */
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  assertConsumedShares,
  assertNoHostHarness,
  assertNoReactRuntime,
  assertVersionStamp,
} from "../bin/lib/consumer-checks.mjs";
import {
  assertEntryCarriesNoLibrary,
  assertExposesPanel,
  assertModuleContainer,
  assertWebpackContainer,
  PLUGIN_CONFIG_PANEL,
  REMOTE_ENTRY_NAME,
  toSafeModuleId,
} from "../bin/lib/host-loading.mjs";
import {
  assertNoHostOwnedModules,
  collectModulePaths,
} from "../bin/lib/module-graph.mjs";
import { renderModulePanelRemote } from "../bin/lib/module-runtime.mjs";
import {
  assertClassicContainerLoads,
  assertMarkupIncludes,
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  HOST_STATES,
  renderPanelRemote,
} from "../bin/lib/panel-runtime.mjs";
import {
  panelJavaScriptEntries,
  TOOLING_ENTRIES,
} from "./lib/bundle-contract.mjs";
import { createFederationShared } from "./lib/federation-share.mjs";
import { readJson, readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const {
  exports: packageExports,
  name: packageName,
  peerDependencies,
  version,
} = await readPackageJson();

const expectedShared = createFederationShared(peerDependencies);
// Derived from the exports map rather than listed here, so an entry point
// added in a release is verified by the build it ships in. The test tooling
// entries are the exception: a panel must never contain them.
const packageEntryFiles = [...panelJavaScriptEntries(packageExports).keys()]
  .map((entry) => `${entry}.js`)
  .sort();

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

/** One fixture build's scripts, stats, and remote entry, read together. */
async function readFixture(format) {
  const dist = repositoryPath("fixtures", "federation", format, "dist");
  const [files, stats] = await Promise.all([
    readJavaScript(dist),
    readStats(dist),
  ]);
  const remote = files.find((file) => file.name === REMOTE_ENTRY_NAME);
  if (remote === undefined) {
    throw new Error(
      `The ${format} fixture build produced no ${REMOTE_ENTRY_NAME}.`,
    );
  }
  return { dist, files, format, remote, stats };
}

const fixtures = await Promise.all(["classic", "esm"].map(readFixture));

// The static reads the consumer bin makes of a remote entry.
for (const { format, remote } of fixtures) {
  const entryName = `The ${format} fixture ${REMOTE_ENTRY_NAME}`;
  assertWebpackContainer(remote.source, entryName);
  assertExposesPanel(remote.source, entryName);
  assertEntryCarriesNoLibrary(remote.source, entryName);
  assertConsumedShares(remote.source, expectedShared, parseRange);
}

// Each entry loads the way the Admin loads its format: a module remote from
// its exports, a classic remote from the global named after the package.
const byFormat = Object.fromEntries(
  fixtures.map((fixture) => [fixture.format, fixture]),
);
assertModuleContainer(byFormat.esm.remote.source, REMOTE_ENTRY_NAME);
const classicContainer = toSafeModuleId(packageName);
assertClassicContainerLoads({
  containerName: classicContainer,
  entryName: REMOTE_ENTRY_NAME,
  source: byFormat.classic.remote.source,
});

// The exposed panel renders in every state the Admin opens it in, with the
// compatibility notice first, from the real chunks: the module remote in a
// worker, as the bin renders a module consumer, the classic one in a context.
const renders = {
  classic: await renderPanelRemote({
    bundles: byFormat.classic.files,
    containerName: classicContainer,
    entryName: REMOTE_ENTRY_NAME,
    exposedModule: PLUGIN_CONFIG_PANEL,
    react: require("react"),
    reactDom: require("react-dom"),
    renderToStaticMarkup: require("react-dom/server").renderToStaticMarkup,
    states: HOST_STATES,
  }),
  esm: await renderModulePanelRemote({
    entryPath: join(byFormat.esm.dist, REMOTE_ENTRY_NAME),
    exposedModule: PLUGIN_CONFIG_PANEL,
    root: repositoryPath(),
    states: HOST_STATES,
  }),
};
for (const [format, { compatibility, renders: stateRenders }] of Object.entries(
  renders,
)) {
  assertMarkupIncludes(
    compatibility.markup,
    [COMPATIBILITY_NOTICE_MARKER],
    `The ${format} fixture panel rendered for a browser without native CSS @scope`,
  );
  stateRenders.forEach(({ markup }, index) => {
    try {
      assertMarkupVersionStamp(markup, version);
    } catch (cause) {
      throw new Error(
        `The ${format} fixture panel rendered ${HOST_STATES[index].label}: ${cause.message}`,
        { cause },
      );
    }
  });
}

for (const { files, format, stats } of fixtures) {
  const sources = files.map((file) => file.source);
  assertVersionStamp(sources, version);
  assertNoReactRuntime(sources.join("\n"), `The ${format} fixture`);
  assertNoHostHarness(files, `The ${format} fixture`);

  // A file module is recorded by its path, and a consumed share by the name
  // Webpack gives it, so the one list answers every lookup below.
  const modulePaths = collectModulePaths(stats);
  for (const entryPoint of packageEntryFiles) {
    if (!modulePaths.some((path) => path.includes(`dist/${entryPoint}`))) {
      throw new Error(
        `${format} fixture did not consume the ${entryPoint} package entry point.`,
      );
    }
  }
  for (const tooling of TOOLING_ENTRIES) {
    if (modulePaths.some((path) => path.includes(`dist/${tooling}`))) {
      throw new Error(
        `${format} fixture bundles the ${tooling} test tooling entry point, which no panel may contain.`,
      );
    }
  }
  for (const [shared, share] of Object.entries(expectedShared)) {
    const consumed = `consume shared module (default) ${shared}@${share.requiredVersion} (singleton)`;
    if (!modulePaths.includes(consumed)) {
      throw new Error(
        `${format} fixture did not consume host-shared ${shared} at ${share.requiredVersion} as a singleton.`,
      );
    }
  }

  try {
    assertNoHostOwnedModules(modulePaths);
  } catch (cause) {
    throw new Error(`The ${format} fixture: ${cause.message}`, { cause });
  }
}

process.stdout.write(
  "Classic var and output-module ESM Module Federation fixtures passed the consumer checks with the published share map, and their panels rendered in every host state.\n",
);
