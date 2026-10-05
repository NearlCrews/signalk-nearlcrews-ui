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
import { symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { encodeRequiredVersion } from "../../../bin/lib/consumer-checks.mjs";
import { renderFederationEntry } from "../../../scripts/lib/federation-share.mjs";
import { repositoryPath } from "../../../scripts/lib/paths.mjs";
import { runNode } from "./run-node.mjs";
import { temporaryTree } from "./temporary-tree.mjs";

export const manifest = createRequire(import.meta.url)("../../../package.json");
const CLI = repositoryPath("bin", "snui-check-consumer.mjs");
/** Where every consumer workspace's built remote entry sits, from its root. */
export const REMOTE_ENTRY = "public/remoteEntry.js";
export const SHARED_NAMES = ["react", "react-dom"];
export const FEDERATION_REQUEST = "signalk-nearlcrews-ui/federation";

/** The module every fixture remote exposes, the one the Admin asks for. */
export const EXPOSED_MODULE = "./PluginConfigurationPanel";

/** React, react-dom, and what react-dom/server loads beside them. */
export const REACT_PACKAGES = ["react", "react-dom", "scheduler"];

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
const SHARE_REGISTRATIONS = `var l={${SHARED_NAMES.map((name, index) => {
  const share = shared[name];
  if (share === undefined)
    throw new Error(`The manifest no longer shares ${name}.`);
  return `${String(90 + index)}:()=>s("default","${name}",!1,${versionTuple(share.requiredVersion)})`;
}).join(",")}};`;

/**
 * The error text Webpack's container runtime builds, which is how the check
 * recognizes a Webpack remote entry.
 */
export const CONTAINER_RUNTIME =
  'var containerError="Container initialization failed as it has already been initialized with a different share scope";';

/** The module map a remote entry carries, keyed by the name the Admin asks for. */
const EXPOSES = `var exposes={"${EXPOSED_MODULE}":()=>Promise.resolve(()=>({}))};`;

/**
 * What every Webpack remote entry carries before its container: the share
 * registrations, the container runtime, and the exposed module map.
 */
export const ENTRY_PREAMBLE = [
  SHARE_REGISTRATIONS,
  CONTAINER_RUNTIME,
  EXPOSES,
].join("\n");

/**
 * A classic remote entry: the preamble, and the container assigned to the
 * global the Admin reads for a package named consumer-fixture.
 */
export const CLASSIC_ENTRY = `${ENTRY_PREAMBLE}
var consumer_fixture={get:function(){return Promise.reject(new Error("not loaded"))},init:function(){}};
`;

/** The same entry built as an ES module, which exports the container instead. */
export const MODULE_ENTRY = `${ENTRY_PREAMBLE}
const get=()=>Promise.reject(new Error("not loaded")),init=()=>{};export{get,init};
`;

/** The chunk the library lands in, carrying the PanelRoot version stamp. */
export const CHUNK = `jsx("div",{"data-snui-root":"","data-snui-version":"${STAMP}"});`;

/** The default built remote with `overrides` laid over it. */
export function remoteAssets(overrides = {}) {
  return {
    "main.chunk.js": CHUNK,
    "remoteEntry.js": CLASSIC_ENTRY,
    ...overrides,
  };
}

/**
 * The installed release's token sheet, cut down to the names the fixtures
 * reference: the real sheet declares every public token and nothing else.
 */
const TOKENS_CSS = `.snui-tokens {
  --snui-color-border: #7c8797;
  --snui-color-text-muted: #596273;
  --snui-space-2: 0.5rem;
}
`;

/** Removes every workspace created so far. Call from an afterAll hook. */
export { removeTemporaryTrees as removeConsumers } from "./temporary-tree.mjs";

/**
 * The keywords a plugin with a configuration panel carries: the plugin
 * keyword, and the one the Signal K server mounts a configuration panel by.
 */
const CONFIGURATOR_KEYWORDS = Object.freeze([
  "signalk-node-server-plugin",
  "signalk-plugin-configurator",
]);

/**
 * Writes one consumer workspace and returns its root. `assets` are the files of
 * the built remote, keyed by name; they default to a classic remote entry that
 * loads the way the Admin loads it and consumes the published share map, and a
 * chunk carrying the version stamp. `link` names packages to borrow from this
 * repository's own node_modules, as `npm ci` would have installed them beside
 * the consumer. `manifest` holds further consumer package.json fields, such as
 * `type`, merged over the defaults, and `pinField` names the dependency field
 * the exact pin sits in. `files` are further files to write, keyed by their
 * path from the root.
 */
export function createConsumer({
  assets = remoteAssets(),
  baseline,
  config,
  configName = "webpack.config.cjs",
  files = {},
  link = [],
  manifest: manifestFields = {},
  name = "consumer-fixture",
  pinField = "devDependencies",
} = {}) {
  const installed = `node_modules/${manifest.name}`;
  const tree = {
    [`${installed}/package.json`]: JSON.stringify(manifest),
    [`${installed}/dist/federation.cjs`]: FEDERATION_ENTRY,
    [`${installed}/dist/tokens.css`]: TOKENS_CSS,
    "package.json": JSON.stringify({
      name,
      private: true,
      keywords: CONFIGURATOR_KEYWORDS,
      [pinField]: { [manifest.name]: manifest.version },
      ...manifestFields,
    }),
  };
  for (const [assetName, source] of Object.entries(assets)) {
    tree[`${dirname(REMOTE_ENTRY)}/${assetName}`] = source;
  }
  if (config !== undefined) tree[configName] = config;
  if (baseline !== undefined) {
    tree["size-baseline.json"] = JSON.stringify(baseline);
  }
  const root = temporaryTree("snui-consumer-", { ...tree, ...files });
  for (const packageName of link) {
    symlinkSync(
      repositoryPath("node_modules", packageName),
      join(root, "node_modules", packageName),
      "junction",
    );
  }
  return root;
}

export function runCli(...args) {
  return runNode(CLI, ...args);
}

/** Runs the check against a workspace's built remote, with any further options. */
export function checkConsumer(root, ...args) {
  return runCli("--root", root, "--remote", REMOTE_ENTRY, ...args);
}

/** Runs the check with the render of the exposed module, and any further options. */
export function runRuntimeCli(root, ...args) {
  return checkConsumer(root, "--runtime", "--expose", EXPOSED_MODULE, ...args);
}
