/**
 * Runs the TypeScript 7 compiler by path.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"). Only `@typescript/native` declares
 * a `tsc` binary today, while the TypeScript 6 alias declares `tsc6`, but npm
 * links `node_modules/.bin/tsc` to whichever package declaring it installed
 * last, so a TypeScript 6 alias that reclaimed the name would make a bare
 * `tsc` resolve to the wrong compiler after a fresh install. Resolving
 * `@typescript/native` by package path removes that dependence on install
 * order for the build and the type check.
 */
import { spawnSync } from "node:child_process";
import { typescriptCompilerEntry } from "./lib/typescript-compiler.mjs";

const compilerEntry = typescriptCompilerEntry();
const result = spawnSync(
  process.execPath,
  [compilerEntry, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

// A compiler that never started prints nothing of its own, so without these two
// checks a broken alias install is indistinguishable from a type error.
if (result.error) {
  throw new Error(`Could not run the TypeScript 7 compiler ${compilerEntry}.`, {
    cause: result.error,
  });
}
if (result.signal) {
  throw new Error(
    `The TypeScript 7 compiler ${compilerEntry} was terminated by ${result.signal}.`,
  );
}

process.exit(result.status ?? 1);
