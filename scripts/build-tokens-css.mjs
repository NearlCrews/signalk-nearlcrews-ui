/**
 * Emits dist/tokens.css, the framework-neutral half of the design tokens.
 *
 * React is not every panel's tool of choice, and a Signal K configuration panel
 * written without it still has to match the palette. This sheet is rendered
 * from the same source as the React styles, so the two cannot drift.
 *
 * It reads the generator from `dist` rather than `src`, so the emitted CSS
 * comes from the same compiled code that ships and no TypeScript loader enters
 * the build chain. That is a deliberate coupling to the emitted layout, which
 * `tsconfig.build.json` fixes through `rootDir`; a build restructure has to
 * update the import below.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { distDirectory } from "./lib/paths.mjs";

const generatorPath = join(distDirectory, "styles", "tokens.js");
const versionPath = join(distDirectory, "version.js");
for (const required of [generatorPath, versionPath]) {
  if (!existsSync(required)) {
    throw new Error(
      `Run the build before emitting the token stylesheet: ${required} is missing.`,
    );
  }
}

// pathToFileURL rather than a "file://" prefix: a checkout path containing a
// character the URL parser claims, "#" or "?" most of all, would otherwise
// truncate the specifier and fail as a missing module.
const { renderTokenStyles, TOKENS_ROOT_CLASS } = await import(
  pathToFileURL(generatorPath).href
);
const { PACKAGE_VERSION } = await import(pathToFileURL(versionPath).href);

const header = `/*
 * signalk-nearlcrews-ui ${PACKAGE_VERSION} design tokens.
 *
 * Generated from the package source. Do not edit.
 * Usage and guarantees: see "Tokens without React" in the package README.
 */`;

const styles = `${header}\n${renderTokenStyles(`.${TOKENS_ROOT_CLASS}`).trimStart()}`;

await writeFile(join(distDirectory, "tokens.css"), styles);

process.stdout.write(`Wrote dist/tokens.css for .${TOKENS_ROOT_CLASS}.\n`);
