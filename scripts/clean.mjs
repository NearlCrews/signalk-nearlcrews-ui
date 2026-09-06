import { rm } from "node:fs/promises";

import { repositoryPath } from "./lib/paths.mjs";

/** Every generated tree: the build output and each fixture build. */
const paths = [
  "dist",
  "fixtures/browser/dist",
  "fixtures/federation/classic/dist",
  "fixtures/federation/esm/dist",
];

await Promise.all(
  paths.map((path) =>
    rm(repositoryPath(path), { force: true, recursive: true }),
  ),
);
