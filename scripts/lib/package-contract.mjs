export const PACKAGE_NAME = "signalk-nearlcrews-ui";

const PACKAGE_DESCRIPTION =
  "Accessible, theme-aware React primitives for Signal K administration panels.";
const NODE_RANGE = "^22.22.2 || ^24.15.0 || ^26.0.0";
const NPM_RANGE = "^11.16.0 || ^12.0.0";
const PACKAGE_MANAGER = "npm@12.0.2";

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
  "dist",
  "docs",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
]);

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

function requireSameMembers(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    expected.some((value) => !actual.includes(value))
  ) {
    throw new Error(`${label} must contain only ${expected.join(", ")}.`);
  }
}

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

  if (
    packageJson.engines?.node !== NODE_RANGE ||
    packageJson.devEngines?.runtime?.name !== "node" ||
    packageJson.devEngines?.runtime?.version !== NODE_RANGE ||
    packageJson.devEngines?.runtime?.onFail !== "error" ||
    packageJson.devEngines?.packageManager?.name !== "npm" ||
    packageJson.devEngines?.packageManager?.version !== NPM_RANGE ||
    packageJson.devEngines?.packageManager?.onFail !== "error" ||
    packageJson.packageManager !== PACKAGE_MANAGER
  ) {
    throw new Error(
      "package.json Node, npm, devEngines, and packageManager metadata must remain canonical.",
    );
  }

  requireSameMembers(
    packageJson.sideEffects,
    ["*.css"],
    "package.json sideEffects",
  );

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

  requireSameMembers(
    packageJson.files,
    EXPECTED_PACKAGE_FILES,
    "package.json files",
  );

  if (
    packageJson.publishConfig?.access !== "public" ||
    packageJson.publishConfig?.provenance !== true ||
    packageJson.publishConfig?.registry !== "https://registry.npmjs.org/"
  ) {
    throw new Error(
      "publishConfig must require public npm publication with provenance.",
    );
  }

  if (
    packageJson.scripts?.["release:check"] !==
    "node scripts/check-release-approval.mjs && npm run validate && npm run test:browser"
  ) {
    throw new Error(
      "release:check must retain approval, validation, and browser gates.",
    );
  }

  if (packageJson.scripts?.prepack !== "npm run validate") {
    throw new Error("prepack must validate the exact package candidate.");
  }

  if (
    packageJson.scripts?.prepublishOnly !==
    "node scripts/check-release-approval.mjs && npm run test:browser"
  ) {
    throw new Error(
      "prepublishOnly must retain approval and browser verification.",
    );
  }

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

  const escapedVersion = packageJson.version.replaceAll(".", String.raw`\.`);
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

  const expectedScope = `@scope (.snui-root[data-snui-version="${packageJson.version}"])`;
  if (!designContract.includes(expectedScope)) {
    throw new Error(
      `docs/design-contract.md must use package version ${packageJson.version} in its scope example.`,
    );
  }

  const expectedBadgeBlock = `# Signal K NearlCrews UI\n\n${README_BADGES.join("\n")}`;
  if (!readme.startsWith(expectedBadgeBlock)) {
    throw new Error(
      "README.md must retain the canonical badge order and static Apache-2.0 license badge.",
    );
  }

  if (!releaseApproved) return;

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

export function validatePackedFiles(files, exportsMap) {
  const exportedFiles = Object.values(exportsMap).flatMap((target) =>
    typeof target === "string" ? [target] : Object.values(target),
  );
  const requiredFiles = [
    ...exportedFiles.map((target) => target.replace(/^\.\//, "")),
    ...REQUIRED_TOP_LEVEL_FILES,
    ...MAINTAINED_PACKAGE_DOCS,
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
      topLevelAllowlist.has(file) ||
      documentationAllowlist.has(file)
    ) {
      continue;
    }

    throw new Error(`Packed artifact unexpectedly includes ${file}.`);
  }
}
