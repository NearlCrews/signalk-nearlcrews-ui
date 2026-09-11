#!/usr/bin/env node
/**
 * Checks a consumer plugin's build against the signalk-nearlcrews-ui release
 * it installed.
 *
 *   snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry>
 *                       [--baseline <size-baseline.json>]
 *                       [--webpack-config <webpack.config.cjs>]
 *                       [--runtime --expose <module> [runtime options]]
 *
 * Asserts, in order: the consumer pins an exact version and the installed
 * package is that version; every JavaScript file beside the remote entry
 * carries that version's data-snui-version stamp and no other; no React
 * runtime was bundled; the remote consumes exactly the published share map
 * (and the Webpack configuration declares it, when one is found); and, with a
 * baseline, the gzip size of the remote's assets stays within the recorded
 * growth allowance or approved ceiling.
 *
 * With --runtime it then renders the panel the way the Signal K Admin host
 * does and asserts the production JSX runtime, the compatibility notice a
 * browser without native CSS @scope gets, and the version stamp on the markup
 * the panel actually produced.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  assertConfiguredShares,
  assertConsumedShares,
  assertExactPin,
  assertNoReactRuntime,
  assertProductionJsxRuntime,
  assertSizeBaseline,
  assertVersionStamp,
  gzipBytesOf,
} from "./lib/consumer-checks.mjs";
import {
  assertMarkupIncludes,
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  renderPanelRemote,
} from "./lib/panel-runtime.mjs";

const PACKAGE_NAME = "signalk-nearlcrews-ui";

/** Options that mean nothing without --runtime, so a typo cannot pass quietly. */
const RUNTIME_OPTIONS = Object.freeze([
  "--container",
  "--expect",
  "--expect-unsupported",
  "--expose",
  "--no-compatibility-render",
  "--props",
]);

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a path.`);
  }
  return value;
}

/** Every value given for a repeatable option, in the order they were given. */
function readValues(argv, name) {
  const values = [];
  for (const [index, argument] of argv.entries()) {
    if (argument !== name) continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    values.push(value);
  }
  return values;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The props the host passes a configuration panel, with --props merged in. */
function readProps(argv, onSave) {
  const [value] = readValues(argv, "--props");
  let parsed = {};
  if (value !== undefined) {
    try {
      parsed = JSON.parse(value);
    } catch (cause) {
      throw new Error(`--props is not valid JSON: ${cause.message}`, {
        cause,
      });
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("--props must be a JSON object.");
    }
  }
  // The host passes `save` for a user action, so JSON cannot express it and
  // the check supplies it. A panel that calls it while it renders is reported
  // rather than silently saved.
  return { configuration: null, ...parsed, save: onSave };
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

const argv = process.argv.slice(2);
const rootOption = readOption(argv, "--root");
const remoteOption = readOption(argv, "--remote");
if (rootOption === undefined || remoteOption === undefined) {
  throw new Error(
    "Usage: snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry> [--baseline <json>] [--webpack-config <path>] [--runtime --expose <module>]",
  );
}
const runtime = argv.includes("--runtime");
if (!runtime) {
  const stray = RUNTIME_OPTIONS.filter((option) => argv.includes(option));
  if (stray.length > 0) {
    throw new Error(`${stray.join(" and ")} need --runtime.`);
  }
}
const root = resolve(rootOption);
const remoteEntry = isAbsolute(remoteOption)
  ? remoteOption
  : resolve(root, remoteOption);
const remoteDirectory = dirname(remoteEntry);
const baselineOption = readOption(argv, "--baseline");
const webpackConfigOption = readOption(argv, "--webpack-config");

const consumerRequire = createRequire(join(root, "package.json"));
const consumerManifest = readJson(join(root, "package.json"));
const installedManifest = readJson(
  consumerRequire.resolve(`${PACKAGE_NAME}/package.json`),
);
const version = assertExactPin(consumerManifest, installedManifest);

const assetNames = readdirSync(remoteDirectory).filter((name) =>
  /\.(?:[cm]?js|css)$/.test(name),
);
const scripts = assetNames
  .filter((name) => /\.[cm]?js$/.test(name))
  .map((name) => ({
    name,
    source: readFileSync(join(remoteDirectory, name), "utf8"),
  }));
const scriptSources = scripts.map((script) => script.source);
assertVersionStamp(scriptSources, version);
assertNoReactRuntime(scriptSources.join("\n"));

// The installed package's own share map is the published one for this version.
const { shared } = consumerRequire(`${PACKAGE_NAME}/federation`);
let parseRange;
try {
  ({ parseRange } = consumerRequire("webpack/lib/util/semver.js"));
} catch {
  parseRange = undefined;
}
assertConsumedShares(readFileSync(remoteEntry, "utf8"), shared, parseRange);

const webpackConfigPath =
  webpackConfigOption === undefined
    ? ["webpack.config.cjs", "webpack.config.js"]
        .map((name) => join(root, name))
        .find((path) => {
          try {
            readFileSync(path);
            return true;
          } catch {
            return false;
          }
        })
    : resolve(root, webpackConfigOption);
let configuredMessage = "";
if (webpackConfigPath !== undefined) {
  const loaded = consumerRequire(webpackConfigPath);
  const config =
    typeof loaded === "function"
      ? await loaded({}, { mode: "production" })
      : loaded;
  assertConfiguredShares(findSharedOption(config), shared);
  configuredMessage = ", Webpack configuration shares match";
}

let sizeMessage = "";
if (baselineOption !== undefined) {
  const baseline = readJson(resolve(root, baselineOption));
  const gzipBytes = gzipBytesOf(
    assetNames.map((name) => readFileSync(join(remoteDirectory, name))),
  );
  sizeMessage = `, ${assertSizeBaseline(gzipBytes, baseline)}`;
}

let runtimeMessage = "";
if (runtime) {
  assertProductionJsxRuntime(scripts);

  const [exposedModule] = readValues(argv, "--expose");
  if (exposedModule === undefined) {
    throw new Error(
      "--runtime needs --expose <module>, the name the remote exposes the panel under, such as ./PluginConfigurationPanel.",
    );
  }
  // Webpack's own convention for a library name taken from a package name,
  // which is what every Signal K panel remote assigns its container to.
  const [containerName = consumerManifest.name?.replaceAll(/[-@/]/g, "_")] =
    readValues(argv, "--container");

  let saveCalls = 0;
  const props = readProps(argv, () => {
    saveCalls += 1;
  });
  let react;
  let reactDom;
  let renderToStaticMarkup;
  try {
    react = consumerRequire("react");
    reactDom = consumerRequire("react-dom");
    ({ renderToStaticMarkup } = consumerRequire("react-dom/server"));
  } catch (cause) {
    throw new Error(
      `--runtime renders the panel with the consumer's own React, which is not installed: ${cause.message}`,
      { cause },
    );
  }

  const { compatibilityMarkup, markup } = await renderPanelRemote({
    bundles: scripts,
    containerName,
    exposedModule,
    props,
    react,
    reactDom,
    renderCompatibilityNotice: !argv.includes("--no-compatibility-render"),
    renderToStaticMarkup,
  });

  if (compatibilityMarkup !== undefined) {
    // A consumer that replaces the notice knows its own words; every other
    // panel gets this package's own, which carries the marker attribute.
    const expected = readValues(argv, "--expect-unsupported");
    assertMarkupIncludes(
      compatibilityMarkup,
      expected.length > 0 ? expected : [COMPATIBILITY_NOTICE_MARKER],
      "The panel rendered for a browser without native CSS @scope",
    );
  }
  assertMarkupVersionStamp(markup, version);
  assertMarkupIncludes(
    markup,
    readValues(argv, "--expect"),
    "The rendered panel",
  );
  if (saveCalls > 0) {
    throw new Error(
      `The panel called save ${saveCalls} times while it rendered. The host passes save for a user action, and a panel that saves during render saves on every host render.`,
    );
  }
  runtimeMessage = `, production JSX runtime, panel rendered from ${scripts.length} ${scripts.length === 1 ? "bundle" : "bundles"}`;
}

console.log(
  `${PACKAGE_NAME} ${version} consumer check passed: exact pin, version stamp, no React runtime, host shares ${Object.keys(shared).join(" and ")}${configuredMessage}${sizeMessage}${runtimeMessage}.`,
);
