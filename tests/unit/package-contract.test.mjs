import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  findRelativeMarkdownLinks,
  MAINTAINED_PACKAGE_DOCS,
  validatePackageMetadata,
  validatePackedFiles,
} from "../../scripts/lib/package-contract.mjs";

const version = "0.8.1";
const exportsMap = {
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./federation": {
    types: "./dist/federation.d.cts",
    require: "./dist/federation.cjs",
    default: "./dist/federation.cjs",
  },
  "./forms": {
    types: "./dist/forms.d.ts",
    import: "./dist/forms.js",
    default: "./dist/forms.js",
  },
  "./package.json": "./package.json",
  "./tokens.css": "./dist/tokens.css",
};
const packageJson = {
  name: "signalk-nearlcrews-ui",
  version,
  description:
    "Accessible, theme-aware React primitives for Signal K administration panels.",
  type: "module",
  sideEffects: ["*.css"],
  files: ["bin", "dist", "docs", "CHANGELOG.md", "LICENSE", "README.md"],
  bin: { "snui-check-consumer": "bin/snui-check-consumer.mjs" },
  exports: exportsMap,
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
  engines: { node: ">=22" },
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
  publishConfig: {
    access: "public",
    provenance: true,
    registry: "https://registry.npmjs.org/",
  },
  scripts: {
    "release:check":
      "node scripts/check-release-approval.mjs && npm run validate && npm run test:browser",
    prepack: "npm run build",
    prepublishOnly:
      "node scripts/check-release-approval.mjs && npm run test:browser",
  },
  allowScripts: { "esbuild@0.28.2": true },
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
  packages: {
    "": { name: packageJson.name, version },
    "node_modules/esbuild": { version: "0.28.2" },
  },
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

Install signalk-nearlcrews-ui@${version} or signalk-nearlcrews-ui-${version}.tgz. Compatible with \`0.8.x\`. See the [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md).

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

function withPackageJson(mutation) {
  return { ...validMetadata, packageJson: { ...packageJson, ...mutation } };
}

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
      validatePackageMetadata(
        withPackageJson({
          scripts: { ...packageJson.scripts, prepack: "npm run validate" },
        }),
      ),
    ).toThrow("prepack must build the package and nothing more.");
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          scripts: { ...packageJson.scripts, prepare: "husky" },
        }),
      ),
    ).toThrow("must not define a prepare script");
  });

  it("keeps the allowScripts key equal to the locked esbuild version", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        packageLock: {
          ...packageLock,
          packages: {
            ...packageLock.packages,
            "node_modules/esbuild": { version: "0.28.3" },
          },
        },
      }),
    ).toThrow('allowScripts must equal {"esbuild@0.28.3":true}');
    expect(() =>
      validatePackageMetadata(
        withPackageJson({ allowScripts: { esbuild: true } }),
      ),
    ).toThrow("allowScripts must equal");
  });

  it("rejects a packageManager field beside devEngines", () => {
    expect(() =>
      validatePackageMetadata(
        withPackageJson({ packageManager: "npm@12.0.2" }),
      ),
    ).toThrow("must not declare packageManager");
  });

  it("publishes the runtime Node floor and keeps the precise development floors", () => {
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          engines: { node: "^22.22.2 || ^24.15.0 || ^26.0.0" },
        }),
      ),
    ).toThrow("must remain canonical");
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          devEngines: {
            ...packageJson.devEngines,
            runtime: { ...packageJson.devEngines.runtime, version: ">=22" },
          },
        }),
      ),
    ).toThrow("must remain canonical");
  });

  it("requires a default condition beside every import or require target", () => {
    const withoutDefault = Object.fromEntries(
      Object.entries(exportsMap["./forms"]).filter(
        ([condition]) => condition !== "default",
      ),
    );
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          exports: { ...exportsMap, "./forms": withoutDefault },
        }),
      ),
    ).toThrow('must list "default" last');
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          exports: {
            ...exportsMap,
            "./forms": { ...exportsMap["./forms"], default: "./dist/other.js" },
          },
        }),
      ),
    ).toThrow(
      'must carry a "default" condition equal to its "import" or "require" target',
    );
    const withoutManifest = Object.fromEntries(
      Object.entries(exportsMap).filter(
        ([subpath]) => subpath !== "./package.json",
      ),
    );
    expect(() =>
      validatePackageMetadata(withPackageJson({ exports: withoutManifest })),
    ).toThrow('must expose "./package.json"');
  });

  it("rejects a missing or renamed consumer bin", () => {
    expect(() => validatePackageMetadata(withPackageJson({ bin: {} }))).toThrow(
      "package.json bin must equal",
    );
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          files: packageJson.files.filter((f) => f !== "bin"),
        }),
      ),
    ).toThrow("package.json files must contain only");
  });

  it("rejects Signal K discovery metadata", () => {
    expect(() =>
      validatePackageMetadata(
        withPackageJson({
          keywords: [...packageJson.keywords, "signalk-webapp"],
        }),
      ),
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
    ["engines", { engines: { node: ">=20" } }],
    [
      "keywords",
      {
        keywords: packageJson.keywords.filter(
          (keyword) => keyword !== "marine",
        ),
      },
    ],
  ])("rejects noncanonical %s metadata", (_name, mutation) => {
    expect(() => validatePackageMetadata(withPackageJson(mutation))).toThrow(
      /must remain canonical|must contain only/,
    );
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

  it("rejects relative Markdown links in the README", () => {
    expect(() =>
      validatePackageMetadata({
        ...validMetadata,
        readme: `${readme}\nSee the [changelog](CHANGELOG.md#081) and [guide](docs/migration.md).\n`,
      }),
    ).toThrow(
      "README.md must not link to Markdown files by relative path (the Signal K App Store rewrites only image targets): CHANGELOG.md#081, docs/migration.md.",
    );
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

describe("relative Markdown link detection", () => {
  it("finds relative Markdown targets and ignores absolute, anchor, image, and code links", () => {
    const markdown = [
      "See [the guide](docs/migration.md#changes-in-082) and [notes](CHANGELOG.md).",
      "Absolute [reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md).",
      "Anchor [below](#localization-defaults) and mail [me](mailto:someone@example.test).",
      "![Screenshot](docs/screenshots/showcase-light.png)",
      "Inline code `[not a link](docs/fake.md)` is skipped.",
      "```",
      "[fenced](docs/fenced.md)",
      "```",
    ].join("\n");
    expect(findRelativeMarkdownLinks(markdown)).toEqual([
      "docs/migration.md#changes-in-082",
      "CHANGELOG.md",
    ]);
  });
});

describe("packed documentation allowlist", () => {
  const bin = { "snui-check-consumer": "bin/snui-check-consumer.mjs" };
  const packedFiles = new Set([
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "package.json",
    "bin/snui-check-consumer.mjs",
    "bin/lib/consumer-checks.mjs",
    "dist/index.d.ts",
    "dist/index.js",
    "dist/federation.cjs",
    "dist/federation.d.cts",
    "dist/forms.d.ts",
    "dist/forms.js",
    "dist/tokens.css",
    ...MAINTAINED_PACKAGE_DOCS,
  ]);

  it("accepts only maintained package documentation, dist, and bin", () => {
    expect(() =>
      validatePackedFiles(packedFiles, exportsMap, bin),
    ).not.toThrow();
  });

  it("rejects stale planning documents", () => {
    expect(() =>
      validatePackedFiles(
        new Set([...packedFiles, "docs/improvement-plan.md"]),
        exportsMap,
        bin,
      ),
    ).toThrow("unexpectedly includes docs/improvement-plan.md");
  });

  it("rejects missing public entry points and bin files", () => {
    const missingTokens = new Set(packedFiles);
    missingTokens.delete("dist/tokens.css");
    expect(() => validatePackedFiles(missingTokens, exportsMap, bin)).toThrow(
      "missing dist/tokens.css",
    );
    const missingFederation = new Set(packedFiles);
    missingFederation.delete("dist/federation.cjs");
    expect(() =>
      validatePackedFiles(missingFederation, exportsMap, bin),
    ).toThrow("missing dist/federation.cjs");
    const missingBin = new Set(packedFiles);
    missingBin.delete("bin/snui-check-consumer.mjs");
    expect(() => validatePackedFiles(missingBin, exportsMap, bin)).toThrow(
      "missing bin/snui-check-consumer.mjs",
    );
  });
});

describe("exports map resolution", () => {
  // A synthetic install of the real manifest with empty targets proves the
  // conditions resolve under both loaders without needing a built dist.
  const workspace = mkdtempSync(join(tmpdir(), "snui-exports-"));
  const packageDirectory = join(workspace, "node_modules", packageJson.name);
  const realManifest = createRequire(import.meta.url)("../../package.json");
  const targets = Object.values(realManifest.exports).flatMap((declaration) =>
    typeof declaration === "string"
      ? [declaration]
      : Object.values(declaration),
  );
  for (const target of new Set(targets)) {
    const path = join(packageDirectory, ...target.split("/"));
    mkdirSync(join(path, ".."), { recursive: true });
    if (target !== "./package.json") writeFileSync(path, "");
  }
  writeFileSync(
    join(packageDirectory, "package.json"),
    JSON.stringify(realManifest),
  );
  writeFileSync(join(workspace, "consumer.cjs"), "");
  const consumerRequire = createRequire(join(workspace, "consumer.cjs"));

  afterAll(() => {
    rmSync(workspace, { force: true, recursive: true });
  });

  it("resolves every JavaScript entry through require", () => {
    for (const [subpath, declaration] of Object.entries(realManifest.exports)) {
      if (typeof declaration === "string") continue;
      const specifier =
        subpath === "."
          ? packageJson.name
          : `${packageJson.name}/${subpath.slice(2)}`;
      const target = declaration.require ?? declaration.default;
      expect(consumerRequire.resolve(specifier)).toBe(
        join(packageDirectory, ...target.split("/")),
      );
    }
  });

  it("resolves the manifest and the stylesheet by subpath", () => {
    expect(consumerRequire.resolve(`${packageJson.name}/package.json`)).toBe(
      join(packageDirectory, "package.json"),
    );
    expect(consumerRequire.resolve(`${packageJson.name}/tokens.css`)).toBe(
      join(packageDirectory, "dist", "tokens.css"),
    );
  });
});
