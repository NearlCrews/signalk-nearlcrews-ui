import { spawnSync } from "node:child_process";
import process from "node:process";

/**
 * Runs a script under the Node that runs the suite and returns the finished
 * process, with its output as text. The specs that drive a command end to end
 * share it, so each reads `status`, `stdout`, and `stderr` the same way.
 */
export function runNode(script, ...args) {
  return runNodeWith({}, script, ...args);
}

/** {@link runNode} with spawnSync options, such as an environment or a timeout. */
export function runNodeWith(options, script, ...args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    ...options,
  });
}

/**
 * Runs an ES module source text under the same Node through `--eval`, for the
 * specs that measure or isolate a module in a process of its own. `options`
 * reaches spawnSync, so a spec can set an environment or a timeout.
 */
export function runNodeEval(source, options = {}) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", source],
    { encoding: "utf8", ...options },
  );
}
