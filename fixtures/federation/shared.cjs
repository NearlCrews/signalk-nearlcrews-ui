/**
 * The one Module Federation share definition used by both fixture remotes and
 * by scripts/check-host-contract.mjs.
 *
 * Every entry must name a module the Signal K Admin host declares in
 * `@signalk/server-admin-ui-dependencies`, because a remote can only resolve a
 * share the host actually provides. `import: false` keeps a fallback
 * implementation out of the remote, so React and React DOM resolve from the
 * host singleton or not at all.
 */
const { peerDependencies } = require("../../package.json");

const FEDERATION_SHARED = Object.fromEntries(
  ["react", "react-dom"].map((name) => [
    name,
    {
      singleton: true,
      requiredVersion: peerDependencies[name],
      import: false,
    },
  ]),
);

module.exports = { FEDERATION_SHARED };
