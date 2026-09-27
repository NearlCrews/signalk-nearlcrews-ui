import { readFile } from "node:fs/promises";
import { build } from "esbuild";

import { assertKnownOptions, readFlag } from "../bin/lib/cli-arguments.mjs";
import {
  assertNoReactRuntime,
  gzipBytesOf,
} from "../bin/lib/consumer-checks.mjs";
import {
  assertPublicBundleBudgets,
  assertPublicCssExport,
  BUNDLED_REACT_MODULE,
} from "./lib/bundle-contract.mjs";
import { SIGNALK_HOST_SHARED_MODULES } from "./lib/federation-share.mjs";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";
import {
  assertRecordedSize,
  budgetFor,
  formatSizeTable,
  parseSizeTable,
  SIZE_TABLE_DOCUMENT,
} from "./lib/size-table.mjs";

/** Host-shared modules and their subpaths stay outside every bundle. */
const hostExternals = SIGNALK_HOST_SHARED_MODULES.flatMap((name) => [
  name,
  `${name}/*`,
]);

/**
 * `--table` prints the Markdown table docs/api-reference.md carries, for a
 * release that refreshes it. It measures and reports rather than enforcing,
 * because the numbers it prints are the ones the enforcing run compares
 * against, and the release diff is where the new numbers get reviewed.
 */
const OPTIONS = ["--table"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const printTable = readFlag(argv, "--table");

/*
 * Each entry is measured bundled alone, so a component's own style module
 * counts against the entry that exports it, and the install machinery counts
 * against every entry that reaches it. A consumer bundles the root entry
 * beside its focused ones and pays for both once.
 *
 * The recorded sizes and the budgets they imply are the committed table in
 * docs/api-reference.md, so the documented numbers cannot drift away from the
 * measured ones and no budget is written by hand.
 */
const manifest = await readPackageJson();
const recordedSizes = parseSizeTable(
  manifest.name,
  await readFile(repositoryPath(SIZE_TABLE_DOCUMENT), "utf8"),
);

const TOKENS_CSS_ENTRY = "tokens.css";
const entryBudgets = Object.fromEntries(
  [...recordedSizes]
    .filter(([entry]) => entry !== TOKENS_CSS_ENTRY)
    .map(([entry, { budgetBytes }]) => [entry, budgetBytes]),
);

const publicEntries = assertPublicBundleBudgets(manifest.exports, entryBudgets);

/** How every bundle is built, the stylesheet included, as a consumer would ship it. */
const BUILD_OPTIONS = Object.freeze({
  bundle: true,
  metafile: true,
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
});

/**
 * The one output file of a bundle. A sidecar output, a stylesheet from a
 * future asset import for example, would leave its bytes out of the
 * measurement and out of the React scan.
 */
function onlyOutputFile(result, label) {
  if (result.outputFiles.length !== 1) {
    throw new Error(
      `esbuild produced ${String(result.outputFiles.length)} output files for the ${label} bundle; expected exactly one.`,
    );
  }
  return result.outputFiles[0];
}

/** One measured entry, gzipped and checked against everything it must satisfy. */
async function measureEntry(entry, entryTarget) {
  const result = await build({
    ...BUILD_OPTIONS,
    entryPoints: [repositoryPath(entryTarget)],
    external: hostExternals,
    format: "esm",
    treeShaking: true,
  });
  const outputFile = onlyOutputFile(result, entry);

  const bundledReactInputs = Object.keys(result.metafile.inputs).filter(
    (input) => BUNDLED_REACT_MODULE.test(input),
  );
  if (bundledReactInputs.length > 0) {
    throw new Error(
      `${entry} structurally contains React inputs: ${bundledReactInputs.join(", ")}.`,
    );
  }

  assertNoReactRuntime(outputFile.text, `The ${entry} entry`);

  return gzipBytesOf([outputFile.contents]);
}

const tableRows = [];

/**
 * Holds one measurement to its budget and, outside `--table`, to the recorded
 * size, then adds its row to the table a release prints.
 */
function checkMeasurement(entry, recorded, gzipBytes) {
  if (gzipBytes > recorded.budgetBytes) {
    throw new Error(
      `${entry} is ${String(gzipBytes)} gzip bytes, above the ${String(recorded.budgetBytes)} byte budget.`,
    );
  }
  if (!printTable) assertRecordedSize(entry, recorded.gzipBytes, gzipBytes);
  tableRows.push({ budgetBytes: budgetFor(gzipBytes), entry, gzipBytes });
}

// The public token stylesheet must stay framework-neutral. Bundling the public
// export catches imported script or React inputs in addition to measuring its
// actual standalone consumer output.
const tokensTarget = "./dist/tokens.css";
const recordedTokens = recordedSizes.get(TOKENS_CSS_ENTRY);
if (recordedTokens === undefined) {
  throw new Error(
    `${SIZE_TABLE_DOCUMENT} records no size for ${TOKENS_CSS_ENTRY}.`,
  );
}
assertPublicCssExport(manifest.exports, tokensTarget);

// Every bundle is independent of every other, the stylesheet included, so they
// build together rather than one after another; Promise.all keeps the table in
// the order the entries were listed.
const [measuredEntries, tokensResult] = await Promise.all([
  Promise.all(
    [...publicEntries].map(async ([entry, entryTarget]) => ({
      entry,
      gzipBytes: await measureEntry(entry, entryTarget),
    })),
  ),
  build({ ...BUILD_OPTIONS, entryPoints: [repositoryPath(tokensTarget)] }),
]);

// assertPublicBundleBudgets matched every public entry to a budget row, so each
// one has a recorded size.
for (const { entry, gzipBytes } of measuredEntries) {
  checkMeasurement(entry, recordedSizes.get(entry), gzipBytes);
  process.stdout.write(`${entry} bundle is ${String(gzipBytes)} gzip bytes.\n`);
}

const tokensOutputFile = onlyOutputFile(tokensResult, TOKENS_CSS_ENTRY);

const tokensScriptInputs = Object.keys(tokensResult.metafile.inputs).filter(
  (input) => /(?:^|[\\/])react(?:-dom)?(?:[\\/]|$)|\.[cm]?[jt]sx?$/.test(input),
);
if (tokensScriptInputs.length > 0) {
  throw new Error(
    `tokens.css contains script or React inputs: ${tokensScriptInputs.join(", ")}.`,
  );
}

const tokensGzipBytes = gzipBytesOf([tokensOutputFile.contents]);
checkMeasurement(TOKENS_CSS_ENTRY, recordedTokens, tokensGzipBytes);
process.stdout.write(`tokens.css is ${String(tokensGzipBytes)} gzip bytes.\n`);

if (printTable) {
  process.stdout.write(`\n${formatSizeTable(manifest.name, tableRows)}\n`);
}
