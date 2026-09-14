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

export function hostedSnapshotVariants(ciWorkflowSource) {
  const variants = readScalarValues(ciWorkflowSource, "snapshot_variant");
  if (variants.length === 0) {
    throw new Error("ci.yml declares no snapshot_variant values.");
  }
  return variants;
}

/**
 * Names already read from a spec source. Both the missing-file and the
 * orphan-file readers ask for them, once per variant each, and the answer is
 * a pure function of the source they are given.
 */
const SNAPSHOT_NAMES = new Map();

export function collectSnapshotNames(specSource) {
  const cached = SNAPSHOT_NAMES.get(specSource);
  if (cached !== undefined) return cached;

  const names = new Set();
  for (const match of specSource.matchAll(LITERAL_SNAPSHOT_CALL)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  // A spec that builds its names dynamically, or a renamed helper, would leave
  // every reader comparing an empty set and reporting a family as complete.
  if (names.size === 0) {
    throw new Error("The browser spec declares no literal screenshot names.");
  }
  const sorted = [...names].sort();
  SNAPSHOT_NAMES.set(specSource, sorted);
  return sorted;
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

/**
 * Committed images of this family that no screenshot asks for any more, which
 * is what a renamed or deleted screenshot leaves behind.
 */
export function orphanSnapshotFiles(specSource, variant, presentFiles) {
  const expected = new Set(expectedSnapshotFiles(specSource, variant));
  const suffix = `-linux-${variant}.png`;
  return presentFiles
    .filter((file) => file.endsWith(suffix) && !expected.has(file))
    .sort();
}
