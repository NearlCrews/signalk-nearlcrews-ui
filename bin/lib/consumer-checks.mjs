/**
 * The checks behind `snui-check-consumer`, kept free of side effects so the
 * repository's own federation and bundle checks can share them and the unit
 * tests can drive them with small fixtures.
 */
import { gzipSync } from "node:zlib";

import { formatCount } from "./cli-arguments.mjs";

/** The package whose installed release every check measures the consumer against. */
export const PACKAGE_NAME = "signalk-nearlcrews-ui";

/**
 * A bare version: three numeric parts, at most one prerelease suffix, and at
 * most one build suffix, with no range operator. The release policy publishes
 * prereleases under the `next` dist-tag, so a consumer trying one still pins
 * exactly. The two suffixes are matched once each so the pattern cannot
 * backtrack across a run of hyphens.
 */
const EXACT_VERSION =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Substrings that appear only when a React runtime was bundled. The internals
 * marker is the load-bearing one: it survives minification and comment
 * extraction, so it is what catches a bundled React 19. The two filenames come
 * from React's own license banners, which a build that keeps comments inline
 * still carries, and they are the React 19 spellings.
 */
export const REACT_RUNTIME_MARKERS = Object.freeze([
  "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
  "react.production.js",
  "react-dom-client.production.js",
]);

/** The attribute every PanelRoot stamps with the package version it renders. */
export const VERSION_STAMP_ATTRIBUTE = "data-snui-version";

const VERSION_STAMP_PATTERNS = [
  // JSX prop literal after minification: "data-snui-version":"0.9.0"
  /"data-snui-version"\s*:\s*"(?<version>\d+\.\d+\.\d+[\w.+-]*)"/g,
  // Attribute comparison: "0.9.0"===node.getAttribute("data-snui-version")
  /"(?<version>\d+\.\d+\.\d+[\w.+-]*)"\s*===?\s*\w+\.getAttribute\("data-snui-version"\)/g,
  // Attribute selector in a style string: [data-snui-version="0.9.0"]. The
  // quote is captured and backreferenced because a minifier may rewrite the
  // style string with single quotes, escaped or not.
  /\[data-snui-version=(?<quote>\\?["'])(?<version>\d+\.\d+\.\d+[\w.+-]*)\k<quote>\]/g,
];

function assertExactVersion(version, source) {
  if (typeof version !== "string" || !EXACT_VERSION.test(version)) {
    throw new Error(
      `${PACKAGE_NAME} in ${source} must be pinned to an exact version such as 0.9.0, got ${String(version)}. A prerelease such as 0.11.0-rc.1 is exact too; a range is not. The package ships breaking changes in minor releases, so a range would let an unreviewed upgrade reach the panel.`,
    );
  }
  return version;
}

/**
 * The dependency fields npm installs when it installs the consumer itself.
 * The App Store runs npm without `--legacy-peer-deps`, so npm 7 and later
 * install a required peer dependency too.
 */
const RUNTIME_DEPENDENCY_FIELDS = Object.freeze([
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]);

/**
 * Whether `field` of the manifest makes npm install the package on the
 * server. A peer dependency marked optional in `peerDependenciesMeta` is not
 * installed.
 */
function installsAtRuntime(consumerManifest, field) {
  if (consumerManifest[field]?.[PACKAGE_NAME] === undefined) return false;
  return (
    field !== "peerDependencies" ||
    consumerManifest.peerDependenciesMeta?.[PACKAGE_NAME]?.optional !== true
  );
}

/** The runtime dependency field that declares the package, if any. */
export function runtimeDependencyFieldOf(consumerManifest) {
  return RUNTIME_DEPENDENCY_FIELDS.find((field) =>
    installsAtRuntime(consumerManifest, field),
  );
}

/**
 * What a runtime placement costs, said where the check refuses one and where
 * `--runtime-dependency` accepts one.
 */
export const RUNTIME_DEPENDENCY_COST = `every App Store install fetches ${PACKAGE_NAME}, React Aria, and, because npm installs peer dependencies, React and React DOM into the Signal K server's node_modules`;

/**
 * Asserts the consumer pins an exact version and the installed package is that
 * version. Returns the version.
 *
 * The pin belongs in devDependencies: the panel remote bundles the package, so
 * nothing on the server needs it at run time. `allowRuntimeDependency` accepts
 * a runtime placement for a plugin whose server code imports the package
 * itself, such as `signalk-nearlcrews-ui/format`. Every field that declares
 * the package must then pin the same exact version, because the remote
 * bundles the development pin and the server installs the runtime one.
 */
export function assertExactPin(
  consumerManifest,
  installedManifest,
  { allowRuntimeDependency = false } = {},
) {
  const runtimeFields = RUNTIME_DEPENDENCY_FIELDS.filter((field) =>
    installsAtRuntime(consumerManifest, field),
  );
  if (runtimeFields.length > 0 && !allowRuntimeDependency) {
    throw new Error(
      `package.json declares ${PACKAGE_NAME} in ${runtimeFields[0]}. The panel remote bundles it, so it belongs in devDependencies: a runtime entry means ${RUNTIME_DEPENDENCY_COST}. Pass --runtime-dependency only when the plugin's server code imports the package itself.`,
    );
  }
  const pins = ["devDependencies", ...runtimeFields]
    .filter((field) => consumerManifest[field]?.[PACKAGE_NAME] !== undefined)
    .map((field) => ({
      field,
      version: consumerManifest[field][PACKAGE_NAME],
    }));
  if (pins.length === 0) {
    throw new Error(
      `package.json does not declare ${PACKAGE_NAME} in devDependencies.`,
    );
  }
  for (const { field, version } of pins) {
    assertExactVersion(version, `package.json ${field}`);
  }
  const [first, ...others] = pins;
  const differing = others.find(({ version }) => version !== first.version);
  if (differing !== undefined) {
    throw new Error(
      `package.json declares ${PACKAGE_NAME} ${first.version} in ${first.field} and ${differing.version} in ${differing.field}. The remote bundles one version and the server installs the other; pin both to the same exact version.`,
    );
  }
  const pinned = first.version;
  const installed = installedManifest?.version;
  if (installed !== pinned) {
    throw new Error(
      `package.json pins ${PACKAGE_NAME} ${pinned}, but node_modules/${PACKAGE_NAME} is ${String(installed)}. Run npm ci or update the pin.`,
    );
  }
  return pinned;
}

/** Versions stamped next to the version attribute in a built bundle. */
export function findVersionStamps(source) {
  const versions = new Set();
  for (const pattern of VERSION_STAMP_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      versions.add(match.groups.version);
    }
  }
  return versions;
}

/**
 * Asserts the built remote carries the version stamp of exactly the installed
 * package. `sources` are the JavaScript files of the remote; the library lands
 * in a chunk rather than in remoteEntry.js itself.
 */
export function assertVersionStamp(sources, expectedVersion) {
  const combined = sources.join("\n");
  if (!combined.includes(VERSION_STAMP_ATTRIBUTE)) {
    throw new Error(
      `The built remote does not contain ${VERSION_STAMP_ATTRIBUTE}, so it did not bundle ${PACKAGE_NAME}.`,
    );
  }
  const stamps = findVersionStamps(combined);
  if (stamps.size === 0) {
    // The minifier kept the version in a shared constant; the literal must
    // still be present in a file that also carries the attribute.
    const stamped = sources.some(
      (source) =>
        source.includes(VERSION_STAMP_ATTRIBUTE) &&
        (source.includes(`"${expectedVersion}"`) ||
          source.includes(`'${expectedVersion}'`)),
    );
    if (!stamped) {
      throw new Error(
        `The built remote carries ${VERSION_STAMP_ATTRIBUTE} but no "${expectedVersion}" literal beside it; the bundled library is not the installed version.`,
      );
    }
    return;
  }
  assertOnlyVersionStamp(stamps, expectedVersion, "The built remote");
}

/**
 * Asserts a non-empty set of found stamps holds the expected version and no
 * other. `subject` names what carries them, for the message.
 */
export function assertOnlyVersionStamp(stamps, expectedVersion, subject) {
  if ([...stamps].some((stamp) => stamp !== expectedVersion)) {
    throw new Error(
      `${subject} stamps ${VERSION_STAMP_ATTRIBUTE} with ${[...stamps].join(", ")}; expected exactly ${expectedVersion}.`,
    );
  }
}

/** Substrings that appear only when the development JSX runtime was bundled. */
export const DEVELOPMENT_JSX_MARKERS = Object.freeze([
  "jsxDEV",
  "jsx-dev-runtime",
]);

/**
 * Asserts the remote was built against the production JSX runtime. `files` are
 * the JavaScript files of the remote as name and source pairs, so the message
 * names the one that carries the development runtime.
 */
export function assertProductionJsxRuntime(files, label = "The built remote") {
  for (const { name, source } of files) {
    const marker = firstMarkerIn(source, DEVELOPMENT_JSX_MARKERS);
    if (marker !== undefined) {
      throw new Error(
        `${label} uses the React development JSX runtime: ${name} contains ${marker}. Build the panel with the automatic runtime in production mode.`,
      );
    }
  }
}

/**
 * The string every export of `signalk-nearlcrews-ui/host-harness` carries,
 * which the harness sets as an attribute on what it renders and injects.
 * `src/host-harness/marker.ts` defines the same value; a unit test holds the
 * two together.
 */
export const HOST_HARNESS_MARKER = "data-snui-host-harness";

/**
 * Asserts the remote bundled nothing from the host harness, the browser test
 * tooling that stands in for the Admin loader. It belongs in a consumer's test
 * fixture and never in the panel the Admin loads.
 */
export function assertNoHostHarness(files, label = "The built remote") {
  for (const { name, source } of files) {
    if (source.includes(HOST_HARNESS_MARKER)) {
      throw new Error(
        `${label} bundled ${PACKAGE_NAME}/host-harness: ${name} contains ${HOST_HARNESS_MARKER}. The harness stands in for the Signal K Admin loader in a browser test fixture; import it from the fixture, never from the panel.`,
      );
    }
  }
}

/** Asserts no React runtime was bundled into the remote. */
export function assertNoReactRuntime(source, label = "The built remote") {
  const marker = firstMarkerIn(source, REACT_RUNTIME_MARKERS);
  if (marker !== undefined) {
    throw new Error(`${label} bundled a React runtime marker: ${marker}.`);
  }
}

/** The first of `markers`, in list order, that `source` contains. */
function firstMarkerIn(source, markers) {
  return markers.find((marker) => source.includes(marker));
}

/**
 * Encodes a semver range the way Webpack writes it into a remote entry. Uses
 * Webpack's own encoder when the consumer has Webpack installed; otherwise it
 * understands the caret ranges this package publishes.
 */
export function encodeRequiredVersion(range, parseRange) {
  if (typeof parseRange === "function") {
    return JSON.stringify(parseRange(range));
  }
  const caret = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (caret === null) {
    throw new Error(
      `Cannot encode requiredVersion ${range} without Webpack; only caret ranges such as ^19.2.0 are understood.`,
    );
  }
  return JSON.stringify([1, ...caret.slice(1).map(Number)]);
}

/**
 * Reads the shares a built remote entry consumes from the default share scope
 * as a map from module name to the encoded required version.
 */
export function findConsumedShares(remoteEntrySource) {
  const consumed = new Map();
  const pattern =
    /\(\s*"default"\s*,\s*"([^"]+)"\s*,\s*(?:!0|!1|true|false)\s*,\s*(\[[\d,\s]*\])/g;
  for (const match of remoteEntrySource.matchAll(pattern)) {
    consumed.set(match[1], match[2].replaceAll(/\s+/g, ""));
  }
  return consumed;
}

/** Asserts the remote consumes exactly the published share map. */
export function assertConsumedShares(remoteEntrySource, shared, parseRange) {
  const consumed = findConsumedShares(remoteEntrySource);
  const expectedNames = Object.keys(shared).sort();
  const consumedNames = [...consumed.keys()].sort();
  if (consumedNames.join() !== expectedNames.join()) {
    throw new Error(
      `The built remote consumes host shares ${consumedNames.join(", ") || "(none)"}; the published share map is ${expectedNames.join(", ")}.`,
    );
  }
  for (const name of expectedNames) {
    const expected = encodeRequiredVersion(
      shared[name].requiredVersion,
      parseRange,
    );
    if (consumed.get(name) !== expected) {
      throw new Error(
        `The built remote requires ${name} as ${consumed.get(name)}; the published share map requires ${shared[name].requiredVersion} (${expected}).`,
      );
    }
  }
}

/** Asserts a Webpack config's shared option equals the published share map. */
export function assertConfiguredShares(configuredShared, shared) {
  if (configuredShared === null || typeof configuredShared !== "object") {
    throw new Error(
      "The Webpack configuration has no ModuleFederationPlugin shared option.",
    );
  }
  // Webpack also accepts an array of module names. Object.keys would read that
  // as the shares 0 and 1, so the mismatch below would blame the names.
  if (Array.isArray(configuredShared)) {
    throw new Error(
      "The Webpack configuration gives ModuleFederationPlugin an array shared option, which cannot carry the singleton and requiredVersion settings this package needs. Spread `shared` from signalk-nearlcrews-ui/federation instead.",
    );
  }
  const expectedNames = Object.keys(shared).sort();
  const configuredNames = Object.keys(configuredShared).sort();
  if (configuredNames.join() !== expectedNames.join()) {
    throw new Error(
      `The Webpack configuration shares ${configuredNames.join(", ") || "(none)"}; the published share map is ${expectedNames.join(", ")}.`,
    );
  }
  for (const name of expectedNames) {
    const configured = configuredShared[name];
    const expected = shared[name];
    if (
      configured?.singleton !== expected.singleton ||
      configured.requiredVersion !== expected.requiredVersion ||
      configured.import !== expected.import ||
      configured.strictVersion !== undefined
    ) {
      throw new Error(
        `The Webpack configuration shares ${name} as ${JSON.stringify(configured)}; the published share map is ${JSON.stringify(expected)}. Spread \`shared\` from signalk-nearlcrews-ui/federation instead of copying it.`,
      );
    }
  }
}

export function gzipBytesOf(buffers) {
  return buffers.reduce(
    (total, buffer) => total + gzipSync(buffer, { level: 9 }).byteLength,
    0,
  );
}

/**
 * The growth over the baseline as a percentage, at the shortest precision that
 * still reads as more than the allowance. A build one byte over a 5% limit is
 * 5.01% above the baseline, and rounding that to 5.0% would print a sentence
 * that contradicts the limit it just failed.
 */
function growthPercent(gzipBytes, baseline) {
  const increase =
    ((gzipBytes - baseline.gzipBytes) / baseline.gzipBytes) * 100;
  for (const digits of [1, 2, 3]) {
    const text = increase.toFixed(digits);
    if (Number(text) > baseline.maximumIncreasePercent) return text;
  }
  return increase.toFixed(4);
}

/**
 * Applies a size baseline: the remote may grow by `maximumIncreasePercent`
 * over the recorded `gzipBytes`, and beyond that only up to an explicitly
 * approved `approvedCeilingGzipBytes`. Returns a summary sentence.
 */
export function assertSizeBaseline(gzipBytes, baseline) {
  if (
    !Number.isInteger(baseline?.gzipBytes) ||
    !Number.isFinite(baseline.maximumIncreasePercent)
  ) {
    throw new Error(
      "The size baseline needs integer gzipBytes and a numeric maximumIncreasePercent.",
    );
  }
  const limit = Math.floor(
    baseline.gzipBytes * (1 + baseline.maximumIncreasePercent / 100),
  );
  if (gzipBytes <= limit) {
    // A remote that shrank keeps the old, larger allowance, which would let a
    // later regression back up to it pass as within the baseline.
    const floor = Math.ceil(
      baseline.gzipBytes * (1 - baseline.maximumIncreasePercent / 100),
    );
    const stale =
      gzipBytes < floor
        ? `, and ${formatCount(baseline.gzipBytes - gzipBytes, "byte")} below it: record ${gzipBytes} so the allowance is measured from the current build`
        : "";
    return `${gzipBytes} gzip bytes, within ${baseline.maximumIncreasePercent}% of the ${baseline.gzipBytes}-byte baseline${stale}`;
  }
  const increase = growthPercent(gzipBytes, baseline);
  const ceiling = baseline.approvedCeilingGzipBytes;
  if (!Number.isInteger(ceiling)) {
    throw new Error(
      `The remote is ${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and over the ${baseline.maximumIncreasePercent}% limit, with no approved ceiling. The limit is ${formatCount(limit, "byte")}, so the remote is ${formatCount(gzipBytes - limit, "byte")} over it.`,
    );
  }
  if (gzipBytes > ceiling) {
    throw new Error(
      `The remote is ${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and over the approved ${ceiling}-byte ceiling.`,
    );
  }
  return `${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and within the approved ${ceiling}-byte ceiling`;
}
