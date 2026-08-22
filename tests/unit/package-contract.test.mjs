import { describe, expect, it } from "vitest";

import {
  MAINTAINED_PACKAGE_DOCS,
  validatePackageMetadata,
  validatePackedFiles,
} from "../../scripts/lib/package-contract.mjs";

const version = "0.8.1";
const packageJson = {
  name: "signalk-nearlcrews-ui",
  version,
  description:
    "Accessible, theme-aware React primitives for Signal K administration panels.",
  type: "module",
  sideEffects: ["*.css"],
  files: ["dist", "docs", "CHANGELOG.md", "LICENSE", "README.md"],
  keywords: [
    "signalk",
    "react",
    "ui",
    "components",
    "accessibility",
    "marine",
    "module-federation",
    "design-system",
  ],
  engines: { node: "^22.22.2 || ^24.15.0 || ^26.0.0" },
  devEngines: {
    runtime: {
      name: "node",
      version: "^22.22.2 || ^24.15.0 || ^26.0.0",
      onFail: "error",
    },
    packageManager: {
      name: "npm",
      version: "^11.16.0 || ^12.0.0",
      onFail: "error",
    },
  },
  packageManager: "npm@12.0.2",
  publishConfig: {
    access: "public",
    provenance: true,
    registry: "https://registry.npmjs.org/",
  },
  scripts: {
    "release:check":
      "node scripts/check-release-approval.mjs && npm run validate && npm run test:browser",
    prepack: "npm run validate",
    prepublishOnly:
      "node scripts/check-release-approval.mjs && npm run test:browser",
  },
  author: {
    name: "Nearl Crews",
    email: "NearlCrews@users.noreply.github.com",
    url: "https://github.com/NearlCrews",
  },
  license: "Apache-2.0",
  homepage: "https://github.com/NearlCrews/signalk-nearlcrews-ui#readme",
  repository: {
    type: "git",
    url: "git+https://github.com/NearlCrews/signalk-nearlcrews-ui.git",
  },
  bugs: {
    url: "https://github.com/NearlCrews/signalk-nearlcrews-ui/issues",
  },
};
const packageLock = {
  name: packageJson.name,
  version,
  packages: { "": { name: packageJson.name, version } },
};
const changelog = `## [${version}] - 2026-08-12\n\n[${version}]: https://example.test/v0.7.0...v${version}`;
const badges = [
  "[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)",
  "[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)",
  "[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)",
  "[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/LICENSE)",
  "[![node](https://img.shields.io/badge/node-22.22.2%20%7C%2024.15.0%20%7C%2026.0.0-brightgreen.svg)](https://nodejs.org)",
  "[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/nearlcrews)",
].join("\n");
const readme = `# Signal K NearlCrews UI

${badges}

## What's new in ${version}

Install signalk-nearlcrews-ui@${version} or signalk-nearlcrews-ui-${version}.tgz. Compatible with \`0.8.x\`.

![Light](https://unpkg.com/signalk-nearlcrews-ui@${version}/docs/screenshots/showcase-light.png)
![Dark](https://unpkg.com/signalk-nearlcrews-ui@${version}/docs/screenshots/showcase-dark.png)
![Night](https://unpkg.com/signalk-nearlcrews-ui@${version}/docs/screenshots/showcase-night.png)
`;
const validMetadata = {
  apiReference: "This reference covers `0.8.x`.",
  changelog,
  designContract: `@scope (.snui-root[data-snui-version="${version}"]) {}`,
  packageJson,
  packageLock,
  readme,
  versionSource: `export const PACKAGE_VERSION = "${version}";`,
};

describe("package release metadata", () => {
  it("accepts the maintained package contract", () => {
    expect(() => validatePackageMetadata(validMetadata)).not.toThrow();
    expect(() =>
      validatePackageMetadata({ ...validMetadata, releaseApproved: true }),
    ).not.toThrow();
  });

  it("rejects stale lockfile root metadata", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        packageLock: { ...packageLock, version: "0.7.0" },
      }),
    ).toThrow("package-lock.json root metadata does not match");
  });

  it("rejects release gate weakening", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        packageJson: {
          ...packageJson,
          scripts: { ...packageJson.scripts, prepack: "npm run build" },
        },
      }),
    ).toThrow("prepack must validate");
  });

  it("rejects Signal K discovery metadata", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        packageJson: {
          ...packageJson,
          keywords: [...packageJson.keywords, "signalk-webapp"],
        },
      }),
    ).toThrow("must not use Signal K discovery keyword signalk-webapp");
  });

  it.each([
    ["author", { author: { ...packageJson.author, name: "Someone Else" } }],
    [
      "repository",
      {
        repository: {
          ...packageJson.repository,
          url: "https://example.test/repository.git",
        },
      },
    ],
    ["license", { license: "MIT" }],
    ["engines", { engines: { node: ">=22" } }],
    [
      "keywords",
      {
        keywords: packageJson.keywords.filter(
          (keyword) => keyword !== "marine",
        ),
      },
    ],
  ])("rejects noncanonical %s metadata", (_name, mutation) => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        packageJson: { ...packageJson, ...mutation },
      }),
    ).toThrow(/must remain canonical|must contain only/);
  });

  it("requires approved releases to be dated and linked to their tag", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        changelog: `## [${version}]\n`,
        releaseApproved: true,
      }),
    ).toThrow("must date approved release");
  });

  it("rejects duplicate or stale What's new headings", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        readme: `${readme}\n## What's new in ${version}\n`,
      }),
    ).toThrow(`exactly one What's new in ${version} heading`);
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        readme: readme.replace(
          `## What's new in ${version}`,
          "## What's new in 0.7.0",
        ),
      }),
    ).toThrow(`exactly one What's new in ${version} heading`);
  });

  it("rejects a stale screenshot version", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        readme: readme.replace(
          `@${version}/docs/screenshots/showcase-night.png`,
          "@0.7.0/docs/screenshots/showcase-night.png",
        ),
      }),
    ).toThrow(`pin the night screenshot to signalk-nearlcrews-ui@${version}`);
  });

  it("rejects a stale design-contract scope version", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        designContract: '@scope (.snui-root[data-snui-version="0.7.0"]) {}',
      }),
    ).toThrow(`must use package version ${version} in its scope example`);
  });

  it("rejects reordered or dynamic license badges", () => {
    const reordered = readme.replace(
      `${badges.split("\n")[2]}\n${badges.split("\n")[3]}`,
      `${badges.split("\n")[3]}\n${badges.split("\n")[2]}`,
    );
    expect(() =>
      validatePackageMetadata({ ...validMetadata, readme: reordered }),
    ).toThrow("canonical badge order");

    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        readme: readme.replace(
          "https://img.shields.io/badge/license-Apache--2.0-blue.svg",
          "https://img.shields.io/github/license/NearlCrews/signalk-nearlcrews-ui",
        ),
      }),
    ).toThrow("static Apache-2.0 license badge");
  });
});

describe("packed documentation allowlist", () => {
  const exportsMap = {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./tokens.css": "./dist/tokens.css",
  };
  const packedFiles = new Set([
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "package.json",
    "dist/index.d.ts",
    "dist/index.js",
    "dist/tokens.css",
    ...MAINTAINED_PACKAGE_DOCS,
  ]);

  it("accepts only maintained package documentation", () => {
    expect(() => validatePackedFiles(packedFiles, exportsMap)).not.toThrow();
  });

  it("rejects stale planning documents", () => {
    expect(() =>
      validatePackedFiles(
        new Set([...packedFiles, "docs/improvement-plan.md"]),
        exportsMap,
      ),
    ).toThrow("unexpectedly includes docs/improvement-plan.md");
  });

  it("rejects missing public entry points", () => {
    const missingTokens = new Set(packedFiles);
    missingTokens.delete("dist/tokens.css");
    expect(() => validatePackedFiles(missingTokens, exportsMap)).toThrow(
      "missing dist/tokens.css",
    );
  });
});
