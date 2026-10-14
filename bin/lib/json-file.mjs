import { readFile } from "node:fs/promises";

/**
 * Reads and parses a JSON file. Lives beside the CLI because the published
 * package ships `bin` and not `scripts`; the repository scripts re-export it.
 */
export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
