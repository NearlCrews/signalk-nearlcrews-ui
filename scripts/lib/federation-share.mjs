/**
 * The one Module Federation share definition for this package.
 *
 * Consumers read it as `signalk-nearlcrews-ui/federation`, a CommonJS entry
 * that scripts/build-federation-entry.mjs renders into dist from this module
 * at build time. The fixture remotes and the repository checks read the same
 * definition, so the share map a consumer copies into its Webpack config, the
 * map the fixtures build with, and the map the host contract is checked
 * against cannot drift apart.
 *
 * The current Signal K Admin loader guarantees only React and React DOM in its
 * Webpack-compatible fallback share scope. The broader
 * `@signalk/server-admin-ui-dependencies` peer list is compatibility inventory,
 * not a promise that every entry is available as a federation share.
 * `import: false` keeps a fallback implementation out of the remote, so React
 * and React DOM resolve from the host singleton or not at all.
 */

export const SIGNALK_HOST_SHARED_MODULES = Object.freeze([
  "react",
  "react-dom",
]);

export const HOST_NOTES =
  "Signal K Admin releases up to at least 2.24.0 register their React share as 19.0.0 while shipping a newer React; current master registers React.version. A strictVersion check would therefore refuse to mount on a compatible host, so every share here is a non-strict singleton and requiredVersion documents the floor this package needs rather than enforcing it against the host's registration. import: false keeps a fallback React out of the remote, so a host that provides no share fails loudly instead of running two React copies.";

export function createFederationShared(peerDependencies) {
  return Object.freeze(
    Object.fromEntries(
      SIGNALK_HOST_SHARED_MODULES.map((name) => {
        const requiredVersion = peerDependencies?.[name];
        if (
          typeof requiredVersion !== "string" ||
          requiredVersion.length === 0
        ) {
          throw new Error(
            `package.json peerDependencies must declare ${name} to build the federation share map.`,
          );
        }
        return [
          name,
          Object.freeze({ singleton: true, requiredVersion, import: false }),
        ];
      }),
    ),
  );
}

/** Renders the CommonJS entry and its declaration file. */
export function renderFederationEntry(peerDependencies, packageVersion) {
  const shared = createFederationShared(peerDependencies);
  const serialized = JSON.stringify(shared, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");

  const cjs = `"use strict";
/**
 * Module Federation share map for signalk-nearlcrews-ui ${packageVersion}.
 * Generated from package.json at build time. Do not edit.
 *
 * Usage in a consumer's webpack.config.cjs:
 *   const { shared } = require("signalk-nearlcrews-ui/federation");
 *   new ModuleFederationPlugin({ shared, ... });
 */
const SIGNALK_HOST_SHARED_MODULES = Object.freeze(${JSON.stringify([...SIGNALK_HOST_SHARED_MODULES])});
const shared = Object.freeze(
  ${serialized},
);
const hostNotes = ${JSON.stringify(HOST_NOTES)};

module.exports = { SIGNALK_HOST_SHARED_MODULES, hostNotes, shared };
`;

  const dts = `/**
 * Module Federation share map for signalk-nearlcrews-ui ${packageVersion}.
 * Generated from package.json at build time. Do not edit.
 */
export type SignalKHostSharedModule = ${SIGNALK_HOST_SHARED_MODULES.map(
    (name) => JSON.stringify(name),
  ).join(" | ")};

export interface FederationShare {
  readonly singleton: true;
  /** This package's React peer range; the floor the host must satisfy. */
  readonly requiredVersion: string;
  /** No fallback copy is bundled; the host singleton is the only source. */
  readonly import: false;
}

/** The modules the Signal K Admin loader guarantees in its share scope. */
export declare const SIGNALK_HOST_SHARED_MODULES: readonly SignalKHostSharedModule[];

/** Spread into a ModuleFederationPlugin \`shared\` option. */
export declare const shared: Readonly<Record<SignalKHostSharedModule, FederationShare>>;

/** Why the shares are non-strict singletons. */
export declare const hostNotes: string;
`;

  return { cjs, dts, shared };
}
