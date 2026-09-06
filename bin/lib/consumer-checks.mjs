/**
 * The checks behind `snui-check-consumer`, kept free of side effects so the
 * repository's own federation and bundle checks can share them and the unit
 * tests can drive them with small fixtures.
 */
import { gzipSync } from "node:zlib";

/** A bare version: three numeric parts, no range operator or suffix. */
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

/** Substrings that appear only when a React runtime was bundled. */
export const REACT_RUNTIME_MARKERS = Object.freeze([
  "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
  "react.production.min",
  "react-dom.production.min",
]);

/** The attribute every PanelRoot stamps with the package version it renders. */
export const VERSION_STAMP_ATTRIBUTE = "data-snui-version";

const VERSION_STAMP_PATTERNS = [
  // JSX prop literal after minification: "data-snui-version":"0.9.0"
  /"data-snui-version"\s*:\s*"(\d+\.\d+\.\d+)"/g,
  // Attribute comparison: "0.9.0"===node.getAttribute("data-snui-version")
  /"(\d+\.\d+\.\d+)"\s*===?\s*\w+\.getAttribute\("data-snui-version"\)/g,
  // Attribute selector in a style string: [data-snui-version="0.9.0"]
  /\[data-snui-version=\\?"(\d+\.\d+\.\d+)\\?"\]/g,
];

export function assertExactVersion(version, source) {
  if (typeof version !== "string" || !EXACT_VERSION.test(version)) {
    throw new Error(
      `signalk-nearlcrews-ui in ${source} must be pinned to an exact version such as 0.9.0, got ${String(version)}. The package ships breaking changes in minor releases, so a range would let an unreviewed upgrade reach the panel.`,
    );
  }
  return version;
}

/**
 * Asserts the consumer pins an exact version and the installed package is that
 * version. Returns the version.
 */
export function assertExactPin(consumerManifest, installedManifest) {
  const pinned =
    consumerManifest.devDependencies?.["signalk-nearlcrews-ui"] ??
    consumerManifest.dependencies?.["signalk-nearlcrews-ui"];
  if (pinned === undefined) {
    throw new Error(
      "package.json does not declare signalk-nearlcrews-ui in devDependencies or dependencies.",
    );
  }
  assertExactVersion(pinned, "package.json");
  const installed = installedManifest?.version;
  if (installed !== pinned) {
    throw new Error(
      `package.json pins signalk-nearlcrews-ui ${pinned}, but node_modules/signalk-nearlcrews-ui is ${String(installed)}. Run npm ci or update the pin.`,
    );
  }
  return pinned;
}

/** Versions stamped next to the version attribute in a built bundle. */
export function findVersionStamps(source) {
  const versions = new Set();
  for (const pattern of VERSION_STAMP_PATTERNS) {
    for (const match of source.matchAll(pattern)) versions.add(match[1]);
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
      `The built remote does not contain ${VERSION_STAMP_ATTRIBUTE}, so it did not bundle signalk-nearlcrews-ui.`,
    );
  }
  const stamps = findVersionStamps(combined);
  if (stamps.size === 0) {
    // The minifier kept the version in a shared constant; the literal must
    // still be present in a file that also carries the attribute.
    const stamped = sources.some(
      (source) =>
        source.includes(VERSION_STAMP_ATTRIBUTE) &&
        source.includes(`"${expectedVersion}"`),
    );
    if (!stamped) {
      throw new Error(
        `The built remote carries ${VERSION_STAMP_ATTRIBUTE} but no "${expectedVersion}" literal beside it; the bundled library is not the installed version.`,
      );
    }
    return;
  }
  const unexpected = [...stamps].filter((stamp) => stamp !== expectedVersion);
  if (unexpected.length > 0 || !stamps.has(expectedVersion)) {
    throw new Error(
      `The built remote stamps ${VERSION_STAMP_ATTRIBUTE} with ${[...stamps].join(", ")}; expected exactly ${expectedVersion}.`,
    );
  }
}

/** Asserts no React runtime was bundled into the remote. */
export function assertNoReactRuntime(source, label = "The built remote") {
  for (const marker of REACT_RUNTIME_MARKERS) {
    if (source.includes(marker)) {
      throw new Error(`${label} bundled a React runtime marker: ${marker}.`);
    }
  }
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
    return `${gzipBytes} gzip bytes, within ${baseline.maximumIncreasePercent}% of the ${baseline.gzipBytes}-byte baseline`;
  }
  const increase = (
    ((gzipBytes - baseline.gzipBytes) / baseline.gzipBytes) *
    100
  ).toFixed(1);
  const ceiling = baseline.approvedCeilingGzipBytes;
  if (!Number.isInteger(ceiling)) {
    throw new Error(
      `The remote is ${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and over the ${baseline.maximumIncreasePercent}% limit, with no approved ceiling.`,
    );
  }
  if (gzipBytes > ceiling) {
    throw new Error(
      `The remote is ${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and over the approved ${ceiling}-byte ceiling.`,
    );
  }
  return `${gzipBytes} gzip bytes, ${increase}% above the ${baseline.gzipBytes}-byte baseline and within the approved ${ceiling}-byte ceiling`;
}
