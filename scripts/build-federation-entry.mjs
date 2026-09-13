/**
 * Writes dist/federation.cjs and dist/federation.d.cts, the
 * `signalk-nearlcrews-ui/federation` entry point, from the peer dependencies
 * in package.json. Runs as part of `npm run build` after the TypeScript emit.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderFederationEntry } from "./lib/federation-share.mjs";
import { distDirectory, readPackageJson } from "./lib/paths.mjs";

const { peerDependencies, version } = await readPackageJson();
const { cjs, dts } = renderFederationEntry(peerDependencies, version);

await mkdir(distDirectory, { recursive: true });
await Promise.all([
  writeFile(join(distDirectory, "federation.cjs"), cjs),
  writeFile(join(distDirectory, "federation.d.cts"), dts),
]);

process.stdout.write("Wrote dist/federation.cjs and dist/federation.d.cts.\n");
