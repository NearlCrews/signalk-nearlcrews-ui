/**
 * Resolves the TypeScript 7 compiler's own Node entry point.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"). Only `@typescript/native` declares
 * a `tsc` binary today, and npm links `node_modules/.bin/tsc` to whichever
 * package declaring it installed last, so resolving `@typescript/native` by
 * package path keeps a future TypeScript 6 alias that reclaimed the name from
 * deciding which compiler runs.
 */
import { createRequire } from "node:module";

import { packageBinaryEntry } from "./paths.mjs";

const require = createRequire(import.meta.url);

/** Absolute path to the TypeScript 7 compiler entry point. */
export function typescriptCompilerEntry() {
  return packageBinaryEntry(
    require.resolve("@typescript/native/package.json"),
    "tsc",
  );
}
