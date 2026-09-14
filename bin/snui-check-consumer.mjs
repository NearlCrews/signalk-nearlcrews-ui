#!/usr/bin/env node
/**
 * Checks a consumer plugin's build against the signalk-nearlcrews-ui release
 * it installed.
 *
 *   snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry>
 *                       [--asset <name>] [--baseline <size-baseline.json>]
 *                       [--webpack-config <webpack.config.cjs>]
 *                       [--runtime --expose <module> [runtime options]]
 *
 * Asserts, in order: the consumer pins an exact version and the installed
 * package is that version; every JavaScript file beside the remote entry
 * carries that version's data-snui-version stamp and no other; no React
 * runtime and no development JSX runtime was bundled; the remote consumes
 * exactly the published share map (and the Webpack configuration declares it,
 * when one is found); and, with a baseline, the gzip size of the remote's
 * assets stays within the recorded growth allowance or approved ceiling.
 *
 * With --runtime it then renders the panel the way the Signal K Admin host
 * does and asserts the compatibility notice a browser without native CSS
 * @scope gets and the version stamp on the markup the panel actually produced.
 *
 * The check runs the consumer's own code: it loads the installed package's
 * federation entry, and it requires and calls the Webpack configuration it
 * finds. With --runtime it also evaluates the built remote, in a context that
 * answers browser globals but is not a security boundary. Point the check at a
 * build and a working tree the operator trusts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";

import {
  assertKnownOptions,
  formatCount,
  joinNames,
  readOption,
  readValues,
} from "./lib/cli-arguments.mjs";
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

const USAGE =
  "Usage: snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry> [--asset <name>] [--baseline <json>] [--webpack-config <path>] [--runtime --expose <module>]. --root resolves against the working directory, and every other path resolves against --root.";

/** Options that mean nothing without --runtime, so a typo cannot pass quietly. */
const RUNTIME_OPTIONS = Object.freeze([
  "--container",
  "--expect",
  "--expect-unsupported",
  "--expose",
  "--no-compatibility-render",
  "--props",
]);

/** Every option the check takes, so a misspelled one fails rather than being skipped. */
const OPTIONS = Object.freeze([
  "--asset",
  "--baseline",
  "--remote",
  "--root",
  "--runtime",
  "--webpack-config",
  ...RUNTIME_OPTIONS,
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The props the host passes a configuration panel, with --props merged in. */
function readProps(argv) {
  const value = readOption(argv, "--props", "a JSON object");
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
  // the render harness supplies it. A panel that calls it while it renders is
  // reported rather than silently saved.
  return { configuration: null, ...parsed };
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
  try {
    return consumerRequire("webpack/lib/util/semver.js").parseRange;
  } catch (cause) {
    if (!hasWebpack(consumerRequire)) return undefined;
    throw new Error(
      `Webpack is installed beside the consumer, but webpack/lib/util/semver.js did not load: ${cause.message}. The check encodes the required versions the remote entry carries with Webpack's own encoder.`,
      { cause },
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  assertKnownOptions(argv, OPTIONS, `\n${USAGE}`);
  const rootOption = readOption(argv, "--root", "a path");
  const remoteOption = readOption(argv, "--remote", "a path");
  if (rootOption === undefined || remoteOption === undefined) {
    throw new Error(USAGE);
  }
  const runtime = argv.includes("--runtime");
  if (!runtime) {
    const stray = RUNTIME_OPTIONS.filter((option) => argv.includes(option));
    if (stray.length > 0) {
      throw new Error(`${joinNames(stray)} need --runtime.`);
    }
  }
  const root = resolve(rootOption);
  const remoteEntry = resolve(root, remoteOption);
  const remoteDirectory = dirname(remoteEntry);
  const entryName = basename(remoteEntry);
  const baselineOption = readOption(argv, "--baseline", "a path");
  const webpackConfigOption = readOption(argv, "--webpack-config", "a path");

  const consumerRequire = createRequire(join(root, "package.json"));
  const consumerManifest = readJson(join(root, "package.json"));
  const installedManifest = readJson(
    consumerRequire.resolve(`${PACKAGE_NAME}/package.json`),
  );
  const version = assertExactPin(consumerManifest, installedManifest);

  // Without --asset the whole directory is the remote, which is what a panel
  // build that owns its output directory produces. A plugin that serves other
  // bundles from the same directory names the remote's own files instead.
  const namedAssets = readValues(
    argv,
    "--asset",
    "a file name beside the remote entry",
  );
  const assetNames =
    namedAssets.length > 0
      ? [...new Set([entryName, ...namedAssets])]
      : readdirSync(remoteDirectory).filter((name) =>
          /\.(?:[cm]?js|css)$/.test(name),
        );
  const scripts = assetNames
    .filter((name) => /\.[cm]?js$/.test(name))
    .map((name) => ({
      name,
      source: readFileSync(join(remoteDirectory, name), "utf8"),
    }));
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

  // The installed package's own share map is the published one for this version.
  const { shared } = consumerRequire(`${PACKAGE_NAME}/federation`);
  assertConsumedShares(
    readFileSync(remoteEntry, "utf8"),
    shared,
    readParseRange(consumerRequire),
  );

  const webpackConfigPath =
    webpackConfigOption === undefined
      ? ["webpack.config.cjs", "webpack.config.js"]
          .map((name) => join(root, name))
          .find((path) => existsSync(path))
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
    const exposedModule = readOption(argv, "--expose", "a module name");
    if (exposedModule === undefined) {
      throw new Error(
        "--runtime needs --expose <module>, the name the remote exposes the panel under, such as ./PluginConfigurationPanel.",
      );
    }
    // The Signal K Admin loader resolves a classic panel container as a global
    // named after the consumer package, which is what every panel remote
    // assigns its container to.
    const containerName =
      readOption(argv, "--container", "a global name") ??
      consumerManifest.name?.replaceAll(/[-@/]/g, "_");

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

    const { compatibilityMarkup, markup, saveCalls } = await renderPanelRemote({
      bundles: scripts,
      containerName,
      entryName,
      exposedModule,
      props: readProps(argv),
      react,
      reactDom,
      renderCompatibilityNotice: !argv.includes("--no-compatibility-render"),
      renderToStaticMarkup,
    });

    if (compatibilityMarkup !== undefined) {
      // A consumer that replaces the notice knows its own words; every other
      // panel gets this package's own, which carries the marker attribute.
      const expected = readValues(argv, "--expect-unsupported", "text");
      assertMarkupIncludes(
        compatibilityMarkup,
        expected.length > 0 ? expected : [COMPATIBILITY_NOTICE_MARKER],
        "The panel rendered for a browser without native CSS @scope",
      );
    }
    assertMarkupVersionStamp(markup, version);
    assertMarkupIncludes(
      markup,
      readValues(argv, "--expect", "text"),
      "The rendered panel",
    );
    // Per render, because the check renders the panel more than once and a
    // total would report one call site as though it were several.
    const saves = Math.max(0, ...saveCalls);
    if (saves > 0) {
      throw new Error(
        `The panel called save ${formatCount(saves, "time")} in each render. The host passes save for a user action, and a panel that saves during render saves on every host render.`,
      );
    }
    runtimeMessage = `, panel rendered from ${formatCount(scripts.length, "bundle")}`;
  }

  process.stdout.write(
    `${PACKAGE_NAME} ${version} consumer check passed: exact pin, version stamp, no React runtime, production JSX runtime, host shares ${Object.keys(shared).join(" and ")}${configuredMessage}${sizeMessage}${runtimeMessage}.\n`,
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
