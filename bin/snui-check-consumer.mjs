#!/usr/bin/env node
/**
 * Checks a consumer plugin's build against the signalk-nearlcrews-ui release
 * it installed.
 *
 *   snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry>
 *                       [--baseline <size-baseline.json>]
 *                       [--webpack-config <webpack.config.cjs>]
 *
 * Asserts, in order: the consumer pins an exact version and the installed
 * package is that version; every JavaScript file beside the remote entry
 * carries that version's data-snui-version stamp and no other; no React
 * runtime was bundled; the remote consumes exactly the published share map
 * (and the Webpack configuration declares it, when one is found); and, with a
 * baseline, the gzip size of the remote's assets stays within the recorded
 * growth allowance or approved ceiling.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  assertConfiguredShares,
  assertConsumedShares,
  assertExactPin,
  assertNoReactRuntime,
  assertSizeBaseline,
  assertVersionStamp,
  gzipBytesOf,
} from "./lib/consumer-checks.mjs";

const PACKAGE_NAME = "signalk-nearlcrews-ui";

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a path.`);
  }
  return value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
    "Usage: snui-check-consumer --root <consumerDir> --remote <builtRemoteEntry> [--baseline <json>] [--webpack-config <path>]",
  );
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
const scriptSources = assetNames
  .filter((name) => /\.[cm]?js$/.test(name))
  .map((name) => readFileSync(join(remoteDirectory, name), "utf8"));
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

console.log(
  `${PACKAGE_NAME} ${version} consumer check passed: exact pin, version stamp, no React runtime, host shares ${Object.keys(shared).join(" and ")}${configuredMessage}${sizeMessage}.`,
);
