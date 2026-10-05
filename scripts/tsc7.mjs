/**
 * Runs the TypeScript 7 compiler by path, for the build and the type check.
 * scripts/lib/typescript-compiler.mjs says why the bare `tsc` name is not
 * used.
 */
import { runTypescriptCompiler } from "./lib/typescript-compiler.mjs";

const { status } = runTypescriptCompiler(process.argv.slice(2), {
  stdio: "inherit",
});
process.exit(status ?? 1);
