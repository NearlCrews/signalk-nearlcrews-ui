/**
 * The one Module Federation share definition used by both fixture remotes and
 * by scripts/check-host-contract.mjs.
 *
 * The current Signal K Admin loader guarantees only React and React DOM in its
 * Webpack-compatible fallback share scope. The broader
 * `@signalk/server-admin-ui-dependencies` peer list is compatibility inventory,
 * not a promise that every entry is available as a federation share.
 * `import: false` keeps a fallback implementation out of the remote, so React
 * and React DOM resolve from the host singleton or not at all.
 */
const { peerDependencies } = require("../../package.json");
const SIGNALK_HOST_SHARED_MODULES = Object.freeze(["react", "react-dom"]);

const FEDERATION_SHARED = Object.fromEntries(
  SIGNALK_HOST_SHARED_MODULES.map((name) => [
    name,
    {
      singleton: true,
      requiredVersion: peerDependencies[name],
      import: false,
    },
  ]),
);

module.exports = { FEDERATION_SHARED, SIGNALK_HOST_SHARED_MODULES };
