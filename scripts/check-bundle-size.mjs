import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const result = await build({
  entryPoints: ["dist/index.js"],
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "es2022",
  treeShaking: true,
  write: false,
  metafile: true,
  external: ["react", "react/jsx-runtime"],
});

const output = result.outputFiles[0]?.contents;
if (output === undefined) {
  throw new Error("esbuild did not produce a bundled artifact.");
}

const bundledReactInputs = Object.keys(result.metafile.inputs).filter((input) =>
  /node_modules[\\/]react(?:-dom)?[\\/]/.test(input),
);
if (bundledReactInputs.length > 0) {
  throw new Error(
    `Bundle structurally contains React inputs: ${bundledReactInputs.join(", ")}.`,
  );
}

const gzipBytes = gzipSync(output, { level: 9 }).byteLength;
const maximumGzipBytes = 24 * 1024;

if (gzipBytes > maximumGzipBytes) {
  throw new Error(
    `Bundle is ${gzipBytes} gzip bytes, above the ${maximumGzipBytes} byte budget.`,
  );
}

const source = Buffer.from(output).toString("utf8");
for (const marker of [
  "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
  "react.production.min",
  "react-dom.production.min",
]) {
  if (source.includes(marker)) {
    throw new Error(`Bundle contains a React runtime marker: ${marker}`);
  }
}

console.log(`Browser bundle is ${gzipBytes} gzip bytes.`);
