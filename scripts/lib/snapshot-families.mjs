/**
 * The hosted visual-baseline families and the files each one must contain.
 *
 * Every reader derives its expectations here rather than restating the naming
 * scheme: the workflow-contract unit test asserts every screenshot named in a
 * snapshot spec has a committed baseline in every hosted family, the refresh
 * workflow, which generates one family per runner, asks for one family at a
 * time, and the fetch script files a downloaded family by the same names. The
 * family list itself lives in the browser matrix of .github/workflows/ci.yml;
 * the refresh workflow repeats it, and that same unit test keeps the two
 * copies equal.
 */
import { readdir, readFile } from "node:fs/promises";

import { readScalarValues } from "./workflow-matrix.mjs";

/**
 * The browser specs that take screenshots, from the repository root. Each
 * one's images live in the directory the Playwright path template gives it.
 */
export const SNAPSHOT_SPECS = Object.freeze([
  "tests/browser/panel.spec.ts",
  "tests/browser/showcase.spec.ts",
]);

/** Where the Playwright snapshot path template files one spec's images. */
export function snapshotDirectory(spec) {
  return `${spec}-snapshots`;
}

/**
 * A screenshot name: any quoted `.png` literal in a snapshot spec. Names are
 * read as literals so a spec that builds them at run time fails loudly here
 * rather than leaving its images unchecked; a spec that loops over themes
 * keeps its names in a literal table.
 */
const SNAPSHOT_NAME = /["'`]([\w.-]+\.png)["'`]/g;

/**
 * Whether a browser spec takes screenshots: it compares one, or it names a
 * baseline image. A spec that does must be listed in SNAPSHOT_SPECS, which a
 * unit test enforces by reading every spec in tests/browser.
 */
export function takesScreenshots(specSource) {
  return (
    specSource.includes("toHaveScreenshot(") ||
    new RegExp(SNAPSHOT_NAME.source).test(specSource)
  );
}

/** Screenshots that do not come from desktop Chromium, by the project that takes them. */
const PROJECT_BY_SNAPSHOT = new Map([
  ["panel-mobile-coarse-light.png", "mobile-chromium"],
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
  for (const [, name] of specSource.matchAll(SNAPSHOT_NAME)) {
    names.add(name);
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

/**
 * Files downloaded baseline images by the names the specs expect. Each file
 * one spec expects for one of the given families is copied into that spec's
 * snapshot directory; anything else, such as a local image or a report, is
 * skipped rather than guessed at. `specSources` maps each spec path to its
 * source text, and `downloadedFiles` holds bare file names.
 */
export function planBaselineCopies(downloadedFiles, specSources, variants) {
  const destinations = new Map();
  for (const [spec, source] of specSources) {
    for (const variant of variants) {
      for (const file of expectedSnapshotFiles(source, variant)) {
        destinations.set(file, snapshotDirectory(spec));
      }
    }
  }

  const copies = [];
  const skipped = [];
  const seen = new Set();
  for (const file of [...downloadedFiles].sort()) {
    if (seen.has(file)) {
      throw new Error(`The download holds ${file} more than once.`);
    }
    seen.add(file);
    const directory = destinations.get(file);
    if (directory === undefined) skipped.push(file);
    else copies.push({ directory, file });
  }
  return { copies, skipped };
}

/**
 * Every snapshot spec with its source and the files its snapshot directory
 * holds. `resolvePath` turns a repository-relative path into a real one. A
 * spec whose directory does not exist yet holds no files.
 */
export function readSnapshotSpecs(resolvePath) {
  return Promise.all(
    SNAPSHOT_SPECS.map(async (spec) => {
      const [source, present] = await Promise.all([
        readFile(resolvePath(spec), "utf8"),
        readdir(resolvePath(snapshotDirectory(spec))).catch((error) => {
          if (error.code === "ENOENT") return [];
          throw error;
        }),
      ]);
      return { present, source, spec };
    }),
  );
}

/** One line per missing or orphaned image, across every spec and family. */
export function familyFailures(specs, variants) {
  return specs.flatMap(({ present, source, spec }) =>
    variants.flatMap((variant) => [
      ...missingSnapshotFiles(source, variant, present).map(
        (file) => `${variant}: ${snapshotDirectory(spec)}/${file} is missing`,
      ),
      ...orphanSnapshotFiles(source, variant, present).map(
        (file) =>
          `${variant}: ${snapshotDirectory(spec)}/${file} is committed but no screenshot asks for it`,
      ),
    ]),
  );
}
