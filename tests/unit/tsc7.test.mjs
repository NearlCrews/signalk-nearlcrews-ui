import { spawnSync } from "node:child_process";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

import { readPackageJson, repositoryPath } from "../../scripts/lib/paths.mjs";
import { typescriptCompilerEntry } from "../../scripts/lib/typescript-compiler.mjs";

/** The major the alias range pins, so a floor bump does not need a test edit. */
async function declaredCompilerMajor() {
  const { devDependencies } = await readPackageJson();
  const range = devDependencies["@typescript/native"];
  const major = /(\d+)\.\d+\.\d+/.exec(range ?? "")?.[1];
  if (major === undefined) {
    throw new Error(
      `devDependencies["@typescript/native"] does not name a version: ${range}.`,
    );
  }
  return major;
}

describe("scripts/tsc7.mjs", () => {
  it("runs the TypeScript 7 compiler regardless of which package owns the tsc bin link", async () => {
    const result = spawnSync(
      process.execPath,
      [repositoryPath("scripts", "tsc7.mjs"), "--version"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(
      new RegExp(`^Version ${await declaredCompilerMajor()}\\.`),
    );
  });

  it("resolves the compiler inside its own package rather than through the shared bin link", () => {
    const entry = typescriptCompilerEntry();
    expect(entry).toContain(join("node_modules", "@typescript", "native"));
    expect(entry).not.toContain(join("node_modules", ".bin"));
  });
});
