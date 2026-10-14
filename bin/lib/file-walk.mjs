import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Every file under `directory` whose name `matches`, depth first.
 *
 * `skipDirectories` names the directory entries the walk never descends into,
 * by bare name at any depth, and `skipHidden` also skips every entry whose
 * name starts with a dot. Symbolic links are neither followed nor listed, so
 * a link cannot lead the walk out of the tree or around a cycle. Written once
 * because the published command and the repository scripts both walk trees
 * for one kind of file, and a second copy is a second place to teach about a
 * directory that must be skipped. Sibling directories are read together, so
 * the walk costs the depth of the tree rather than its size.
 */
export async function collectFiles(directory, options) {
  const { matches, skipDirectories, skipHidden = false } = options;
  const entries = await readdir(directory, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      if (skipHidden && entry.name.startsWith(".")) return [];
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (skipDirectories?.has(entry.name)) return [];
        return collectFiles(entryPath, options);
      }
      return entry.isFile() && matches(entry.name) ? [entryPath] : [];
    }),
  );
  return found.flat();
}
