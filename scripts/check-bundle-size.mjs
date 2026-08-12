import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const { FEDERATION_SHARED } = createRequire(import.meta.url)(
  "../fixtures/federation/shared.cjs",
);

/** Host-shared modules and their subpaths stay outside every bundle. */
const hostExternals = Object.keys(FEDERATION_SHARED).flatMap((name) => [
  name,
  `${name}/*`,
]);

const entryBudgets = {
  composites: 8 * 1024,
  "data-grid": 76 * 1024,
  forms: 24 * 1024,
  index: 26 * 1024,
  overlays: 60 * 1024,
};

for (const [entry, maximumGzipBytes] of Object.entries(entryBudgets)) {
  const result = await build({
    entryPoints: [`dist/${entry}.js`],
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

  const source = Buffer.from(output).toString("utf8");
  for (const marker of [
    "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
    "react.production.min",
    "react-dom.production.min",
  ]) {
    if (source.includes(marker)) {
      throw new Error(`${entry} contains a React runtime marker: ${marker}`);
    }
  }

  console.log(`${entry} bundle is ${gzipBytes} gzip bytes.`);
}

// The token stylesheet is shipped as-is, so it gets the same kind of gate the
// JavaScript entry points have. It grows with every token added.
const TOKENS_CSS_GZIP_BUDGET = 2 * 1024;
const tokensGzipBytes = gzipSync(await readFile("dist/tokens.css"), {
  level: 9,
}).byteLength;

if (tokensGzipBytes > TOKENS_CSS_GZIP_BUDGET) {
  throw new Error(
    `tokens.css is ${tokensGzipBytes} gzip bytes, above the ${TOKENS_CSS_GZIP_BUDGET} byte budget.`,
  );
}

console.log(`tokens.css is ${tokensGzipBytes} gzip bytes.`);
