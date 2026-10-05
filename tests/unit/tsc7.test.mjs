import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readPackageJson, repositoryPath } from "../../scripts/lib/paths.mjs";
import {
  runTypescriptCompiler,
  typescriptCompilerEntry,
} from "../../scripts/lib/typescript-compiler.mjs";
import { runNode } from "./lib/run-node.mjs";

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
    const result = runNode(repositoryPath("scripts", "tsc7.mjs"), "--version");
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

describe("running the compiler from a script", () => {
  it("returns the finished process", async () => {
    const result = runTypescriptCompiler(["--version"], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(
      new RegExp(`^Version ${await declaredCompilerMajor()}\\.`),
    );
  });

  it("reports a compiler that never started, rather than an empty type error", () => {
    // A working directory that does not exist fails the spawn itself, which
    // is what a broken alias install looks like to the caller.
    expect(() =>
      runTypescriptCompiler(["--version"], {
        cwd: repositoryPath("no-such-directory"),
        encoding: "utf8",
      }),
    ).toThrow("Could not run the TypeScript 7 compiler");
  });

  it("returns a compiler that printed more than the buffer keeps", () => {
    // The compiler ran, so its caller reads the status and prints the output
    // that was kept, as it does for any other compile.
    const result = runTypescriptCompiler(["--version"], {
      encoding: "utf8",
      maxBuffer: 1,
    });

    expect(result.error).toMatchObject({ code: "ENOBUFS" });
    expect(result.stdout).not.toBe("");
  });
});
