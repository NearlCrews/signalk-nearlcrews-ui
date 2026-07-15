import { readFile } from "node:fs/promises";

if (process.env.SNUI_RELEASE_APPROVED !== "true") {
  throw new Error(
    "Set SNUI_RELEASE_APPROVED=true only after explicit final publication approval.",
  );
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.private === true) {
  throw new Error("A private package cannot be published.");
}
