/**
 * Resolves the TypeScript 7 compiler's own Node entry point, and runs it.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"). Only `@typescript/native` declares
 * a `tsc` binary today, and npm links `node_modules/.bin/tsc` to whichever
 * package declaring it installed last, so resolving `@typescript/native` by
 * package path keeps a future TypeScript 6 alias that reclaimed the name from
 * deciding which compiler runs.
 */
import { spawnSync } from "node:child_process";
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

/**
 * Runs the TypeScript 7 compiler with `arguments_` and returns the finished
 * process. `options` are `spawnSync` options.
 *
 * A compiler that never started prints nothing of its own, so without the two
 * checks here a broken alias install is indistinguishable from a type error.
 */
export function runTypescriptCompiler(arguments_, options) {
  const compilerEntry = typescriptCompilerEntry();
  const result = spawnSync(
    process.execPath,
    [compilerEntry, ...arguments_],
    options,
  );
  // A full output buffer means the compiler ran and printed more than
  // spawnSync keeps; the caller reports the truncated diagnostics as a failed
  // compile.
  if (result.error?.code === "ENOBUFS") return result;
  if (result.error) {
    throw new Error(
      `Could not run the TypeScript 7 compiler ${compilerEntry}.`,
      { cause: result.error },
    );
  }
  if (result.signal) {
    throw new Error(
      `The TypeScript 7 compiler ${compilerEntry} was terminated by ${result.signal}.`,
    );
  }
  return result;
}
