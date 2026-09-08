/**
 * Resolves the TypeScript 7 compiler's own Node entry point.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"), and both declare a `tsc` binary, so
 * npm links `node_modules/.bin/tsc` to whichever it installed last. Resolving
 * `@typescript/native` by name removes that dependence on install order.
 *
 * The `.bin` entry is a shell script on POSIX and a `.cmd` shim on Windows,
 * neither of which spawns portably without a shell, so callers run the returned
 * path through `process.execPath` instead.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** Absolute path to the TypeScript 7 compiler entry point. */
export function typescriptCompilerEntry() {
  const manifestPath = require.resolve("@typescript/native/package.json");
  const manifest = require(manifestPath);
  // npm allows either a bare string or a named map for `bin`.
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.tsc;
  if (typeof bin !== "string" || bin.length === 0) {
    throw new Error(
      "@typescript/native package.json does not declare bin.tsc.",
    );
  }
  return join(dirname(manifestPath), bin);
}
