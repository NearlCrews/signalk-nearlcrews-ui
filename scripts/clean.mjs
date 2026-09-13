import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

import { repositoryPath } from "./lib/paths.mjs";

/**
 * The build output and each fixture build. The other generated trees named in
 * .gitignore, coverage, playwright-report, test-results, and packed tarballs,
 * are deliberately left alone: a build runs this script, and a build should not
 * discard the reports of a run that came before it.
 */
const paths = [
  "dist",
  "fixtures/browser/dist",
  "fixtures/federation/classic/dist",
  "fixtures/federation/esm/dist",
];

const removed = await Promise.all(
  paths.map(async (path) => {
    const target = repositoryPath(path);
    const present = existsSync(target);
    await rm(target, { force: true, recursive: true });
    return present;
  }),
);

process.stdout.write(
  `Removed ${removed.filter(Boolean).length} of ${paths.length} generated trees.\n`,
);
