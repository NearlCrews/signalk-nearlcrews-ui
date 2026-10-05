import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  collectFiles,
  collectMarkdownFiles,
  packageBinaryEntry,
  readPackageJson,
  repositoryPath,
} from "../../scripts/lib/paths.mjs";
import {
  removeTemporaryTrees,
  temporaryTree,
  writeTree,
} from "./lib/temporary-tree.mjs";

let root;

beforeAll(() => {
  root = temporaryTree("snui-paths-", {
    "nested/deeper/bottom.md": "bottom",
    "nested/middle.md": "middle",
    "skipped/ignored.md": "ignored",
    "top.md": "top",
    "top.txt": "not markdown",
  });
});

afterAll(removeTemporaryTrees);

function found(files) {
  return files.map((file) => relative(root, file).split(/[\\/]/).join("/"));
}

describe("collectFiles", () => {
  it("finds matching files at every depth", async () => {
    const files = await collectFiles(root, {
      matches: (name) => name.endsWith(".md"),
    });

    expect(found(files).sort()).toEqual([
      "nested/deeper/bottom.md",
      "nested/middle.md",
      "skipped/ignored.md",
      "top.md",
    ]);
  });

  it("never descends into a skipped directory", async () => {
    const files = await collectFiles(root, {
      matches: (name) => name.endsWith(".md"),
      skipDirectories: new Set(["skipped"]),
    });

    expect(found(files)).not.toContain("skipped/ignored.md");
  });

  it("answers with nothing when no name matches", async () => {
    expect(
      await collectFiles(root, { matches: (name) => name.endsWith(".mjs") }),
    ).toEqual([]);
  });
});

describe("collectMarkdownFiles", () => {
  it("reads Markdown at every depth and skips tool and build directories", async () => {
    writeTree(root, {
      "dist/NOTES.MD": "",
      "nested/UPPER.MD": "upper",
      "node_modules/vendored/README.md": "",
    });

    expect(found(await collectMarkdownFiles(root)).sort()).toEqual([
      "nested/UPPER.MD",
      "nested/deeper/bottom.md",
      "nested/middle.md",
      "skipped/ignored.md",
      "top.md",
    ]);
  });

  it("fails a walk that finds no Markdown, which would pass unearned", async () => {
    const empty = join(root, "no-markdown");
    writeTree(root, { "no-markdown/notes.txt": "not markdown" });

    await expect(collectMarkdownFiles(empty)).rejects.toThrow(
      `No Markdown files found under ${empty}.`,
    );
  });
});

describe("repositoryPath", () => {
  it("resolves from the module rather than the working directory", () => {
    expect(repositoryPath("package.json")).toBe(
      fileURLToPath(new URL("../../package.json", import.meta.url)),
    );
  });

  it("reads the repository manifest", async () => {
    const manifest = await readPackageJson();
    expect(manifest.name).toBe("signalk-nearlcrews-ui");
  });
});

describe("packageBinaryEntry", () => {
  it("resolves a bare bin string and a named bin map", () => {
    const bare = join(root, "bare-package.json");
    const named = join(root, "named-package.json");
    writeTree(root, {
      "bare-package.json": JSON.stringify({ bin: "./cli.js", name: "bare" }),
      "named-package.json": JSON.stringify({
        bin: { other: "./other.js", tool: "./tool.js" },
      }),
    });

    expect(packageBinaryEntry(bare, "bare")).toBe(join(root, "cli.js"));
    expect(packageBinaryEntry(named, "tool")).toBe(join(root, "tool.js"));
  });

  it("names the manifest that declares no such binary", () => {
    const manifest = join(root, "binless-package.json");
    writeTree(root, {
      "binless-package.json": JSON.stringify({ name: "binless" }),
    });

    expect(() => packageBinaryEntry(manifest, "tool")).toThrow(
      `${manifest} does not declare bin.tool.`,
    );
  });
});
