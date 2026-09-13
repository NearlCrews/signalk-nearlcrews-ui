import { readPackageJson } from "./lib/paths.mjs";

if (process.env.SNUI_RELEASE_APPROVED !== "true") {
  throw new Error(
    "Set SNUI_RELEASE_APPROVED=true only after explicit final publication approval.",
  );
}

const packageJson = await readPackageJson();
// Absent or exactly false, not "not the boolean true": npm treats any truthy
// value here as private, a JSON string included.
if (packageJson.private !== undefined && packageJson.private !== false) {
  throw new Error("A private package cannot be published.");
}
