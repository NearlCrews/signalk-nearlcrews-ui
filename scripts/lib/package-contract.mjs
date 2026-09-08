export const PACKAGE_NAME = "signalk-nearlcrews-ui";

const PACKAGE_DESCRIPTION =
  "Accessible, theme-aware React primitives for Signal K administration panels.";

/**
 * The published runtime floor. npm shows `engines.node` to every installer as
 * a runtime requirement, and this browser-only library has none beyond what
 * Signal K server itself declares, so it matches the server's `>=22`. The
 * precise development floors live in devEngines, which npm applies only to
 * this repository's own contributors.
 */
const ENGINES_NODE_RANGE = ">=22";
const DEV_NODE_RANGE = "^22.22.2 || ^24.15.0 || ^26.0.0";
const NPM_RANGE = "^11.16.0 || ^12.0.0";

const EXPECTED_KEYWORDS = Object.freeze([
  "signalk",
  "react",
  "ui",
  "components",
  "accessibility",
  "marine",
  "module-federation",
  "design-system",
]);

export const MAINTAINED_PACKAGE_DOCS = Object.freeze([
  "docs/api-reference.md",
  "docs/design-contract.md",
  "docs/migration.md",
  "docs/release-policy.md",
  "docs/repository-setup.md",
  "docs/screenshots/showcase-dark.png",
  "docs/screenshots/showcase-light.png",
  "docs/screenshots/showcase-night.png",
]);

const EXPECTED_PACKAGE_FILES = Object.freeze([
  "bin",
  "dist",
  "docs",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
]);

const EXPECTED_BIN = Object.freeze({
  "snui-check-consumer": "bin/snui-check-consumer.mjs",
});

const REQUIRED_TOP_LEVEL_FILES = Object.freeze([
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
]);

const SIGNAL_K_DISCOVERY_KEYWORDS = new Set([
  "signalk-embeddable-webapp",
  "signalk-node-server-addon",
  "signalk-node-server-plugin",
  "signalk-wasm-plugin",
  "signalk-webapp",
]);

const FORBIDDEN_SIGNAL_K_FIELDS = Object.freeze([
  "signalk",
  "signalk-plugin-enabled-by-default",
  "wasmCapabilities",
  "wasmManifest",
]);

const README_BADGES = Object.freeze([
  "[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)",
  "[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)",
  "[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)",
  "[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/LICENSE)",
  "[![node](https://img.shields.io/badge/node-22.22.2%20%7C%2024.15.0%20%7C%2026.0.0-brightgreen.svg)](https://nodejs.org)",
  "[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/nearlcrews)",
]);

/** Markdown link destinations that are relative repository paths to Markdown. */
const RELATIVE_MARKDOWN_LINK =
  /\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

function requireSameMembers(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    expected.some((value) => !actual.includes(value))
  ) {
    throw new Error(`${label} must contain only ${expected.join(", ")}.`);
  }
}

/**
 * The Signal K App Store README view rewrites only image targets, so a relative
 * link to a Markdown file is dead there. Every document link in the README is
 * an absolute repository URL.
 */
export function findRelativeMarkdownLinks(readme) {
  const found = [];
  let fenced = false;
  for (const line of readme.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line
      .replace(/`[^`]*`/g, "")
      .matchAll(RELATIVE_MARKDOWN_LINK)) {
      const destination = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destination)) continue;
      if (/\.md(?:#|$)/i.test(destination)) found.push(destination);
    }
  }
  return found;
}

function validateExportsMap(exportsMap) {
  if (exportsMap === null || typeof exportsMap !== "object") {
    throw new Error("package.json exports must be an object.");
  }
  if (exportsMap["./package.json"] !== "./package.json") {
    throw new Error(
      'package.json exports must expose "./package.json" so tooling can read the manifest through Node resolution.',
    );
  }
  for (const [subpath, declaration] of Object.entries(exportsMap)) {
    if (typeof declaration === "string") continue;
    if (declaration === null || typeof declaration !== "object") {
      throw new Error(
        `package.json export ${subpath} must be a string or a conditions object.`,
      );
    }
    const conditions = Object.keys(declaration);
    if (conditions[0] !== "types") {
      throw new Error(
        `package.json export ${subpath} must list "types" first.`,
      );
    }
    if (conditions.at(-1) !== "default") {
      throw new Error(
        `package.json export ${subpath} must list "default" last.`,
      );
    }
    const target = declaration.import ?? declaration.require;
    if (typeof target !== "string" || declaration.default !== target) {
      throw new Error(
        `package.json export ${subpath} must carry a "default" condition equal to its "import" or "require" target so CommonJS consumers can require it.`,
      );
    }
  }
}

/** Name, publishability, and the authorship and issue-tracker metadata npm shows. */
function validateIdentity(packageJson) {
  if (packageJson.name !== PACKAGE_NAME) {
    throw new Error(`Unexpected package name: ${packageJson.name}`);
  }

  if (packageJson.private === true) {
    throw new Error(
      "The package must remain publishable as a public npm dependency.",
    );
  }

  if (
    packageJson.description !== PACKAGE_DESCRIPTION ||
    packageJson.type !== "module" ||
    packageJson.license !== "Apache-2.0"
  ) {
    throw new Error(
      "package.json description, module type, and Apache-2.0 license must remain canonical.",
    );
  }

  if (
    packageJson.author?.name !== "Nearl Crews" ||
    packageJson.author?.email !== "NearlCrews@users.noreply.github.com" ||
    packageJson.author?.url !== "https://github.com/NearlCrews"
  ) {
    throw new Error("package.json author metadata must remain canonical.");
  }

  if (
    packageJson.homepage !==
      "https://github.com/NearlCrews/signalk-nearlcrews-ui#readme" ||
    packageJson.repository?.type !== "git" ||
    packageJson.repository?.url !==
      "git+https://github.com/NearlCrews/signalk-nearlcrews-ui.git" ||
    packageJson.bugs?.url !==
      "https://github.com/NearlCrews/signalk-nearlcrews-ui/issues"
  ) {
    throw new Error(
      "package.json homepage, repository, and bugs metadata must remain canonical.",
    );
  }
}

/** The one enforced statement of the Node and npm ranges. */
function validateRuntimeContract(packageJson) {
  if (
    packageJson.engines?.node !== ENGINES_NODE_RANGE ||
    packageJson.devEngines?.runtime?.name !== "node" ||
    packageJson.devEngines?.runtime?.version !== DEV_NODE_RANGE ||
    packageJson.devEngines?.runtime?.onFail !== "error" ||
    packageJson.devEngines?.packageManager?.name !== "npm" ||
    packageJson.devEngines?.packageManager?.version !== NPM_RANGE ||
    packageJson.devEngines?.packageManager?.onFail !== "error"
  ) {
    throw new Error(
      "package.json Node, npm, and devEngines metadata must remain canonical.",
    );
  }

  if (Object.hasOwn(packageJson, "packageManager")) {
    throw new Error(
      "package.json must not declare packageManager; devEngines.packageManager is the one enforced statement of the npm range.",
    );
  }
  requireSameMembers(
    packageJson.sideEffects,
    ["*.css"],
    "package.json sideEffects",
  );
}

/** The lockfile root and the install-script allowlist, which tracks the locked esbuild. */
function validateLockAgreement(packageJson, packageLock) {
  if (
    packageLock.name !== packageJson.name ||
    packageLock.version !== packageJson.version ||
    packageLock.packages?.[""]?.name !== packageJson.name ||
    packageLock.packages?.[""]?.version !== packageJson.version
  ) {
    throw new Error(
      `package-lock.json root metadata does not match ${packageJson.name}@${packageJson.version}.`,
    );
  }

  const lockedEsbuild = packageLock.packages?.["node_modules/esbuild"]?.version;
  const expectedAllowScripts = { [`esbuild@${String(lockedEsbuild)}`]: true };
  if (
    typeof lockedEsbuild !== "string" ||
    JSON.stringify(packageJson.allowScripts) !==
      JSON.stringify(expectedAllowScripts)
  ) {
    throw new Error(
      `package.json allowScripts must equal ${JSON.stringify(expectedAllowScripts)} so strict-allow-scripts admits exactly the locked esbuild install script; update the key when esbuild is bumped.`,
    );
  }
}

/** What the tarball offers: the file list, the bin, the exports map, and publishConfig. */
function validatePackagedSurface(packageJson) {
  requireSameMembers(
    packageJson.files,
    EXPECTED_PACKAGE_FILES,
    "package.json files",
  );

  if (JSON.stringify(packageJson.bin) !== JSON.stringify(EXPECTED_BIN)) {
    throw new Error(
      `package.json bin must equal ${JSON.stringify(EXPECTED_BIN)}.`,
    );
  }

  validateExportsMap(packageJson.exports);

  if (
    packageJson.publishConfig?.access !== "public" ||
    packageJson.publishConfig?.provenance !== true ||
    packageJson.publishConfig?.registry !== "https://registry.npmjs.org/"
  ) {
    throw new Error(
      "publishConfig must require public npm publication with provenance.",
    );
  }
}

/** The release gates, and the prepare ban npm 10 makes necessary. */
function validateLifecycleScripts(packageJson) {
  if (
    packageJson.scripts?.["release:check"] !==
    "node scripts/check-release-approval.mjs && npm run validate && npm run test:browser"
  ) {
    throw new Error(
      "release:check must retain approval, validation, and browser gates.",
    );
  }

  // prepack builds and nothing more: the publish workflow packs with
  // --ignore-scripts after release:check has already validated the tree, and a
  // validating prepack would recurse into the pack-based checks it runs.
  if (packageJson.scripts?.prepack !== "npm run build") {
    throw new Error("prepack must build the package and nothing more.");
  }

  if (Object.hasOwn(packageJson.scripts ?? {}, "prepare")) {
    throw new Error(
      "package.json must not define a prepare script; npm 10 runs it under --ignore-scripts.",
    );
  }

  if (
    packageJson.scripts?.prepublishOnly !==
    "node scripts/check-release-approval.mjs && npm run test:browser"
  ) {
    throw new Error(
      "prepublishOnly must retain approval and browser verification.",
    );
  }
}

/** Keywords and fields, which must keep this npm-only library out of Signal K discovery. */
function validateDiscoveryMetadata(packageJson) {
  const forbiddenKeyword = packageJson.keywords?.find(
    (keyword) =>
      SIGNAL_K_DISCOVERY_KEYWORDS.has(keyword) ||
      keyword.startsWith("signalk-category-"),
  );
  if (forbiddenKeyword !== undefined) {
    throw new Error(
      `The npm-only UI library must not use Signal K discovery keyword ${forbiddenKeyword}.`,
    );
  }

  requireSameMembers(
    packageJson.keywords,
    EXPECTED_KEYWORDS,
    "package.json keywords",
  );

  for (const field of FORBIDDEN_SIGNAL_K_FIELDS) {
    if (Object.hasOwn(packageJson, field)) {
      throw new Error(
        `The npm-only UI library must not define Signal K package field ${field}.`,
      );
    }
  }
}

/** One version across src/version.ts, the README, the API reference, the changelog, and the design contract. */
function validateVersionAgreement({
  apiReference,
  changelog,
  designContract,
  packageJson,
  readme,
  versionSource,
}) {
  const versionMatches = [
    ...versionSource.matchAll(/^export const PACKAGE_VERSION = "([^"]+)";$/gm),
  ];
  if (
    versionMatches.length !== 1 ||
    versionMatches[0]?.[1] !== packageJson.version
  ) {
    throw new Error(
      `src/version.ts does not match package version ${packageJson.version}.`,
    );
  }

  const [major, minor] = packageJson.version.split(".");
  for (const [documentName, document, expectedText] of [
    [
      "README.md installation",
      readme,
      `${PACKAGE_NAME}@${packageJson.version}`,
    ],
    [
      "README.md tarball example",
      readme,
      `${PACKAGE_NAME}-${packageJson.version}.tgz`,
    ],
    ["README.md compatibility table", readme, `\`${major}.${minor}.x\``],
    ["API reference version", apiReference, `\`${major}.${minor}.x\``],
    ["CHANGELOG.md release heading", changelog, `## [${packageJson.version}]`],
  ]) {
    if (!document.includes(expectedText)) {
      throw new Error(`${documentName} must contain ${expectedText}.`);
    }
  }

  const expectedScope = `@scope (.snui-root[data-snui-version="${packageJson.version}"])`;
  if (!designContract.includes(expectedScope)) {
    throw new Error(
      `docs/design-contract.md must use package version ${packageJson.version} in its scope example.`,
    );
  }
}

/** The README's release section, its pinned screenshots, its link policy, and its badge block. */
function validateReadmeShape(packageJson, readme) {
  const whatsNewHeadings = [...readme.matchAll(/^## What's new in (.+)$/gm)];
  if (
    whatsNewHeadings.length !== 1 ||
    whatsNewHeadings[0]?.[1] !== packageJson.version
  ) {
    throw new Error(
      `README.md must contain exactly one What's new in ${packageJson.version} heading.`,
    );
  }

  for (const theme of ["light", "dark", "night"]) {
    const expectedScreenshot = `https://unpkg.com/${PACKAGE_NAME}@${packageJson.version}/docs/screenshots/showcase-${theme}.png`;
    if (!readme.includes(expectedScreenshot)) {
      throw new Error(
        `README.md must pin the ${theme} screenshot to ${PACKAGE_NAME}@${packageJson.version}.`,
      );
    }
  }

  const relativeLinks = findRelativeMarkdownLinks(readme);
  if (relativeLinks.length > 0) {
    throw new Error(
      `README.md must not link to Markdown files by relative path (the Signal K App Store rewrites only image targets): ${relativeLinks.join(", ")}. Use absolute https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/ URLs.`,
    );
  }

  const expectedBadgeBlock = `# Signal K NearlCrews UI\n\n${README_BADGES.join("\n")}`;
  if (!readme.startsWith(expectedBadgeBlock)) {
    throw new Error(
      "README.md must retain the canonical badge order and static Apache-2.0 license badge.",
    );
  }
}

/** Extra changelog demands an approved release makes: a date, and a compare link to the tag. */
function validateApprovedRelease(packageJson, changelog) {
  const escapedVersion = packageJson.version.replaceAll(".", String.raw`\.`);
  const datedHeading = new RegExp(
    String.raw`^## \[${escapedVersion}\] - \d{4}-\d{2}-\d{2}$`,
    "m",
  );
  if (!datedHeading.test(changelog)) {
    throw new Error(
      `CHANGELOG.md must date approved release ${packageJson.version}.`,
    );
  }

  const releaseLink = changelog.match(
    new RegExp(String.raw`^\[${escapedVersion}\]: (\S+)$`, "m"),
  )?.[1];
  if (
    releaseLink === undefined ||
    !releaseLink.endsWith(`...v${packageJson.version}`)
  ) {
    throw new Error(
      `CHANGELOG.md must compare release ${packageJson.version} to v${packageJson.version}, not HEAD.`,
    );
  }
}

/**
 * The whole package contract, section by section. Each section throws on the
 * first thing it finds wrong, and they run in the order a reader would check
 * them: who the package is, what it runs on, what it ships, and what it says.
 */
export function validatePackageMetadata({
  apiReference,
  changelog,
  designContract,
  packageJson,
  packageLock,
  readme,
  releaseApproved = false,
  versionSource,
}) {
  validateIdentity(packageJson);
  validateRuntimeContract(packageJson);
  validateLockAgreement(packageJson, packageLock);
  validatePackagedSurface(packageJson);
  validateLifecycleScripts(packageJson);
  validateDiscoveryMetadata(packageJson);
  validateVersionAgreement({
    apiReference,
    changelog,
    designContract,
    packageJson,
    readme,
    versionSource,
  });
  validateReadmeShape(packageJson, readme);
  if (releaseApproved) validateApprovedRelease(packageJson, changelog);
}

export function validatePackedFiles(files, exportsMap, bin = {}) {
  const exportedFiles = Object.values(exportsMap).flatMap((target) =>
    typeof target === "string" ? [target] : Object.values(target),
  );
  const requiredFiles = [
    ...new Set([
      ...exportedFiles.map((target) => target.replace(/^\.\//, "")),
      ...Object.values(bin),
      ...REQUIRED_TOP_LEVEL_FILES,
      ...MAINTAINED_PACKAGE_DOCS,
    ]),
  ];

  for (const requiredFile of requiredFiles) {
    if (!files.has(requiredFile)) {
      throw new Error(`Packed artifact is missing ${requiredFile}.`);
    }
  }

  const topLevelAllowlist = new Set(REQUIRED_TOP_LEVEL_FILES);
  const documentationAllowlist = new Set(MAINTAINED_PACKAGE_DOCS);

  for (const file of files) {
    if (
      file.startsWith("dist/") ||
      file.startsWith("bin/") ||
      topLevelAllowlist.has(file) ||
      documentationAllowlist.has(file)
    ) {
      continue;
    }

    throw new Error(`Packed artifact unexpectedly includes ${file}.`);
  }
}
