/**
 * A consumer directory as `npm ci` leaves one, shared by the checks that drive
 * `snui-check-consumer` end to end: the published manifest and federation entry
 * under node_modules, an exact pin beside them, and a built remote to check.
 *
 * The names and paths written into the generated source below are literals
 * rather than values read from the manifest, because a fixture that assembles
 * JavaScript should not assemble it out of anything it has not fixed itself. A
 * test asserts the manifest still shares exactly these, so the two cannot drift
 * apart quietly.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

import { encodeRequiredVersion } from "../../../bin/lib/consumer-checks.mjs";
import { renderFederationEntry } from "../../../scripts/lib/federation-share.mjs";
import { repositoryPath } from "../../../scripts/lib/paths.mjs";

export const manifest = createRequire(import.meta.url)("../../../package.json");
const CLI = repositoryPath("bin", "snui-check-consumer.mjs");
export const SHARED_NAMES = ["react", "react-dom"];
export const FEDERATION_REQUEST = "signalk-nearlcrews-ui/federation";

/** The version stamp PanelRoot writes, as digits and dots or nothing. */
export const STAMP = /^\d+\.\d+\.\d+$/.test(manifest.version)
  ? manifest.version
  : "0.0.0";

const { cjs: FEDERATION_ENTRY, shared } = renderFederationEntry(
  manifest.peerDependencies,
  manifest.version,
);

export { shared };

/**
 * The version tuple Webpack encodes a range into, rebuilt from its numbers so
 * only numbers reach the generated source.
 */
function versionTuple(range) {
  const parsed = JSON.parse(encodeRequiredVersion(range));
  if (!Array.isArray(parsed) || parsed.some((part) => !Number.isFinite(part))) {
    throw new Error(`Unexpected requiredVersion encoding for ${range}.`);
  }
  return `[${parsed.map(Number).join(",")}]`;
}

/** The share registrations Webpack 5 minifies into a remote entry. */
export const SHARE_REGISTRATIONS = `var l={${SHARED_NAMES.map((name, index) => {
  const share = shared[name];
  if (share === undefined)
    throw new Error(`The manifest no longer shares ${name}.`);
  return `${String(90 + index)}:()=>s("default","${name}",!1,${versionTuple(share.requiredVersion)})`;
}).join(",")}};`;

/** The chunk the library lands in, carrying the PanelRoot version stamp. */
export const CHUNK = `jsx("div",{"data-snui-root":"","data-snui-version":"${STAMP}"});`;

const workspaces = [];

/** Removes every workspace created so far. Call from an afterAll hook. */
export function removeConsumers() {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true });
  }
}

/**
 * Writes one consumer workspace and returns its root. `assets` are the files of
 * the built remote, keyed by name; they default to a remote entry that consumes
 * the published share map and a chunk carrying the version stamp. `link` names
 * packages to borrow from this repository's own node_modules, as `npm ci` would
 * have installed them beside the consumer.
 */
export function createConsumer({
  assets = { "main.chunk.js": CHUNK, "remoteEntry.js": SHARE_REGISTRATIONS },
  baseline,
  config,
  configName = "webpack.config.cjs",
  link = [],
  name = "consumer-fixture",
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "snui-consumer-"));
  workspaces.push(root);

  const installed = join(root, "node_modules", manifest.name);
  mkdirSync(join(installed, "dist"), { recursive: true });
  writeFileSync(join(installed, "package.json"), JSON.stringify(manifest));
  writeFileSync(join(installed, "dist", "federation.cjs"), FEDERATION_ENTRY);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name,
      private: true,
      devDependencies: { [manifest.name]: manifest.version },
    }),
  );

  const remoteDirectory = join(root, "public");
  mkdirSync(remoteDirectory);
  for (const [assetName, source] of Object.entries(assets)) {
    writeFileSync(join(remoteDirectory, assetName), source);
  }

  if (config !== undefined) {
    const configPath = join(root, configName);
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, config);
  }
  for (const packageName of link) {
    symlinkSync(
      repositoryPath("node_modules", packageName),
      join(root, "node_modules", packageName),
      "junction",
    );
  }
  if (baseline !== undefined) {
    writeFileSync(join(root, "size-baseline.json"), JSON.stringify(baseline));
  }
  return root;
}

export function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}
