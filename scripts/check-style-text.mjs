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
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { transform } from "lightningcss";

import { distDirectory, repositoryPath } from "./lib/paths.mjs";
import { importFromSource } from "./lib/source-module.mjs";
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

const { STYLE_MODULES: sourceModules } = await importFromSource({
  entryPoints: [repositoryPath("src", "styles", "modules.ts")],
});
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
