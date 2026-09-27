import { isPrivate } from "./lib/package-contract.mjs";
import { readPackageJson } from "./lib/paths.mjs";

if (process.env.SNUI_RELEASE_APPROVED !== "true") {
  throw new Error(
    "Set SNUI_RELEASE_APPROVED=true only after explicit final publication approval.",
  );
}

if (isPrivate(await readPackageJson())) {
  throw new Error("A private package cannot be published.");
}
