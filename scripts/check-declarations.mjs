/**
 * Compares the emitted declarations against a committed baseline.
 *
 * The published contract of this package is its `.d.ts` output. A declaration
 * change is a public API change even when no source signature looks different,
 * so the diff has to be visible in review rather than reconstructed by hand.
 *
 * Run `npm run declarations:update` to accept an intended change.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = join(repositoryRoot, "dist");
const baselinePath = join(repositoryRoot, "tests", "declarations.baseline.txt");
const shouldUpdate = process.argv.includes("--update");

function collectDeclarations(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...collectDeclarations(entryPath));
    else if (entry.name.endsWith(".d.ts")) found.push(entryPath);
  }
  return found;
}

const files = collectDeclarations(distDirectory).sort();
if (files.length === 0) {
  throw new Error("No declarations found. Run the build first.");
}

const snapshot = files
  .map((file) => {
    const name = relative(distDirectory, file).split(sep).join("/");
    return `=== ${name} ===\n${readFileSync(file, "utf8").trimEnd()}\n`;
  })
  .join("\n");

if (shouldUpdate) {
  writeFileSync(baselinePath, snapshot);
  process.stdout.write(
    `Declaration baseline updated for ${String(files.length)} files.\n`,
  );
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
    throw new Error(
      "Emitted declarations differ from the committed baseline.\n" +
        "This is a public API change. Classify it under the semantic-versioning\n" +
        "policy, record it in CHANGELOG.md and docs/migration.md, then run\n" +
        "`npm run declarations:update` to accept it.",
    );
  }

  process.stdout.write(
    `Declarations match the baseline for ${String(files.length)} files.\n`,
  );
}
