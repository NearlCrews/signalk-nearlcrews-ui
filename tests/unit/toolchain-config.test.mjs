/**
 * Keeps the toolchain settings that are stated in one file and relied on in
 * another honest: the checksum-pinned workflow tools, the editor schemas read
 * from the installed tools, the CI cancellation rule the release gate
 * depends on, the corpus each documentation gate reads, and the split of the
 * unit suite between a Node and a DOM environment.
 */
import { readdirSync, readFileSync } from "node:fs";
import { matchesGlob } from "node:path";

import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";
import vitestConfig from "../../vitest.config.js";

/** Read from the directory, so a new workflow is held to these rules too. */
const WORKFLOW_NAMES = readdirSync(
  repositoryPath(".github", "workflows"),
).filter((name) => name.endsWith(".yml"));

function readText(...parts) {
  return readFileSync(repositoryPath(...parts), "utf8");
}

function readJson(...parts) {
  return JSON.parse(readText(...parts));
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
  // Each schema is read from the installed package, so an editor validates
  // against the tool that runs and a dependency update edits no second file.
  it("points the knip schema at the installed knip", () => {
    expect(readJson("knip.json").$schema).toBe(
      "./node_modules/knip/schema.json",
    );
    expect(() => readJson("node_modules", "knip", "schema.json")).not.toThrow();
  });

  it("points the Biome schema at the installed Biome", () => {
    const installed = readJson(
      "node_modules",
      "@biomejs",
      "biome",
      "package.json",
    ).version;
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe(installed);
    expect(readJson("biome.json").$schema).toBe(
      "./node_modules/@biomejs/biome/configuration_schema.json",
    );
    expect(() =>
      readJson(
        "node_modules",
        "@biomejs",
        "biome",
        "configuration_schema.json",
      ),
    ).not.toThrow();
  });
});

describe("documentation gates", () => {
  it("lints Markdown with the rules an editor reads", () => {
    // The runner and an editor extension both read .markdownlint.json, so a
    // rule changed there changes what both report.
    expect(readJson(".markdownlint.json").default).toBe(true);
    expect(packageJson.scripts["lint:docs"]).toBe(
      "node scripts/check-markdown.mjs",
    );
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

describe("unit test projects", () => {
  const projects = new Map(
    (vitestConfig.test?.projects ?? []).map((project) => [
      project.test?.name,
      project.test,
    ]),
  );
  const unitFiles = readdirSync(repositoryPath("tests", "unit")).filter(
    (name) => /\.test\.(?:ts|tsx|mjs)$/.test(name),
  );

  function projectsOf(file) {
    return [...projects]
      .filter(([, test]) =>
        (test?.include ?? []).some((glob) =>
          matchesGlob(`tests/unit/${file}`, glob),
        ),
      )
      .map(([name]) => name);
  }

  it("runs the tooling specs under Node, without the DOM setup", () => {
    const tooling = projects.get("tooling");
    expect(tooling?.environment).toBe("node");
    expect(tooling?.setupFiles ?? []).toEqual([]);
  });

  it("runs the component specs under jsdom with the DOM setup", () => {
    const components = projects.get("components");
    expect(components?.environment).toBe("jsdom");
    expect(components?.setupFiles).toEqual(["./tests/setup.ts"]);
  });

  it("restores stubbed environment variables in both projects", () => {
    // Only the components project loads tests/setup.ts, so the restore a
    // tooling spec relies on has to come from the block both projects extend.
    expect(vitestConfig.test?.unstubEnvs).toBe(true);
    for (const project of vitestConfig.test?.projects ?? []) {
      expect(project.extends, project.test?.name).toBe(true);
    }
  });

  it("puts every unit spec in exactly one project", () => {
    expect(unitFiles.length).toBeGreaterThan(0);
    for (const file of unitFiles) {
      const expected = file.endsWith(".mjs") ? "tooling" : "components";
      expect(projectsOf(file), file).toEqual([expected]);
    }
  });
});
