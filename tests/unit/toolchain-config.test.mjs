/**
 * Keeps the toolchain settings that are stated in one file and relied on in
 * another honest: the editor schemas read from the installed tools, the CI
 * cancellation rule the release gate depends on, the corpus each
 * documentation gate reads, and the split of the unit suite between a Node
 * and a DOM environment.
 */
import { readdirSync, readFileSync } from "node:fs";
import { matchesGlob } from "node:path";

import { describe, expect, it } from "vitest";

import { readPackageJson, repositoryPath } from "../../scripts/lib/paths.mjs";
import { CI_WORKFLOW_PATH } from "../../scripts/lib/release-checks.mjs";
import vitestConfig from "../../vitest.config.js";

function readText(...parts) {
  return readFileSync(repositoryPath(...parts), "utf8");
}

function readRepositoryJson(...parts) {
  return JSON.parse(readText(...parts));
}

const ciWorkflow = readText(CI_WORKFLOW_PATH);
const packageJson = await readPackageJson();

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
    expect(readRepositoryJson("knip.json").$schema).toBe(
      "./node_modules/knip/schema.json",
    );
    expect(() =>
      readRepositoryJson("node_modules", "knip", "schema.json"),
    ).not.toThrow();
  });

  it("points the Biome schema at the installed Biome", () => {
    const installed = readRepositoryJson(
      "node_modules",
      "@biomejs",
      "biome",
      "package.json",
    ).version;
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe(installed);
    expect(readRepositoryJson("biome.json").$schema).toBe(
      "./node_modules/@biomejs/biome/configuration_schema.json",
    );
    expect(() =>
      readRepositoryJson(
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
    expect(readRepositoryJson(".markdownlint.json").default).toBe(true);
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

  it("restores stubbed environment variables and globals in both projects", () => {
    // Only the components project loads tests/setup.ts, so the restore a
    // tooling spec relies on has to come from the block both projects extend.
    expect(vitestConfig.test?.unstubEnvs).toBe(true);
    expect(vitestConfig.test?.unstubGlobals).toBe(true);
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
