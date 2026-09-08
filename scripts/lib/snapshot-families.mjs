/**
 * The hosted visual-baseline families and the files each one must contain.
 *
 * Both readers derive their expectations here rather than restating the naming
 * scheme: the workflow-contract unit test asserts every screenshot named in
 * tests/browser/panel.spec.ts has a committed baseline in every hosted family,
 * and the refresh workflow, which generates one family per runner, asks for one
 * family at a time. The family list itself lives in the browser matrix of
 * .github/workflows/ci.yml; the refresh workflow repeats it, and that same unit
 * test keeps the two copies equal.
 */
import { readScalarValues } from "./workflow-matrix.mjs";

/** Matches the literal screenshot calls the browser spec makes. */
const LITERAL_SNAPSHOT_CALL =
  /(?:toHaveScreenshot|withActiveSave)\(\s*(?:page,\s*)?["']([^"']+\.png)["']/g;

/** Playwright projects whose screenshots do not come from desktop Chromium. */
const PROJECT_BY_SNAPSHOT = new Map([
  ["panel-mobile-light.png", "mobile-chromium"],
  ["panel-native-controls-webkit.png", "webkit"],
]);

/** Every Playwright project a complete family needs. */
export const FAMILY_PROJECTS = Object.freeze([
  "chromium",
  ...new Set(PROJECT_BY_SNAPSHOT.values()),
]);

export function hostedSnapshotVariants(ciWorkflowSource) {
  const variants = readScalarValues(ciWorkflowSource, "snapshot_variant");
  if (variants.length === 0) {
    throw new Error("ci.yml declares no snapshot_variant values.");
  }
  return variants;
}

export function collectSnapshotNames(specSource) {
  const names = new Set();
  for (const match of specSource.matchAll(LITERAL_SNAPSHOT_CALL)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  return [...names].sort();
}

export function snapshotProject(snapshot) {
  return PROJECT_BY_SNAPSHOT.get(snapshot) ?? "chromium";
}

/** File names one complete family holds, in the Playwright naming scheme. */
export function expectedSnapshotFiles(specSource, variant) {
  return collectSnapshotNames(specSource).map((snapshot) => {
    const stem = snapshot.replace(/\.png$/, "");
    return `${stem}-${snapshotProject(snapshot)}-linux-${variant}.png`;
  });
}

export function missingSnapshotFiles(specSource, variant, presentFiles) {
  const present = new Set(presentFiles);
  return expectedSnapshotFiles(specSource, variant).filter(
    (file) => !present.has(file),
  );
}
