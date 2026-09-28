/**
 * Compares the public type surface against a committed baseline.
 *
 * The published contract is what a consumer can name through the exports
 * map: each entry point's exported names, and every declaration those names
 * reach through the types they use. scripts/lib/public-surface.mjs reads that
 * from the emitted declarations, printed without doc comment prose and with
 * destructured parameters given plain names, keeping only the `@deprecated`
 * and `@default` tags, which change what a consumer's tools do. Any reachable
 * file that augments a global or another module is compared whole. A change
 * to the surface is a public API change, so its diff has to be visible in
 * review rather than reconstructed by hand.
 *
 * A companion check fails when a file an entry reaches exports a name that no
 * entry exports and no public declaration uses: such a name is importable by
 * nobody, so it is either marked `@internal`, which the build strips, or
 * exported from an entry on purpose. A second one fails when a reachable
 * declaration file does not compile, which is what an `@internal` tag on a
 * type a public declaration still uses leaves behind.
 *
 * Run `npm run declarations:update` to accept an intended change.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { assertKnownOptions, readFlag } from "../bin/lib/cli-arguments.mjs";

import {
  DECLARATION_FILE,
  entryDeclarationFiles,
  reachableDeclarations,
  renderSnapshot,
  snapshotDifferences,
} from "./lib/declaration-graph.mjs";
import {
  collectFiles,
  distDirectory,
  readPackageJson,
  repositoryPath,
} from "./lib/paths.mjs";
import { readPublicSurface } from "./lib/public-surface.mjs";
import { bulletList } from "./lib/text.mjs";

const OPTIONS = ["--update"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const baselinePath = repositoryPath("tests", "declarations.baseline.txt");
const shouldUpdate = readFlag(argv, "--update");

function readDeclaration(file) {
  const path = join(distDirectory, ...file.split("/"));
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

const emitted = (
  await collectFiles(distDirectory, {
    matches: (name) => DECLARATION_FILE.test(name),
  })
).map((file) => relative(distDirectory, file).split(sep).join("/"));
if (emitted.length === 0) {
  throw new Error("No declarations found. Run the build first.");
}

const { exports: exportsMap } = await readPackageJson();
const entries = entryDeclarationFiles(exportsMap);
const reachable = reachableDeclarations(entries, readDeclaration);
const { augmentations, declarationErrors, sections, unaccountedExports } =
  readPublicSurface(distDirectory, entries, reachable);
const snapshot = renderSnapshot(sections);
const summary = `${String(sections.size)} sections from ${String(entries.length)} entry points and ${String(reachable.length)} reachable declaration files (${String(augmentations.length)} compared whole, ${String(emitted.length - reachable.length)} private files not read)`;

const declarationFailure =
  declarationErrors.length === 0
    ? undefined
    : "The emitted declarations an entry point reaches do not compile:\n" +
      `${bulletList(declarationErrors)}\n` +
      "A consumer type checking the package's own declarations would see these,\n" +
      "and one that skips that check would get `any` in their place.";

const accountingFailure =
  unaccountedExports.length === 0
    ? undefined
    : "These reachable declaration files export names that no entry point exports\n" +
      "and no public declaration uses, so no consumer can import them:\n" +
      `${bulletList(unaccountedExports)}\n` +
      "Mark each one `@internal` in its source (the build strips those), or\n" +
      "export it from an entry point deliberately.";

if (shouldUpdate) {
  writeFileSync(baselinePath, snapshot);
  process.stdout.write(`Declaration baseline updated: ${summary}.\n`);
  const updateFailures = [declarationFailure, accountingFailure].filter(
    (failure) => failure !== undefined,
  );
  if (updateFailures.length > 0) throw new Error(updateFailures.join("\n\n"));
} else {
  let baseline;
  try {
    baseline = readFileSync(baselinePath, "utf8");
  } catch {
    throw new Error(
      "Missing declaration baseline. Run `npm run declarations:update`.",
    );
  }

  const failures = [];
  if (baseline !== snapshot) {
    const lines = snapshotDifferences(baseline, snapshot).map(
      ({ change, file }) => `${file} (${change})`,
    );
    failures.push(
      "The public type surface differs from the committed baseline:\n" +
        `${bulletList(lines)}\n` +
        "Classify the change under the semantic-versioning policy, record it in\n" +
        "CHANGELOG.md and docs/migration.md, then run `npm run declarations:update`\n" +
        "to accept it. Doc comment prose and destructured parameter names are not\n" +
        "compared, so a change here is one a consumer's compiler or tools can see.",
    );
  }
  if (declarationFailure !== undefined) failures.push(declarationFailure);
  if (accountingFailure !== undefined) failures.push(accountingFailure);
  if (failures.length > 0) throw new Error(failures.join("\n\n"));

  process.stdout.write(`Declarations match the baseline: ${summary}.\n`);
}
