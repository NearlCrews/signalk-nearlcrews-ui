/**
 * Compares the emitted public declarations against a committed baseline.
 *
 * The published contract of this package is the `.d.ts` output a consumer can
 * reach: the entry declaration named by each `exports` target and everything
 * those files import or re-export, transitively. A change to any of them is a
 * public API change even when no source signature looks different, so the
 * diff has to be visible in review rather than reconstructed by hand. Emitted
 * declaration files that no entry reaches are private modules; they are
 * counted but not compared.
 *
 * Run `npm run declarations:update` to accept an intended change.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  describeSnapshotDifference,
  entryDeclarationFiles,
  reachableDeclarations,
  renderDeclarationSnapshot,
} from "./lib/declaration-graph.mjs";
import {
  distDirectory,
  readPackageJson,
  repositoryPath,
} from "./lib/paths.mjs";

const baselinePath = repositoryPath("tests", "declarations.baseline.txt");
const shouldUpdate = process.argv.includes("--update");

function collectDeclarations(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...collectDeclarations(entryPath));
    else if (/\.d\.[cm]?ts$/.test(entry.name)) found.push(entryPath);
  }
  return found;
}

function readDeclaration(file) {
  const path = join(distDirectory, ...file.split("/"));
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

const emitted = collectDeclarations(distDirectory)
  .map((file) => relative(distDirectory, file).split(sep).join("/"))
  .sort();
if (emitted.length === 0) {
  throw new Error("No declarations found. Run the build first.");
}

const { exports: exportsMap } = await readPackageJson();
const entries = entryDeclarationFiles(exportsMap);
const reachable = reachableDeclarations(entries, readDeclaration);
const privateCount = emitted.filter((file) => !reachable.includes(file)).length;
const snapshot = renderDeclarationSnapshot(reachable, readDeclaration);
const summary = `${String(reachable.length)} public declaration files reachable from ${String(entries.length)} entry points (${String(privateCount)} private files not compared)`;

if (shouldUpdate) {
  writeFileSync(baselinePath, snapshot);
  process.stdout.write(`Declaration baseline updated: ${summary}.\n`);
} else {
  let baseline;
  try {
    baseline = readFileSync(baselinePath, "utf8");
  } catch {
    throw new Error(
      "Missing declaration baseline. Run `npm run declarations:update`.",
    );
  }

  if (baseline !== snapshot) {
    // A file the baseline held that is still emitted but no longer reachable
    // left the public contract without disappearing: a private change.
    const differences = describeSnapshotDifference(baseline, snapshot).map(
      (difference) => {
        const file = difference.replace(/ \(removed\)$/, "");
        return difference.endsWith(" (removed)") && emitted.includes(file)
          ? `${file} (left the public contract: still emitted, no longer reachable from an entry)`
          : difference;
      },
    );
    const publicDifferences = differences.filter(
      (difference) => !difference.includes("left the public contract"),
    );
    throw new Error(
      "Emitted public declarations differ from the committed baseline.\n" +
        (publicDifferences.length > 0
          ? "These files are reachable from the package entry points, so this is a\npublic API change:\n"
          : "No reachable file changed; the baseline only stops covering files that\nbecame private:\n") +
        `${differences.map((difference) => `- ${difference}`).join("\n")}\n` +
        `Private declaration files (${String(privateCount)} not reachable from any entry) are not\n` +
        "part of the contract and are not compared. Classify any public change\n" +
        "under the semantic-versioning policy, record it in CHANGELOG.md and\n" +
        "docs/migration.md, then run `npm run declarations:update` to accept it.",
    );
  }

  process.stdout.write(`Declarations match the baseline: ${summary}.\n`);
}
