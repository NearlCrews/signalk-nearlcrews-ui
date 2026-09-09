import { readPackageJson } from "./lib/paths.mjs";

if (process.env.SNUI_RELEASE_APPROVED !== "true") {
  throw new Error(
    "Set SNUI_RELEASE_APPROVED=true only after explicit final publication approval.",
  );
}

const packageJson = await readPackageJson();
if (packageJson.private === true) {
  throw new Error("A private package cannot be published.");
}
