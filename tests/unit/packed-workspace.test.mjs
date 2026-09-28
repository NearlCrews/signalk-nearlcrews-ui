import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runNpmPack } from "../../scripts/lib/npm-pack.mjs";
import { createPackedWorkspace } from "../../scripts/lib/packed-workspace.mjs";
import { readPackageJson } from "../../scripts/lib/paths.mjs";

vi.mock("../../scripts/lib/npm-pack.mjs", async (importOriginal) => ({
  ...(await importOriginal()),
  runNpmPack: vi.fn(),
}));

/** The pack destination npm was asked to write into. */
function destinationOf(call) {
  const argumentsList = call[0];
  return argumentsList[argumentsList.indexOf("--pack-destination") + 1];
}

/** Stands in for `npm pack`: writes a real tarball with one file in it. */
function packFixture(argumentsList) {
  const destination =
    argumentsList[argumentsList.indexOf("--pack-destination") + 1];
  const staging = mkdtempSync(join(tmpdir(), "snui-pack-staging-"));
  try {
    mkdirSync(join(staging, "package"));
    writeFileSync(join(staging, "package", "marker.txt"), "packed\n");
    execFileSync("tar", [
      "-czf",
      join(destination, "fixture.tgz"),
      "-C",
      staging,
      "package",
    ]);
  } finally {
    rmSync(staging, { force: true, recursive: true });
  }
  return JSON.stringify([
    { filename: "fixture.tgz", files: [{ path: "marker.txt" }], size: 1 },
  ]);
}

afterEach(() => {
  vi.mocked(runNpmPack).mockReset();
});

describe("createPackedWorkspace", () => {
  it("extracts the packed package as the workspace's own dependency", async () => {
    vi.mocked(runNpmPack).mockImplementation(packFixture);
    const { name } = await readPackageJson();

    const packed = await createPackedWorkspace("snui-packed-test-");
    try {
      expect(packed.packageJson.name).toBe(name);
      expect(packed.packageDirectory).toBe(
        join(packed.workspace, "node_modules", name),
      );
      expect(
        readFileSync(join(packed.packageDirectory, "marker.txt"), "utf8"),
      ).toBe("packed\n");
      // The repository's installed dependencies are linked beside it.
      expect(
        lstatSync(
          join(packed.workspace, "node_modules", "react"),
        ).isSymbolicLink(),
      ).toBe(true);
      expect(vi.mocked(runNpmPack).mock.calls[0][0]).toEqual([
        "--json",
        "--ignore-scripts",
        "--pack-destination",
        packed.workspace,
      ]);
    } finally {
      packed.dispose();
    }
    expect(existsSync(packed.workspace)).toBe(false);
  });

  it("leaves nothing behind when packing fails", async () => {
    vi.mocked(runNpmPack).mockImplementation(() => {
      throw new Error("npm pack failed");
    });

    await expect(createPackedWorkspace("snui-packed-test-")).rejects.toThrow(
      "npm pack failed",
    );
    const workspace = destinationOf(vi.mocked(runNpmPack).mock.calls[0]);
    expect(existsSync(workspace)).toBe(false);
  });
});
