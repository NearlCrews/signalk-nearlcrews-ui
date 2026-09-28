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
  exportSpecifier,
  publicJavaScriptEntries,
} from "./lib/bundle-contract.mjs";
import { SIGNALK_HOST_SHARED_MODULES } from "./lib/federation-share.mjs";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";
import {
  assertRecordedSize,
  assertWithinBudget,
  CONSUMER_PANEL_ENTRY,
  CONSUMER_PANEL_FIXTURE,
  formatSizeTable,
  parseSizeTable,
  SIZE_TABLE_DOCUMENT,
  tableBudget,
} from "./lib/size-table.mjs";

/** Host-shared modules and their subpaths stay outside every bundle. */
const hostExternals = SIGNALK_HOST_SHARED_MODULES.flatMap((name) => [
  name,
  `${name}/*`,
]);

/**
 * `--table` prints the Markdown table docs/api-reference.md carries, for a
 * release that refreshes it. It measures and reports rather than comparing
 * with the recorded sizes, because the numbers it prints become the recorded
 * ones, and the release diff is where they get reviewed. It carries every
 * budget forward unchanged and still fails a row over its budget: a budget is
 * raised by hand. `--tighten` additionally lowers each budget a shrunken
 * measurement leaves slack under, and never raises one.
 */
const OPTIONS = ["--table", "--tighten"];
const argv = process.argv.slice(2);
assertKnownOptions(argv, OPTIONS);

const printTable = readFlag(argv, "--table");
const tighten = readFlag(argv, "--tighten");
if (tighten && !printTable) {
  throw new Error(
    "--tighten only changes the table --table prints; pass both.",
  );
}

/*
 * Each entry is measured bundled alone, so a component's own style module
 * counts against the entry that exports it, and the install machinery counts
 * against every entry that reaches it. A consumer bundles the root entry
 * beside its focused ones and pays for both once, which the consumer-shaped
 * panel row measures directly.
 *
 * The recorded sizes and their budgets are the committed table in
 * docs/api-reference.md, so the documented numbers cannot drift away from the
 * measured ones.
 */
const manifest = await readPackageJson();
const recordedSizes = parseSizeTable(
  manifest.name,
  await readFile(repositoryPath(SIZE_TABLE_DOCUMENT), "utf8"),
);

const TOKENS_CSS_ENTRY = "tokens.css";
/** Rows that measure something other than one JavaScript entry point. */
const NON_ENTRY_ROWS = new Set([TOKENS_CSS_ENTRY, CONSUMER_PANEL_ENTRY]);
const entryBudgets = Object.fromEntries(
  [...recordedSizes]
    .filter(([entry]) => !NON_ENTRY_ROWS.has(entry))
    .map(([entry, { budgetBytes }]) => [entry, budgetBytes]),
);

// A refreshed table may add the row of an entry point the release adds, so
// only the enforcing run requires a budget row for every public entry.
const publicEntries = printTable
  ? publicJavaScriptEntries(manifest.exports)
  : assertPublicBundleBudgets(manifest.exports, entryBudgets);

/**
 * Resolves the package's own specifiers to the built entry files the exports
 * map names, so the consumer-shaped fixture imports the package exactly as a
 * consumer does and measures `dist`, not `src`.
 */
const packageSelfReference = {
  name: "package-self-reference",
  setup(pluginBuild) {
    const targets = new Map(
      [...publicEntries].map(([entry, target]) => [
        exportSpecifier(manifest.name, entry === "index" ? "." : `./${entry}`),
        repositoryPath(target),
      ]),
    );
    pluginBuild.onResolve({ filter: /^[^./]/ }, ({ path }) => {
      const target = targets.get(path);
      return target === undefined ? undefined : { path: target };
    });
  },
};

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

/** One measured bundle, gzipped and checked against everything it must satisfy. */
async function measureEntry(entry, entryTarget, plugins = []) {
  const result = await build({
    ...BUILD_OPTIONS,
    entryPoints: [repositoryPath(entryTarget)],
    external: hostExternals,
    format: "esm",
    plugins,
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
function checkMeasurement(entry, gzipBytes) {
  const recorded = recordedSizes.get(entry);
  const budgetBytes = printTable
    ? tableBudget(recorded, gzipBytes, { tighten })
    : recorded.budgetBytes;
  assertWithinBudget(entry, budgetBytes, gzipBytes);
  if (!printTable) assertRecordedSize(entry, recorded.gzipBytes, gzipBytes);
  tableRows.push({ budgetBytes, entry, gzipBytes });
}

// The public token stylesheet must stay framework-neutral. Bundling the public
// export catches imported script or React inputs in addition to measuring its
// actual standalone consumer output.
const tokensTarget = "./dist/tokens.css";
for (const entry of NON_ENTRY_ROWS) {
  if (!printTable && !recordedSizes.has(entry)) {
    throw new Error(`${SIZE_TABLE_DOCUMENT} records no size for ${entry}.`);
  }
}
assertPublicCssExport(manifest.exports, tokensTarget);

// Every bundle is independent of every other, the stylesheet included, so they
// build together rather than one after another; Promise.all keeps the table in
// the order the entries were listed.
const [measuredEntries, consumerPanelGzipBytes, tokensResult] =
  await Promise.all([
    Promise.all(
      [...publicEntries].map(async ([entry, entryTarget]) => ({
        entry,
        gzipBytes: await measureEntry(entry, entryTarget),
      })),
    ),
    measureEntry(CONSUMER_PANEL_ENTRY, CONSUMER_PANEL_FIXTURE, [
      packageSelfReference,
    ]),
    build({ ...BUILD_OPTIONS, entryPoints: [repositoryPath(tokensTarget)] }),
  ]);

for (const { entry, gzipBytes } of measuredEntries) {
  checkMeasurement(entry, gzipBytes);
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
checkMeasurement(TOKENS_CSS_ENTRY, tokensGzipBytes);
process.stdout.write(`tokens.css is ${String(tokensGzipBytes)} gzip bytes.\n`);

checkMeasurement(CONSUMER_PANEL_ENTRY, consumerPanelGzipBytes);
process.stdout.write(
  `The consumer-shaped panel (${CONSUMER_PANEL_FIXTURE}) is ${String(consumerPanelGzipBytes)} gzip bytes.\n`,
);

if (printTable) {
  process.stdout.write(`\n${formatSizeTable(manifest.name, tableRows)}\n`);
}
