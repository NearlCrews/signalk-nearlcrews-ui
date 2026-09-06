import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  assertConsumedShares,
  assertNoReactRuntime,
  assertVersionStamp,
} from "../bin/lib/consumer-checks.mjs";
import { createFederationShared } from "./lib/federation-share.mjs";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);
const { peerDependencies, version } = await readPackageJson();
const expectedShared = createFederationShared(peerDependencies);
const { parseRange } = require("webpack/lib/util/semver.js");

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
  const javascriptNames = names.filter((name) => name.endsWith(".js"));
  const files = await Promise.all(
    javascriptNames.map(async (name) => ({
      name,
      source: await readFile(join(directory, name), "utf8"),
    })),
  );
  return files;
}

async function readStats(directory) {
  const stats = JSON.parse(
    await readFile(join(directory, "stats.json"), "utf8"),
  );
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

const classicDist = repositoryPath("fixtures", "federation", "classic", "dist");
const esmDist = repositoryPath("fixtures", "federation", "esm", "dist");
const classicFiles = await readJavaScript(classicDist);
const esmFiles = await readJavaScript(esmDist);
const classicStats = await readStats(classicDist);
const esmStats = await readStats(esmDist);
const classicRemote = classicFiles.find(
  (file) => file.name === "remoteEntry.js",
);
const esmRemote = esmFiles.find((file) => file.name === "remoteEntry.js");

if (!classicRemote?.source.includes("signalk_nearlcrews_ui")) {
  throw new Error(
    "Classic remoteEntry.js does not expose the global container.",
  );
}

if (!esmRemote?.source.includes("export")) {
  throw new Error("ESM remoteEntry.js does not contain module exports.");
}

for (const [format, remote] of [
  ["classic", classicRemote],
  ["esm", esmRemote],
]) {
  if (!remote?.source.includes("./PluginConfigurationPanel")) {
    throw new Error(
      `${format} remoteEntry.js does not expose ./PluginConfigurationPanel.`,
    );
  }
  // The same checks the shipped consumer bin runs against a consumer's remote.
  assertConsumedShares(remote.source, expectedShared, parseRange);
}

for (const [format, files, stats] of [
  ["classic", classicFiles, classicStats],
  ["esm", esmFiles, esmStats],
]) {
  const sources = files.map((file) => file.source);
  assertVersionStamp(sources, version);
  assertNoReactRuntime(sources.join("\n"), `The ${format} fixture`);

  const moduleNames = collectModuleNames(stats.modules ?? []).filter(
    (name) => typeof name === "string",
  );
  for (const entryPoint of [
    "composites.js",
    "data-grid.js",
    "forms.js",
    "index.js",
    "overlays.js",
  ]) {
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
    /node_modules[\\/]react(?:-dom)?[\\/]/.test(name),
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

console.log(
  "Classic var and output-module ESM Module Federation fixtures passed with the published share map.",
);
