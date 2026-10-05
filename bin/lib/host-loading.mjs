/**
 * The Signal K Admin loading contract, checked against a consumer's package
 * and its built remote entry without a browser.
 *
 * The server writes one `<script src="/<package>/remoteEntry.js">` into the
 * Admin page for every package whose keywords include
 * `signalk-plugin-configurator`, serving `/<package>/` from the package's
 * `public/` directory. The tag is `type="module"` when the package.json `type`
 * is `"module"` and classic otherwise. The Admin loader then imports a module
 * remote and reads `get` and `init` from its exports, or reads a classic
 * remote's container from `window[<safe name>]`, and asks it for
 * `./PluginConfigurationPanel`. Each mistake below passes every other gate
 * and then shows the operator "Module ... is not available. Make sure the
 * webapp is installed." in place of the panel.
 *
 * Read from signalk-server at 756b555d (2.33.0): src/serverroutes.ts, the
 * `%ADDONSCRIPTS%` replacement; src/interfaces/webapps.ts, `mountWebModules`;
 * and packages/server-admin-ui/src/views/Webapps/dynamicutilities.ts,
 * `toLazyDynamicComponent` and `toSafeModuleId`.
 */
import { join, relative, resolve } from "node:path";

import { joinNames } from "./cli-arguments.mjs";
import { VERSION_STAMP_ATTRIBUTE } from "./consumer-checks.mjs";
import { escapeRegExp } from "./regexp.mjs";

/** The keyword that makes the server mount a package's configuration panel. */
const CONFIGURATOR_KEYWORD = "signalk-plugin-configurator";

/** The module the Admin asks a configurator's container for. */
export const PLUGIN_CONFIG_PANEL = "./PluginConfigurationPanel";

/** The file name the Admin finds a remote's script tag by. */
export const REMOTE_ENTRY_NAME = "remoteEntry.js";

/**
 * Text only Webpack's Module Federation container runtime carries: the error
 * its `init` throws for a second, different share scope. It survives
 * minification because it is a string the runtime builds its message from.
 */
const WEBPACK_CONTAINER_MARKER =
  "has already been initialized with a different share scope";

/**
 * The global the Admin reads a classic container from: the package name with
 * `-`, `@`, and `/` replaced by underscores, as the loader's `toSafeModuleId`
 * builds it.
 */
export function toSafeModuleId(packageName) {
  return packageName.replaceAll(/[-@/]/g, "_");
}

/** Which script tag the server writes for the package: "module" or "classic". */
export function remoteFormatOf(manifest) {
  return manifest?.type === "module" ? "module" : "classic";
}

/** Asserts the package carries the keyword the server mounts panels by. */
export function assertConfiguratorKeyword(manifest) {
  const keywords = Array.isArray(manifest?.keywords) ? manifest.keywords : [];
  if (!keywords.includes(CONFIGURATOR_KEYWORD)) {
    throw new Error(
      `package.json keywords do not include ${CONFIGURATOR_KEYWORD}. The Signal K server mounts a configuration panel only for a package that carries it: without it the server serves no /<package>/ route and writes no remoteEntry.js tag, and the Admin shows its own schema form instead of the panel.`,
    );
  }
}

/**
 * Asserts the remote entry sits where the server serves it from: a file named
 * remoteEntry.js directly inside the package's public/ directory.
 */
export function assertRemoteLocation(root, remoteEntry) {
  const expected = join(resolve(root), "public", REMOTE_ENTRY_NAME);
  if (resolve(remoteEntry) !== expected) {
    throw new Error(
      `--remote points at ${relative(resolve(root), resolve(remoteEntry)) || "."}, but the Signal K server serves /<package>/ from the package's public/ directory and the Admin finds a panel only through a script ending in /${REMOTE_ENTRY_NAME}. Build the remote to public/${REMOTE_ENTRY_NAME}.`,
    );
  }
}

/**
 * Asserts the entry was built by Webpack's Module Federation plugin, which is
 * what every check after this one reads. A Vite or other module remote on the
 * Admin's React globals is a supported integration this command does not
 * check, and without this sentence it would fail as a share map mismatch.
 */
export function assertWebpackContainer(entrySource, entryName) {
  if (!entrySource.includes(WEBPACK_CONTAINER_MARKER)) {
    throw new Error(
      `${entryName} carries no Webpack Module Federation container runtime. snui-check-consumer checks remotes built with Webpack's ModuleFederationPlugin; a Vite or other module remote on the Signal K Admin React globals is supported by the package but not by this command.`,
    );
  }
}

/** The names an ES module exports, by export clause or exported declaration. */
export function findModuleExports(source) {
  const names = new Set();
  for (const match of source.matchAll(/(?:^|[\s;})])export\s*\{([^}]*)\}/g)) {
    for (const specifier of match[1].split(",")) {
      const [local, exported = local] = specifier.trim().split(/\s+as\s+/);
      const name = exported?.trim().replaceAll(/^["']|["']$/g, "");
      if (name) names.add(name);
    }
  }
  for (const match of source.matchAll(
    /(?:^|[\s;})])export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([\w$]+)/g,
  )) {
    names.add(match[1]);
  }
  return names;
}

/**
 * Asserts a module remote exports what the Admin reads off its namespace. A
 * package whose type is "module" gets a module script tag, and the loader
 * takes the container only when both `get` and `init` are functions on it.
 */
export function assertModuleContainer(entrySource, entryName) {
  const exported = findModuleExports(entrySource);
  const missing = ["get", "init"].filter((name) => !exported.has(name));
  if (missing.length === 0) return;
  const found =
    exported.size === 0
      ? "exports nothing"
      : `exports ${[...exported].join(", ")} but not ${joinNames(missing, "or")}`;
  throw new Error(
    `package.json sets "type": "module", so the Signal K server writes a <script type="module"> tag for ${entryName} and the Admin imports it and reads get and init from its exports. This ${entryName} ${found}, so the Admin logs "Could not load module" and shows "Module ... is not available". Build the remote with a library type of "module", or give the package another type if its server code allows.`,
  );
}

/** Asserts the entry exposes the module the Admin asks a configurator for. */
export function assertExposesPanel(entrySource, entryName) {
  const key = new RegExp(`(["'])${escapeRegExp(PLUGIN_CONFIG_PANEL)}\\1\\s*:`);
  if (!key.test(entrySource)) {
    throw new Error(
      `${entryName} exposes no ${PLUGIN_CONFIG_PANEL} module. The Signal K Admin asks every configurator's container for exactly that name, so expose the panel under it.`,
    );
  }
}

/**
 * Asserts the library stayed out of the remote entry. The server writes every
 * configurator's entry into the head of every Admin page, whether or not its
 * panel ever opens, so what the entry carries loads for every Admin user.
 */
export function assertEntryCarriesNoLibrary(entrySource, entryName) {
  if (entrySource.includes(VERSION_STAMP_ATTRIBUTE)) {
    throw new Error(
      `${entryName} carries the ${VERSION_STAMP_ATTRIBUTE} stamp, so the library is inside the remote entry itself. The Signal K server writes every configurator's ${entryName} into the head of every Admin page whether or not its panel opens, so the whole panel would load on every page for every user. Keep the exposed module in its own chunk: no eager share and no disabled chunk splitting.`,
    );
  }
}
