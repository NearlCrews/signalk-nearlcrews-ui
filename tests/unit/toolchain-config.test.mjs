/**
 * Keeps the toolchain settings that are stated in one file and relied on in
 * another honest: the checksum-pinned workflow tools, the editor schema pins
 * that track an installed version, the CI cancellation rule the release gate
 * depends on, and the corpus each documentation gate reads.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";

const WORKFLOW_NAMES = [
  "ci.yml",
  "external-docs-links.yml",
  "host-contract.yml",
  "npm-publish.yml",
  "update-baselines.yml",
];

function readText(...parts) {
  return readFileSync(repositoryPath(...parts), "utf8");
}

function readJson(...parts) {
  return JSON.parse(readText(...parts));
}

/** Reads a configuration file whose format allows whole-line comments. */
function readJsonc(...parts) {
  const source = readText(...parts)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  return JSON.parse(source);
}

const pinnedTools = readJson(".github", "pinned-tools.json");
const workflows = WORKFLOW_NAMES.map((name) => ({
  name,
  source: readText(".github", "workflows", name),
}));
const ciWorkflow = workflows.find(({ name }) => name === "ci.yml").source;
const packageJson = readJson("package.json");

describe("checksum-pinned workflow tools", () => {
  it("states a version and a SHA-256 for every tool", () => {
    expect(Object.keys(pinnedTools).length).toBeGreaterThan(0);
    for (const [tool, pin] of Object.entries(pinnedTools)) {
      expect(pin.version, `${tool} needs a version`).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pin.sha256, `${tool} needs a SHA-256`).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("installs every pinned tool from the pin file", () => {
    for (const tool of Object.keys(pinnedTools)) {
      const readers = workflows.filter(({ source }) =>
        source.includes(`jq -er '.${tool}.version' .github/pinned-tools.json`),
      );
      expect(
        readers.map(({ name }) => name),
        `${tool} must read its version from .github/pinned-tools.json`,
      ).not.toEqual([]);
    }
  });

  it("leaves no version or checksum written into a workflow", () => {
    for (const { name, source } of workflows) {
      expect(source, `${name} must not carry a literal checksum`).not.toMatch(
        /[0-9a-f]{64}/,
      );
      expect(source, `${name} must not pin a tool version inline`).not.toMatch(
        /_VERSION:\s*\d/,
      );
    }
  });
});

describe("CI cancellation", () => {
  it("cancels superseded pull-request runs only", () => {
    // A push to main must finish: the release gate requires the run at the
    // release commit, and a later merge shares that concurrency group.
    expect(ciWorkflow).toMatch(
      /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
    );
    expect(ciWorkflow).not.toContain("cancel-in-progress: true");
  });
});

describe("editor schema pins", () => {
  it("pins the knip schema to the installed knip", () => {
    const installed = readJson("node_modules", "knip", "package.json").version;
    expect(readJson("knip.json").$schema).toBe(
      `https://unpkg.com/knip@${installed}/schema.json`,
    );
  });

  it("pins the Biome schema to the installed Biome", () => {
    const installed = readJson(
      "node_modules",
      "@biomejs",
      "biome",
      "package.json",
    ).version;
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe(installed);
    expect(readJson("biome.json").$schema).toBe(
      `https://biomejs.dev/schemas/${installed}/schema.json`,
    );
  });
});

describe("documentation gates", () => {
  it("keeps the Markdown globs in the markdownlint configuration", () => {
    // An editor extension and a bare markdownlint-cli2 read the config, not
    // the npm script, so the corpus has to live there.
    const config = readJsonc(".markdownlint-cli2.jsonc");
    expect(config.globs).toEqual(["**/*.md"]);
    expect(config.ignores).toContain("node_modules");
    expect(packageJson.scripts["lint:docs"]).toBe("markdownlint-cli2");
  });

  it("spell checks the shipped trees, not Markdown alone", () => {
    for (const glob of [
      '"**/*.md"',
      '"src/**/*.{ts,tsx}"',
      '"scripts/**/*.mjs"',
      '"bin/**/*.mjs"',
    ]) {
      expect(packageJson.scripts.spellcheck).toContain(glob);
    }
  });
});
