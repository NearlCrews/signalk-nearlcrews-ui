import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  collectFiles,
  collectMarkdownFiles,
  packageBinaryEntry,
  readPackageJson,
  repositoryPath,
} from "../../scripts/lib/paths.mjs";

let root;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "snui-paths-"));
  await mkdir(join(root, "nested", "deeper"), { recursive: true });
  await mkdir(join(root, "skipped"), { recursive: true });
  await writeFile(join(root, "top.md"), "top");
  await writeFile(join(root, "top.txt"), "not markdown");
  await writeFile(join(root, "nested", "middle.md"), "middle");
  await writeFile(join(root, "nested", "deeper", "bottom.md"), "bottom");
  await writeFile(join(root, "skipped", "ignored.md"), "ignored");
});

afterAll(async () => {
  await rm(root, { force: true, recursive: true });
});

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
    await mkdir(join(root, "node_modules", "vendored"), { recursive: true });
    await mkdir(join(root, "dist"), { recursive: true });
    await writeFile(join(root, "node_modules", "vendored", "README.md"), "");
    await writeFile(join(root, "dist", "NOTES.MD"), "");
    await writeFile(join(root, "nested", "UPPER.MD"), "upper");

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
    await mkdir(empty, { recursive: true });
    await writeFile(join(empty, "notes.txt"), "not markdown");

    await expect(collectMarkdownFiles(empty)).rejects.toThrow(
      `No Markdown files found under ${empty}.`,
    );
  });
});

describe("repositoryPath", () => {
  it("resolves from the module rather than the working directory", () => {
    expect(repositoryPath("package.json")).toBe(
      join(repositoryPath(), "package.json"),
    );
  });

  it("reads the repository manifest", async () => {
    const manifest = await readPackageJson();
    expect(manifest.name).toBe("signalk-nearlcrews-ui");
  });
});

describe("packageBinaryEntry", () => {
  it("resolves a bare bin string and a named bin map", async () => {
    const bare = join(root, "bare-package.json");
    const named = join(root, "named-package.json");
    await writeFile(bare, JSON.stringify({ bin: "./cli.js", name: "bare" }));
    await writeFile(
      named,
      JSON.stringify({ bin: { other: "./other.js", tool: "./tool.js" } }),
    );

    expect(packageBinaryEntry(bare, "bare")).toBe(join(root, "cli.js"));
    expect(packageBinaryEntry(named, "tool")).toBe(join(root, "tool.js"));
  });

  it("names the manifest that declares no such binary", async () => {
    const manifest = join(root, "binless-package.json");
    await writeFile(manifest, JSON.stringify({ name: "binless" }));

    expect(() => packageBinaryEntry(manifest, "tool")).toThrow(
      `${manifest} does not declare bin.tool.`,
    );
  });
});
