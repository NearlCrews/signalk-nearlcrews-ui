import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { repositoryPath } from "../../scripts/lib/paths.mjs";

const SOURCE_ROOT = repositoryPath("src");
const ENTRY = join(SOURCE_ROOT, "format.ts");

/** Every specifier the module imports or re-exports from, bare ones included. */
function specifiers(source) {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
    ([, specifier]) => specifier,
  );
}

/**
 * Resolves one relative specifier to the file on disk. The package writes
 * `.js` in its own imports, which the compiler maps back to the TypeScript
 * source beside it, and a `.tsx` module answers the same specifier.
 */
async function resolveModule(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`]) {
    try {
      return { file: candidate, source: await readFile(candidate, "utf8") };
    } catch {
      // Try the other extension before giving up on the specifier.
    }
  }
  throw new Error(
    `${relative(SOURCE_ROOT, fromFile)} imports ${specifier}, which resolves to no file.`,
  );
}

/** Every source file the entry reaches, and every bare package it names. */
async function walkGraph(entry) {
  const visited = new Set();
  const packages = new Set();
  // Each module travels with the source resolveModule already read for it.
  const queue = [{ file: entry, source: await readFile(entry, "utf8") }];

  while (queue.length > 0) {
    const { file, source } = queue.pop();
    if (visited.has(file)) continue;
    visited.add(file);

    for (const specifier of specifiers(source)) {
      if (!specifier.startsWith(".")) {
        packages.add(specifier);
        continue;
      }
      queue.push(await resolveModule(file, specifier));
    }
  }

  return { packages, visited };
}

describe("the React-free formatting entry", () => {
  it("reaches no React anywhere in its module graph", async () => {
    const { packages, visited } = await walkGraph(ENTRY);

    // A worker, a service worker, and a plain Node script all import this
    // entry, and pulling React in for a string formatter would cost them the
    // whole runtime for nothing.
    expect([...packages].sort()).toEqual([]);
    expect(visited.size).toBeGreaterThan(1);
  });

  it("exports the pure helpers the components format with", async () => {
    const entry = await import("../../src/format.js");

    expect(Object.keys(entry).sort()).toEqual([
      "REACHABILITY_STATUS",
      "RELATIVE_AGE_EN",
      "RELATIVE_AGE_NARROW",
      "formatCount",
      "formatRelativeAge",
      "formatRelativeAgeSince",
      "joinList",
      "resolveFreshness",
      "resolveReachability",
    ]);
  });
});
