import { spawnSync } from "node:child_process";
import process from "node:process";

/**
 * Runs a script under the Node that runs the suite and returns the finished
 * process, with its output as text. The specs that drive a command end to end
 * share it, so each reads `status`, `stdout`, and `stderr` the same way.
 */
export function runNode(script, ...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}
