/**
 * Compiles a consumer against the PACKED artifact rather than against source.
 *
 * The repository tsconfig maps the package name back to `src`, so every fixture
 * and test type checks source. That leaves the emitted declarations, which are
 * the published contract, unverified. This script packs the package, installs
 * the tarball into a temporary tree, and compiles `fixtures/consumer` against
 * it with no path mapping. It then proves the exports map resolves under
 * CommonJS `require` from the same tree, and that the federation entry loads
 * with the share map the build rendered. It also compiles the documentation
 * examples in the same workspace (scripts/lib/doc-example-compile.mjs), so
 * it packs once for both compiles.
 */
import { cpSync, existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { exportSpecifier } from "./lib/bundle-contract.mjs";
import {
  compileDocExamples,
  readDocExamples,
} from "./lib/doc-example-compile.mjs";
import { createFederationShared } from "./lib/federation-share.mjs";
import { createPackedWorkspace } from "./lib/packed-workspace.mjs";
import { repositoryPath } from "./lib/paths.mjs";
import { runTypescriptCompiler } from "./lib/typescript-compiler.mjs";

const fixtureDirectory = repositoryPath("fixtures", "consumer");

if (!existsSync(repositoryPath("dist", "index.d.ts"))) {
  throw new Error("Run the build before checking consumer types.");
}

const packed = await createPackedWorkspace("snui-consumer-");

try {
  const { packageDirectory, packageJson, workspace } = packed;
  const packageName = packageJson.name;

  // The fixture is compiled from inside the workspace so bare specifiers
  // resolve to the packed artifact rather than walking up to the repository.
  cpSync(fixtureDirectory, workspace, { recursive: true });

  const typeCheck = runTypescriptCompiler(
    ["--noEmit", "--project", join(workspace, "tsconfig.json")],
    { cwd: workspace, encoding: "utf8" },
  );

  if (typeCheck.status !== 0) {
    process.stderr.write(typeCheck.stdout ?? "");
    process.stderr.write(typeCheck.stderr ?? "");
    throw new Error(
      "Consumer types failed to compile against the packed declarations.",
    );
  }

  // The documentation examples compile in the same packed workspace, so
  // one pack serves both compiles.
  process.stdout.write(`${compileDocExamples(packed, readDocExamples())}\n`);

  // A CommonJS consumer (a Node test runner, a build script) must be able to
  // resolve every JavaScript entry through `require`; the `default` condition
  // beside each `import` is what makes that work.
  const consumerRequire = createRequire(join(workspace, "consumer.tsx"));
  for (const [subpath, declaration] of Object.entries(packageJson.exports)) {
    const target =
      typeof declaration === "string"
        ? declaration
        : (declaration.require ?? declaration.default);
    if (typeof target !== "string" || !/\.[cm]?js$/.test(target)) continue;
    const specifier = exportSpecifier(packageName, subpath);
    // Both sides pass through realpath: require.resolve returns the real
    // path, and on macOS the temporary workspace lives under /var, which is a
    // symlink to /private/var.
    const resolved = realpathSync(consumerRequire.resolve(specifier));
    const expected = realpathSync(join(packageDirectory, ...target.split("/")));
    if (resolved !== expected) {
      throw new Error(
        `require.resolve("${specifier}") gave ${resolved}; expected ${expected}.`,
      );
    }
  }

  // The federation entry is a CommonJS module a Webpack config requires; it
  // must load and carry the share map rendered from this package.json.
  const federation = consumerRequire(`${packageName}/federation`);
  const expectedShared = createFederationShared(packageJson.peerDependencies);
  if (
    JSON.stringify(federation.shared) !== JSON.stringify(expectedShared) ||
    typeof federation.hostNotes !== "string" ||
    federation.hostNotes.length === 0
  ) {
    throw new Error(
      "The packed federation entry does not carry the share map rendered from package.json.",
    );
  }

  process.stdout.write(
    "Packed-artifact consumer types compiled against dist, and every entry resolves under require.\n",
  );
} finally {
  packed.dispose();
}
