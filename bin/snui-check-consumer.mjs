#!/usr/bin/env node
/**
 * Checks a consumer plugin's build against the signalk-nearlcrews-ui release
 * it installed and against the Signal K Admin that will load it.
 *
 *   snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry>
 *                       [--asset <name>] [--baseline <size-baseline.json>]
 *                       [--webpack-config <webpack.config.cjs>]
 *                       [--container <global>] [--runtime-dependency]
 *                       [--stats <webpack-stats.json>] [--styles <sourceDir>]
 *                       [--runtime --expose <module> [--expect <text>]
 *                       [--expect-unsupported <text>]
 *                       [--no-compatibility-render] [--props <json>]]
 *   snui-check-consumer --help | --version
 *
 * Asserts, in order: the consumer pins an exact version as a development
 * dependency (with --runtime-dependency, a runtime placement that pins the
 * same exact version is accepted) and the installed package is that version;
 * the package carries the configurator keyword and the entry sits at
 * public/remoteEntry.js, where the server serves it; the entry is a Webpack
 * container whose format matches the script tag the server writes for the
 * package type (a classic entry, evaluated alone, leaves a container on the
 * global the Admin reads, and a module entry exports get and init) and that
 * exposes ./PluginConfigurationPanel; the entry itself carries none of the
 * library; the remote's JavaScript files, taken together, carry that
 * version's data-snui-version stamp and no other version's; no React
 * runtime, no development JSX runtime, and nothing of the host harness was
 * bundled; the remote consumes exactly the published share map (and the
 * Webpack configuration declares it, when one is found); every CSS asset
 * references only the installed release's public tokens, documented hooks,
 * and container name; with --stats, the Webpack module graph holds only the
 * JSX runtime from React, nothing from React DOM or the scheduler, exactly
 * one copy of this package, and at most one copy each of the React Aria
 * packages; with --styles, no CSS module class overrides a package
 * component through a single class selector; and, with a baseline, the gzip
 * size of the remote's assets stays within the recorded growth allowance or
 * approved ceiling.
 *
 * With --runtime it then renders the panel the way the Signal K Admin host
 * does, in every state the host first opens it in, and asserts the
 * compatibility notice a browser without native CSS @scope gets and the
 * version stamp on the markup the panel actually produced. A module remote
 * renders in a worker thread.
 *
 * The check runs the consumer's own code: it loads the installed package's
 * federation entry, loads and calls the Webpack configuration it finds,
 * and evaluates a classic remote entry. With --runtime it evaluates the whole
 * built remote, in a context that answers browser globals but is not a
 * security boundary. Point the check at a build and a working tree the
 * operator trusts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertKnownOptions,
  formatCount,
  joinNames,
  readFlag,
  readOption,
  readValues,
} from "./lib/cli-arguments.mjs";
import {
  assertConfiguredShares,
  assertConsumedShares,
  assertExactPin,
  assertNoHostHarness,
  assertNoReactRuntime,
  assertProductionJsxRuntime,
  assertSizeBaseline,
  assertVersionStamp,
  gzipBytesOf,
  loadWebpackParseRange,
  PACKAGE_NAME,
  RUNTIME_DEPENDENCY_COST,
  runtimeDependencyFieldOf,
} from "./lib/consumer-checks.mjs";
import {
  assertConfiguratorKeyword,
  assertEntryCarriesNoLibrary,
  assertExposesPanel,
  assertModuleContainer,
  assertRemoteLocation,
  assertWebpackContainer,
  remoteFormatOf,
  toSafeModuleId,
} from "./lib/host-loading.mjs";
import { readJson } from "./lib/json-file.mjs";
import { assertModuleGraph } from "./lib/module-graph.mjs";
import { renderModulePanelRemote } from "./lib/module-runtime.mjs";
import {
  assertPackageTokens,
  CONSUMER_HOOK_NAMES,
  declaredTokenNames,
} from "./lib/package-tokens.mjs";
import {
  assertClassicContainerLoads,
  assertMarkupIncludes,
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  failureOf,
  HOST_STATES,
  loadConsumerReact,
  renderPanelRemote,
} from "./lib/panel-runtime.mjs";
import { assertDoubledOverrides } from "./lib/style-overrides.mjs";

/**
 * Every option the check takes, once: the usage text, the set a misspelled
 * option is checked against, the options that take the argument after them,
 * and the options that mean nothing without --runtime are all read from here.
 * `value` names the argument an option takes, and `runtime` marks an option
 * that only --runtime reads.
 */
const OPTION_TABLE = Object.freeze([
  { name: "--root", value: "<consumerDir>" },
  { name: "--remote", value: "<builtRemoteEntry>" },
  { name: "--asset", value: "<name>" },
  { name: "--baseline", value: "<json>" },
  { name: "--webpack-config", value: "<path>" },
  { name: "--container", value: "<global>" },
  { name: "--runtime-dependency" },
  { name: "--stats", value: "<json>" },
  { name: "--styles", value: "<dir>" },
  { name: "--runtime" },
  { name: "--expose", value: "<module>", runtime: true },
  { name: "--expect", value: "<text>", runtime: true },
  { name: "--expect-unsupported", value: "<text>", runtime: true },
  { name: "--no-compatibility-render", runtime: true },
  { name: "--props", value: "<json>", runtime: true },
]);

/** The options the command answers on its own, without a consumer to check. */
const INFORMATION_OPTIONS = Object.freeze(["--help", "--version"]);

const REQUIRED_OPTIONS = Object.freeze(["--root", "--remote"]);

const describeOption = ({ name, value }) =>
  value === undefined ? name : `${name} ${value}`;

const USAGE = `Usage: snui-check-consumer ${[
  ...OPTION_TABLE.filter(
    ({ name, runtime }) => !runtime && REQUIRED_OPTIONS.includes(name),
  ).map(describeOption),
  ...OPTION_TABLE.filter(
    ({ name, runtime }) =>
      !runtime && name !== "--runtime" && !REQUIRED_OPTIONS.includes(name),
  ).map((option) => `[${describeOption(option)}]`),
  `[--runtime ${OPTION_TABLE.filter(({ runtime }) => runtime)
    .map((option, index) =>
      index === 0 ? describeOption(option) : `[${describeOption(option)}]`,
    )
    .join(" ")}]`,
].join(
  " ",
)} | --help | --version. --root resolves against the working directory, and every other path resolves against --root.`;

/** Options that mean nothing without --runtime, so a typo cannot pass quietly. */
const RUNTIME_OPTIONS = Object.freeze(
  OPTION_TABLE.filter(({ runtime }) => runtime).map(({ name }) => name),
);

/** Every option the check takes, so a misspelled one fails rather than being skipped. */
const OPTIONS = Object.freeze([
  ...OPTION_TABLE.map(({ name }) => name),
  ...INFORMATION_OPTIONS,
]);

/**
 * The options that take the argument after them. Any other argument that is
 * not an option fails, because nothing would read it.
 */
const VALUE_OPTIONS = Object.freeze(
  OPTION_TABLE.filter(({ value }) => value !== undefined).map(
    ({ name }) => name,
  ),
);

/** The JavaScript files of a remote, which the stamp and runtime scans read. */
const SCRIPT_FILE = /\.[cm]?js$/;

/** The stylesheets of a remote, which the token scan reads. */
const STYLESHEET_FILE = /\.css$/;

/** Every file a remote that owns its output directory is made of. */
const REMOTE_ASSET_FILE = /\.(?:[cm]?js|css)$/;

/**
 * Reads one of the consumer's JSON files, naming the file and the way to fix
 * it when it is missing instead of surfacing a bare ENOENT.
 */
async function readConsumerJson(path, remedy) {
  try {
    return await readJson(path);
  } catch (cause) {
    if (cause?.code === "ENOENT") {
      throw new Error(`${path} does not exist. ${remedy}`, { cause });
    }
    throw new Error(`${path} could not be read: ${cause.message}`, { cause });
  }
}

/** The props --props names, or undefined when it was not given. */
function readProps(argv) {
  const value = readOption(argv, "--props", "a JSON object");
  if (value === undefined) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (cause) {
    throw new Error(`--props is not valid JSON: ${cause.message}`, {
      cause,
    });
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--props must be a JSON object.");
  }
  return parsed;
}

function findSharedOption(config) {
  const configs = Array.isArray(config) ? config : [config];
  for (const candidate of configs) {
    for (const plugin of candidate?.plugins ?? []) {
      if (plugin?.options?.shared !== undefined) return plugin.options.shared;
      if (plugin?._options?.shared !== undefined) return plugin._options.shared;
    }
  }
  return undefined;
}

/**
 * The configuration a Webpack configuration file holds, settled the way
 * Webpack's own CLI settles one. The file is imported rather than required,
 * so one written as an ES module loads too: the default export is that
 * module's configuration, and it is module.exports for a CommonJS file. A
 * CommonJS file compiled from an ES module keeps its configuration on a
 * `default` of its own. The configuration, or each entry of an array of them,
 * may be a promise or a function, and a function is called as Webpack calls
 * it for a production build.
 */
async function loadWebpackConfig(path) {
  const { default: exported } = await import(pathToFileURL(path).href);
  const loaded =
    exported !== null && typeof exported === "object" && "default" in exported
      ? exported.default
      : exported;
  const settle = async (entry) => {
    const config = await entry;
    return typeof config === "function"
      ? await config({}, { mode: "production" })
      : config;
  };
  return Array.isArray(loaded)
    ? await Promise.all(loaded.map(settle))
    : await settle(loaded);
}

/** Whether the consumer has Webpack installed at all. */
function hasWebpack(consumerRequire) {
  try {
    consumerRequire.resolve("webpack/package.json");
    return true;
  } catch {
    return false;
  }
}

/**
 * Webpack's own range encoder. A consumer without Webpack is a supported case
 * and falls back to the caret ranges this package publishes, but a consumer
 * that has Webpack and cannot load the encoder has a moved internal path or a
 * broken install, which is worth saying rather than quietly degrading.
 */
function readParseRange(consumerRequire) {
  if (!hasWebpack(consumerRequire)) return undefined;
  return loadWebpackParseRange(
    consumerRequire,
    "Webpack is installed beside the consumer, so the check encodes the required versions the remote entry carries with Webpack's own encoder.",
  );
}

/**
 * Asserts the entry loads the way the Admin will load it, for the script tag
 * the server writes for this package's type. Returns a clause for the summary.
 */
function assertHostLoading({ argv, consumerManifest, entryName, entrySource }) {
  const format = remoteFormatOf(consumerManifest);
  const containerOption = readOption(argv, "--container", "a global name");
  if (format === "module") {
    if (containerOption !== undefined) {
      throw new Error(
        '--container names the global a classic container assigns itself to. package.json sets "type": "module", so the Admin reads this container from the module\'s exports instead.',
      );
    }
    assertModuleContainer(entrySource, entryName);
    return { clause: "module remote exporting get and init", format };
  }
  const containerName =
    containerOption ?? toSafeModuleId(consumerManifest.name ?? "");
  try {
    assertClassicContainerLoads({
      containerName,
      entryName,
      source: entrySource,
    });
  } catch (cause) {
    throw new Error(
      `${entryName} does not load as the classic remote the Signal K Admin expects: ${failureOf(cause)}`,
      { cause },
    );
  }
  return {
    clause: `classic remote assigning window.${containerName}`,
    containerName,
    format,
  };
}

/**
 * Renders the panel in every host state, and in the --props state when one is
 * given, and asserts what each render must show. Returns a clause for the
 * summary.
 */
async function assertRuntime({
  argv,
  consumerRequire,
  entryName,
  hostLoading,
  remoteEntry,
  root,
  scripts,
  version,
}) {
  const exposedModule = readOption(argv, "--expose", "a module name");
  if (exposedModule === undefined) {
    throw new Error(
      "--runtime needs --expose <module>, the name the remote exposes the panel under, such as ./PluginConfigurationPanel.",
    );
  }

  // The host states come first, so a panel that cannot open on a fresh
  // install fails before a configured render can hide it.
  const props = readProps(argv);
  const states =
    props === undefined
      ? HOST_STATES
      : [
          ...HOST_STATES,
          {
            description: "the --props configuration",
            label: "with the --props configuration",
            props,
          },
        ];
  const renderCompatibilityNotice = !readFlag(
    argv,
    "--no-compatibility-render",
  );
  // Read before the render, so text the skipped render would have been held
  // to fails here rather than passing unchecked.
  const expectedUnsupported = readValues(argv, "--expect-unsupported", "text");
  if (!renderCompatibilityNotice && expectedUnsupported.length > 0) {
    throw new Error(
      "--expect-unsupported needs the compatibility render that --no-compatibility-render skips.",
    );
  }
  // A module remote renders in a worker, which loads the consumer's React
  // in its own realm.
  const { compatibility, renders } =
    hostLoading.format === "module"
      ? await renderModulePanelRemote({
          entryPath: remoteEntry,
          exposedModule,
          renderCompatibilityNotice,
          root,
          states,
        })
      : await renderPanelRemote({
          ...loadConsumerReact(consumerRequire),
          bundles: scripts,
          containerName: hostLoading.containerName,
          entryName,
          exposedModule,
          renderCompatibilityNotice,
          states,
        });

  if (compatibility !== undefined) {
    // A consumer that replaces the notice knows its own words; every other
    // panel gets this package's own, which carries the marker attribute.
    assertMarkupIncludes(
      compatibility.markup,
      expectedUnsupported.length > 0
        ? expectedUnsupported
        : [COMPATIBILITY_NOTICE_MARKER],
      "The panel rendered for a browser without native CSS @scope",
    );
  }
  // The {} render is held to no stamp or text: a package enabled by default
  // normalizes it through its own defaults, which is not this check's to
  // judge. It still counts saves below, like every render.
  const [unconfigured, , configured] = renders;
  const asserted =
    configured === undefined ? [unconfigured] : [unconfigured, configured];
  for (const { markup } of asserted) {
    assertMarkupVersionStamp(markup, version);
  }
  assertMarkupIncludes(
    asserted.at(-1).markup,
    readValues(argv, "--expect", "text"),
    "The rendered panel",
  );
  // Named by render, because the check renders the panel more than once and
  // a total would report one call site as though it were several.
  const saving = [
    ...((compatibility?.saves ?? 0) > 0 ? ["without native CSS @scope"] : []),
    ...renders.flatMap((render, index) =>
      render.saves > 0 ? [states[index].label] : [],
    ),
  ];
  if (saving.length > 0) {
    throw new Error(
      `The panel called save while it rendered ${joinNames(saving)}. The host passes save for a user action, and a panel that saves during render saves on every host render.`,
    );
  }
  return `panel rendered from ${formatCount(scripts.length, "bundle")} with configuration undefined and {}${configured === undefined ? "" : " and --props"}`;
}

/** This package's own manifest, which `--version` reads. */
const OWN_MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json",
);

/**
 * The options of one run, validated: a misspelled option, a missing required
 * one, or a runtime option without --runtime fails here, before any file is
 * read.
 */
function readRunOptions(argv) {
  assertKnownOptions(argv, OPTIONS, {
    hint: `\n${USAGE}`,
    valued: VALUE_OPTIONS,
  });
  const missing = REQUIRED_OPTIONS.filter(
    (option) => readOption(argv, option, "a path") === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `${joinNames(missing)} ${missing.length === 1 ? "is" : "are"} required.\n${USAGE}`,
    );
  }
  const runtime = readFlag(argv, "--runtime");
  if (!runtime) {
    const stray = RUNTIME_OPTIONS.filter((option) =>
      readFlag(argv, option),
    ).sort();
    if (stray.length > 0) {
      throw new Error(
        `${joinNames(stray)} ${stray.length === 1 ? "needs" : "need"} --runtime.`,
      );
    }
  }
  const root = resolve(readOption(argv, "--root", "a path"));
  return {
    allowRuntimeDependency: readFlag(argv, "--runtime-dependency"),
    baselineOption: readOption(argv, "--baseline", "a path"),
    remoteEntry: resolve(root, readOption(argv, "--remote", "a path")),
    root,
    runtime,
    statsOption: readOption(argv, "--stats", "a path"),
    stylesOption: readOption(argv, "--styles", "a directory"),
    webpackConfigOption: readOption(argv, "--webpack-config", "a path"),
  };
}

/**
 * The consumer's manifest and the installed copy of this package. A consumer
 * that has not run npm install, or that is not a package at all, gets a
 * sentence saying so rather than Node's resolution stack.
 */
async function readConsumer(root) {
  const consumerManifest = await readConsumerJson(
    join(root, "package.json"),
    `Point --root at the consumer plugin's directory, the one that holds its package.json.`,
  );
  const consumerRequire = createRequire(join(root, "package.json"));
  let installedPath;
  try {
    installedPath = consumerRequire.resolve(`${PACKAGE_NAME}/package.json`);
  } catch {
    // No cause: the resolution error is a require stack that tells the
    // plugin author nothing the sentence does not.
    throw new Error(
      `${PACKAGE_NAME} is not installed under ${root}. Run npm install in ${root}, then run the check again.`,
    );
  }
  return {
    consumerManifest,
    consumerRequire,
    installedManifest: await readJson(installedPath),
  };
}

/**
 * The remote's files. Without --asset the whole directory is the remote,
 * which is what a panel build that owns its output directory produces. A
 * plugin that serves other bundles from the same directory names the remote's
 * own files instead. Each is read once, on first use: the scans take an
 * asset's text and the size checks its bytes.
 */
function readRemoteAssets(argv, remoteEntry) {
  const remoteDirectory = dirname(remoteEntry);
  const entryName = basename(remoteEntry);
  const namedAssets = readValues(
    argv,
    "--asset",
    "a file name beside the remote entry",
  );
  const assetNames =
    namedAssets.length > 0
      ? [...new Set([entryName, ...namedAssets])]
      : readdirSync(remoteDirectory).filter((name) =>
          REMOTE_ASSET_FILE.test(name),
        );
  const assetBytes = new Map();
  const bytesOf = (name) => {
    if (!assetBytes.has(name)) {
      assetBytes.set(name, readFileSync(join(remoteDirectory, name)));
    }
    return assetBytes.get(name);
  };
  const readAssets = (pattern) =>
    assetNames
      .filter((name) => pattern.test(name))
      .map((name) => ({ name, source: bytesOf(name).toString("utf8") }));
  return { assetNames, bytesOf, entryName, readAssets };
}

/**
 * The Webpack configuration to compare against the published share map: the
 * one --webpack-config names, which must exist, or the first conventional file
 * in the consumer root, or undefined when the consumer ships none.
 */
function findWebpackConfig(root, webpackConfigOption) {
  if (webpackConfigOption === undefined) {
    return ["webpack.config.cjs", "webpack.config.js", "webpack.config.mjs"]
      .map((name) => join(root, name))
      .find((path) => existsSync(path));
  }
  const path = resolve(root, webpackConfigOption);
  if (!existsSync(path)) {
    throw new Error(
      `--webpack-config names ${path}, which does not exist. The path resolves against --root.`,
    );
  }
  return path;
}

async function main() {
  const argv = process.argv.slice(2);
  if (readFlag(argv, "--help")) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (readFlag(argv, "--version")) {
    const { version } = await readJson(OWN_MANIFEST_PATH);
    process.stdout.write(`${PACKAGE_NAME} ${version}\n`);
    return;
  }
  const {
    allowRuntimeDependency,
    baselineOption,
    remoteEntry,
    root,
    runtime,
    statsOption,
    stylesOption,
    webpackConfigOption,
  } = readRunOptions(argv);

  const { consumerManifest, consumerRequire, installedManifest } =
    await readConsumer(root);
  const version = assertExactPin(consumerManifest, installedManifest, {
    allowRuntimeDependency,
  });
  assertConfiguratorKeyword(consumerManifest);
  assertRemoteLocation(root, remoteEntry);

  const { assetNames, bytesOf, entryName, readAssets } = readRemoteAssets(
    argv,
    remoteEntry,
  );
  const scripts = readAssets(SCRIPT_FILE);
  const entrySource = scripts.find(({ name }) => name === entryName)?.source;
  if (entrySource === undefined) {
    throw new Error(`The panel build produced no ${entryName}.`);
  }

  // The static reads come before the entry runs, so a finding they can name
  // is not reported as whatever the evaluation tripped over first.
  assertWebpackContainer(entrySource, entryName);
  assertExposesPanel(entrySource, entryName);
  assertEntryCarriesNoLibrary(entrySource, entryName);
  const hostLoading = assertHostLoading({
    argv,
    consumerManifest,
    entryName,
    entrySource,
  });

  assertVersionStamp(
    scripts.map((script) => script.source),
    version,
  );
  for (const { name, source } of scripts) {
    assertNoReactRuntime(source, `The built remote file ${name}`);
  }
  // A substring scan over files already read, so every run gets it and not
  // only the runs that also render the panel.
  assertProductionJsxRuntime(scripts);
  assertNoHostHarness(scripts);

  // The installed package's own share map is the published one for this version.
  const { shared } = consumerRequire(`${PACKAGE_NAME}/federation`);
  assertConsumedShares(entrySource, shared, readParseRange(consumerRequire));

  // The summary, one clause per check, in the order the checks ran.
  const clauses = [
    runtimeDependencyFieldOf(consumerManifest) === undefined
      ? "exact pin"
      : `exact pin as a runtime dependency (${RUNTIME_DEPENDENCY_COST})`,
    hostLoading.clause,
    "version stamp",
    "no React runtime",
    "production JSX runtime",
    `host shares ${joinNames(Object.keys(shared))}`,
  ];

  const webpackConfigPath = findWebpackConfig(root, webpackConfigOption);
  if (webpackConfigPath !== undefined) {
    const config = await loadWebpackConfig(webpackConfigPath);
    assertConfiguredShares(findSharedOption(config), shared);
    clauses.push("Webpack configuration shares match");
  }

  // The installed release's own token sheet declares exactly its public
  // tokens, so the allowed names come from the release the remote bundled.
  const stylesheets = readAssets(STYLESHEET_FILE);
  if (stylesheets.length > 0) {
    const allowedNames = new Set([
      ...declaredTokenNames(
        readFileSync(
          consumerRequire.resolve(`${PACKAGE_NAME}/tokens.css`),
          "utf8",
        ),
      ),
      ...CONSUMER_HOOK_NAMES,
    ]);
    assertPackageTokens(stylesheets, allowedNames);
    clauses.push(
      `package names in ${formatCount(stylesheets.length, "CSS file")}`,
    );
  }

  if (statsOption !== undefined) {
    const modules = assertModuleGraph(
      await readConsumerJson(
        resolve(root, statsOption),
        "--stats names the stats file Webpack wrote with --json; the path resolves against --root.",
      ),
    );
    clauses.push(`module graph of ${formatCount(modules, "module")}`);
  }

  if (stylesOption !== undefined) {
    const cssModules = await assertDoubledOverrides(
      resolve(root, stylesOption),
      root,
    );
    clauses.push(
      `doubled overrides in ${formatCount(cssModules, "CSS module")}`,
    );
  }

  // The entry loads on every Admin page, so its own size is reported beside
  // the total, which loads only when the panel opens.
  const entrySize = `remote entry ${gzipBytesOf([bytesOf(entryName)])} gzip bytes`;
  if (baselineOption === undefined) {
    clauses.push(entrySize);
  } else {
    const baseline = await readConsumerJson(
      resolve(root, baselineOption),
      "--baseline names the size baseline file; the path resolves against --root.",
    );
    const gzipBytes = gzipBytesOf(assetNames.map(bytesOf));
    clauses.push(
      assertSizeBaseline(gzipBytes, baseline),
      `${entrySize} of them`,
    );
  }

  if (runtime) {
    clauses.push(
      await assertRuntime({
        argv,
        consumerRequire,
        entryName,
        hostLoading,
        remoteEntry,
        root,
        scripts,
        version,
      }),
    );
  }

  process.stdout.write(
    `${PACKAGE_NAME} ${version} consumer check passed: ${clauses.join(", ")}.\n`,
  );
}

try {
  await main();
} catch (error) {
  // A plugin author reading a check failure wants the sentence, not this
  // file's stack frames and Node's version banner.
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error && !message.includes(cause.message)) {
    process.stderr.write(`Caused by: ${cause.message}\n`);
  }
  process.exitCode = 1;
}
