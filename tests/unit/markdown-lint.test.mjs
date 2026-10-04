import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { markdownLintFailures } from "../../scripts/lib/markdown-lint.mjs";

let root;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "snui-markdown-lint-"));
});

afterAll(async () => {
  await rm(root, { force: true, recursive: true });
});

async function markdownFile(name, text) {
  const file = join(root, name);
  await writeFile(file, text);
  return file;
}

describe("markdownLintFailures", () => {
  it("names the file, the line, and the rule of each finding", async () => {
    const file = await markdownFile(
      "skipped-level.md",
      "# Title\n\n### Two levels down\n",
    );

    const failures = await markdownLintFailures(
      [file],
      { default: true },
      root,
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(
      /^skipped-level\.md:3: MD001\/heading-increment Heading levels should only increment by one level at a time \[Expected: h2; Actual: h3\]$/,
    );
  });

  it("reports nothing for Markdown that follows the rules", async () => {
    const file = await markdownFile("clean.md", "# Title\n\nA paragraph.\n");

    expect(await markdownLintFailures([file], { default: true }, root)).toEqual(
      [],
    );
  });

  it("follows the configuration it is given", async () => {
    const file = await markdownFile(
      "long-line.md",
      `# Title\n\n${"word ".repeat(40).trim()}\n`,
    );

    const strict = await markdownLintFailures([file], { default: true }, root);
    const relaxed = await markdownLintFailures(
      [file],
      { default: true, MD013: false },
      root,
    );

    expect(strict).toEqual([expect.stringContaining("MD013/line-length")]);
    expect(relaxed).toEqual([]);
  });

  it("keeps findings in the order of the files it was given", async () => {
    const first = await markdownFile("b-first.md", "# One\n\n### Skip\n");
    const second = await markdownFile("a-second.md", "# One\n\n### Skip\n");

    const failures = await markdownLintFailures(
      [first, second],
      { default: true },
      root,
    );

    expect(failures.map((line) => line.split(":")[0])).toEqual([
      "b-first.md",
      "a-second.md",
    ]);
  });
});
