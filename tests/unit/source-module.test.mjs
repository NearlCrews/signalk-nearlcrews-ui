import { describe, expect, it } from "vitest";

import { readPackageJson, repositoryPath } from "../../scripts/lib/paths.mjs";
import { importFromSource } from "../../scripts/lib/source-module.mjs";

describe("loading a source module without a build", () => {
  it("imports what a file under src exports", async () => {
    const { PACKAGE_VERSION } = await importFromSource({
      entryPoints: [repositoryPath("src", "version.ts")],
    });

    expect(PACKAGE_VERSION).toBe((await readPackageJson()).version);
  });

  it("imports an entry written for the occasion", async () => {
    const { names } = await importFromSource({
      stdin: {
        contents:
          'import * as version from "./src/version.ts";\nexport const names = Object.keys(version);',
        loader: "ts",
        resolveDir: repositoryPath(),
        sourcefile: "names.ts",
      },
    });

    expect(names).toContain("PACKAGE_VERSION");
  });
});
