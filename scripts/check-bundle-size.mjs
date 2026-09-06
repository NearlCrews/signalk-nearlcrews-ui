import { gzipSync } from "node:zlib";
import { build } from "esbuild";

import { assertNoReactRuntime } from "../bin/lib/consumer-checks.mjs";
import {
  assertPublicBundleBudgets,
  assertPublicCssExport,
} from "./lib/bundle-contract.mjs";
import { SIGNALK_HOST_SHARED_MODULES } from "./lib/federation-share.mjs";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";
import { formatSizeTable } from "./lib/size-table.mjs";

/** Host-shared modules and their subpaths stay outside every bundle. */
const hostExternals = SIGNALK_HOST_SHARED_MODULES.flatMap((name) => [
  name,
  `${name}/*`,
]);

/** `--table` also prints the Markdown table docs/api-reference.md carries. */
const printTable = process.argv.includes("--table");

const entryBudgets = {
  composites: 15 * 1024,
  "data-grid": 82 * 1024,
  forms: 24 * 1024,
  index: 32 * 1024,
  overlays: 66 * 1024,
};

const manifest = await readPackageJson();
const publicEntries = assertPublicBundleBudgets(manifest.exports, entryBudgets);
const tableRows = [];

for (const [entry, entryTarget] of publicEntries) {
  const maximumGzipBytes = entryBudgets[entry];
  const result = await build({
    entryPoints: [repositoryPath(entryTarget)],
    bundle: true,
    format: "esm",
    minify: true,
    platform: "browser",
    target: "es2022",
    treeShaking: true,
    write: false,
    metafile: true,
    external: hostExternals,
  });

  const output = result.outputFiles[0]?.contents;
  if (output === undefined) {
    throw new Error(`esbuild did not produce the ${entry} bundle.`);
  }

  const bundledReactInputs = Object.keys(result.metafile.inputs).filter(
    (input) => /node_modules[\\/]react(?:-dom)?[\\/]/.test(input),
  );
  if (bundledReactInputs.length > 0) {
    throw new Error(
      `${entry} structurally contains React inputs: ${bundledReactInputs.join(", ")}.`,
    );
  }

  const gzipBytes = gzipSync(output, { level: 9 }).byteLength;
  if (gzipBytes > maximumGzipBytes) {
    throw new Error(
      `${entry} is ${gzipBytes} gzip bytes, above the ${maximumGzipBytes} byte budget.`,
    );
  }

  assertNoReactRuntime(
    Buffer.from(output).toString("utf8"),
    `The ${entry} entry`,
  );

  tableRows.push({ budgetBytes: maximumGzipBytes, entry, gzipBytes });
  console.log(`${entry} bundle is ${gzipBytes} gzip bytes.`);
}

// The public token stylesheet must stay framework-neutral. Bundling the public
// export catches imported script or React inputs in addition to measuring its
// actual standalone consumer output.
const TOKENS_CSS_GZIP_BUDGET = 2 * 1024;
const tokensTarget = "./dist/tokens.css";
assertPublicCssExport(manifest.exports, tokensTarget);
const tokensResult = await build({
  entryPoints: [repositoryPath(tokensTarget)],
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
  metafile: true,
});
const tokensOutput = tokensResult.outputFiles[0]?.contents;
if (tokensOutput === undefined) {
  throw new Error("esbuild did not produce the tokens.css bundle.");
}

const tokensScriptInputs = Object.keys(tokensResult.metafile.inputs).filter(
  (input) => /(?:^|[\\/])react(?:-dom)?(?:[\\/]|$)|\.[cm]?[jt]sx?$/.test(input),
);
if (tokensScriptInputs.length > 0) {
  throw new Error(
    `tokens.css contains script or React inputs: ${tokensScriptInputs.join(", ")}.`,
  );
}

const tokensGzipBytes = gzipSync(tokensOutput, { level: 9 }).byteLength;

if (tokensGzipBytes > TOKENS_CSS_GZIP_BUDGET) {
  throw new Error(
    `tokens.css is ${tokensGzipBytes} gzip bytes, above the ${TOKENS_CSS_GZIP_BUDGET} byte budget.`,
  );
}

tableRows.push({
  budgetBytes: TOKENS_CSS_GZIP_BUDGET,
  entry: "tokens.css",
  gzipBytes: tokensGzipBytes,
});
console.log(`tokens.css is ${tokensGzipBytes} gzip bytes.`);

if (printTable) {
  console.log(`\n${formatSizeTable(manifest.name, tableRows)}`);
}
