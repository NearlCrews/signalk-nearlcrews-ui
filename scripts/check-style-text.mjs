/**
 * Holds the compacted style text in `dist` to the source it came from.
 *
 * The build rewrites the CSS inside `dist/styles/*.js` (see
 * scripts/compact-style-text.mjs), and the unit suite reads `src`, so this is
 * the check that the text a consumer ships says what the source says. Every
 * style module is compiled from `src` with esbuild and compared with the built
 * one twice: as CSS token streams, and after lightningcss normalizes both at
 * the package's browser floor.
 */
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { transform } from "lightningcss";

import { distDirectory, repositoryPath } from "./lib/paths.mjs";
import { styleTextDifferences } from "./lib/style-text.mjs";
import { bulletList } from "./lib/text.mjs";

/** Chromium and Edge 118, the package's browser floor, as lightningcss encodes it. */
const BROWSER_FLOOR = { chrome: 118 << 16 };

const builtManifest = join(distDirectory, "styles", "modules.js");
if (!existsSync(builtManifest)) {
  throw new Error(
    `Run the build before checking style text: ${builtManifest} is missing.`,
  );
}

const compiled = await build({
  bundle: true,
  entryPoints: [repositoryPath("src", "styles", "modules.ts")],
  format: "esm",
  logLevel: "silent",
  platform: "neutral",
  write: false,
});

const workspace = await mkdtemp(join(tmpdir(), "snui-style-text-"));
let sourceModules;
try {
  const sourceManifest = join(workspace, "modules.mjs");
  await writeFile(sourceManifest, compiled.outputFiles[0].contents);
  ({ STYLE_MODULES: sourceModules } = await import(
    pathToFileURL(sourceManifest).href
  ));
} finally {
  await rm(workspace, { force: true, recursive: true });
}
const { STYLE_MODULES: builtModules } = await import(
  pathToFileURL(builtManifest).href
);

const normalize = (styles) =>
  transform({
    code: Buffer.from(styles),
    filename: "module.css",
    minify: true,
    targets: BROWSER_FLOOR,
  }).code.toString();

const failures = styleTextDifferences(sourceModules, builtModules, normalize);
if (failures.length > 0) {
  throw new Error(
    `The built style text does not match the source:\n${bulletList(failures)}\nRebuild with \`npm run build\`; if it still fails, the compaction in scripts/lib/style-text.mjs changed what a sheet means.`,
  );
}

process.stdout.write(
  `Built style text matches the source in all ${String(builtModules.length)} style modules.\n`,
);
