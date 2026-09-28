/**
 * Compacts the CSS text inside the compiled style modules, as the build's
 * last step on `dist/styles`.
 *
 * It runs inside `npm run build`, never at pack time, so the `dist` the
 * browser suite and the federation fixtures test is the one that ships: two
 * copies of one package version must carry identical style text, because
 * `installStyleModule` refuses a second copy whose text differs. The two
 * modules that hold template literals for messages rather than CSS are left
 * alone. See scripts/lib/style-text.mjs for what is rewritten and why.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { distDirectory } from "./lib/paths.mjs";
import {
  applyEdits,
  NON_STYLE_MODULES,
  remapSourceMap,
  styleTextEdits,
} from "./lib/style-text.mjs";

const stylesDirectory = join(distDirectory, "styles");
const modules = (await readdir(stylesDirectory))
  .filter((name) => name.endsWith(".js") && !NON_STYLE_MODULES.has(name))
  .sort();
if (modules.length === 0) {
  throw new Error(
    `Run the compiler first: ${stylesDirectory} holds no modules.`,
  );
}

let before = 0;
let after = 0;
await Promise.all(
  modules.map(async (name) => {
    const path = join(stylesDirectory, name);
    const mapPath = `${path}.map`;
    const [source, map] = await Promise.all([
      readFile(path, "utf8"),
      readFile(mapPath, "utf8").then(JSON.parse),
    ]);
    const edits = styleTextEdits(source, path);
    const compacted = applyEdits(source, edits);
    before += source.length;
    after += compacted.length;
    if (edits.length === 0) return;
    await Promise.all([
      writeFile(path, compacted),
      writeFile(mapPath, JSON.stringify(remapSourceMap(map, source, edits))),
    ]);
  }),
);

process.stdout.write(
  `Compacted the style text in ${String(modules.length)} dist/styles modules: ${String(before)} to ${String(after)} characters.\n`,
);
