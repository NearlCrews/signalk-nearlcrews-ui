import { rm } from "node:fs/promises";

const paths = [
  "dist",
  "fixtures/federation/classic/dist",
  "fixtures/federation/esm/dist",
];

await Promise.all(
  paths.map((path) => rm(path, { force: true, recursive: true })),
);
