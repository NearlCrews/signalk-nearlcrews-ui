/**
 * Runs the TypeScript 7 compiler by path.
 *
 * Two TypeScript packages are installed through npm aliases (see
 * CONTRIBUTING.md, "TypeScript toolchain"), and both declare a `tsc` binary.
 * npm links `node_modules/.bin/tsc` to whichever package it installed last, so
 * a bare `tsc` can silently resolve to TypeScript 6 after a fresh install.
 * Resolving `@typescript/native` by name removes that dependence on install
 * order for the build and the type check.
 */
import { spawnSync } from "node:child_process";
import { typescriptCompilerEntry } from "./lib/typescript-compiler.mjs";

const result = spawnSync(
  process.execPath,
  [typescriptCompilerEntry(), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
