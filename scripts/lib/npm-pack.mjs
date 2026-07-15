import { execFileSync } from "node:child_process";

export function runNpmPack(arguments_) {
  const npmExecPath = process.env.npm_execpath;
  if (typeof npmExecPath !== "string" || npmExecPath.length === 0) {
    throw new Error(
      "Package validation must run through npm so npm_execpath is available.",
    );
  }

  return execFileSync(process.execPath, [npmExecPath, "pack", ...arguments_], {
    encoding: "utf8",
  });
}

export function parseNpmPackResult(output, packageName) {
  const parsed = JSON.parse(output);
  let result;

  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error("npm pack returned an unexpected JSON result.");
    }
    [result] = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === "object" &&
    Object.keys(parsed).length === 1 &&
    Object.hasOwn(parsed, packageName)
  ) {
    result = parsed[packageName];
  }

  if (
    result === null ||
    typeof result !== "object" ||
    !Array.isArray(result.files) ||
    !result.files.every(
      (file) =>
        file !== null &&
        typeof file === "object" &&
        typeof file.path === "string",
    ) ||
    typeof result.filename !== "string" ||
    typeof result.size !== "number"
  ) {
    throw new Error("npm pack returned an unexpected JSON result.");
  }

  return result;
}
