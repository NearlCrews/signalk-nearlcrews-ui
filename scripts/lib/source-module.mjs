/**
 * Loads a module straight from `src`, so a check can read what the package
 * exports without a build.
 */
import { build } from "esbuild";

/**
 * Bundles the entry `buildOptions` names, an `entryPoints` list or a `stdin`
 * block, and imports the result. The bundle carries everything it imports, so
 * it loads from a data URL and nothing is written to disk.
 */
export async function importFromSource(buildOptions) {
  const compiled = await build({
    ...buildOptions,
    bundle: true,
    format: "esm",
    logLevel: "silent",
    platform: "neutral",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString("base64")}`
  );
}
