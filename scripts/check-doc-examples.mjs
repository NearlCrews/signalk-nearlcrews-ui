/**
 * Compiles every `tsx` example in the consumer documentation against the
 * PACKED declarations, the way a consumer copying it would.
 *
 * A validation run does not need this entry: scripts/check-consumer-types.mjs
 * compiles the examples in the workspace it packs for the consumer fixture,
 * so the package is packed once. This entry packs on its own, for trying the
 * check on its own or against a document written to fail: documents named on
 * the command line replace README.md and docs/migration.md.
 *
 * tests/unit/doc-examples.test.tsx renders the same examples and fails on a
 * console warning; this is the compile half (scripts/lib/doc-example-compile.mjs).
 */
import { existsSync } from "node:fs";

import {
  compileDocExamples,
  readDocExamples,
} from "./lib/doc-example-compile.mjs";
import { createPackedWorkspace } from "./lib/packed-workspace.mjs";
import { repositoryPath } from "./lib/paths.mjs";

if (!existsSync(repositoryPath("dist", "index.d.ts"))) {
  throw new Error("Run the build before checking the documentation examples.");
}

const examples = readDocExamples(
  process.argv.length > 2 ? process.argv.slice(2) : undefined,
);
const packed = await createPackedWorkspace("snui-doc-examples-");

try {
  process.stdout.write(`${compileDocExamples(packed, examples)}\n`);
} finally {
  packed.dispose();
}
