/**
 * Compares the Signal K server functions this package builds on with the
 * hashes recorded in tests/host-loader.baseline.json.
 *
 * By default it reads the latest Signal K release from GitHub, which needs the
 * network, so it runs from the weekly host contract workflow rather than from
 * validate. `--tag <tag>` reads another release, `--source <dir>` reads a local
 * checkout instead, and `--update` records what it read as the new baseline
 * once a reviewer has rechecked the facts a moved hash names.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertKnownOptions,
  readFlag,
  readOption,
} from "../bin/lib/cli-arguments.mjs";
import { fetchJson, fetchOk } from "./lib/github-releases.mjs";
import {
  compareLoaderHashes,
  LOADER_FACTS,
  latestSignalKReleaseTag,
  readLoaderSources,
  SIGNALK_REPOSITORY,
} from "./lib/host-loader.mjs";
import { repositoryPath } from "./lib/paths.mjs";

const argv = process.argv.slice(2);
assertKnownOptions(argv, ["--baseline", "--source", "--tag", "--update"]);
const baselinePath = resolve(
  readOption(argv, "--baseline", "a path") ??
    repositoryPath("tests", "host-loader.baseline.json"),
);
const sourceOption = readOption(argv, "--source", "a directory");
const tagOption = readOption(argv, "--tag", "a tag");
const shouldUpdate = readFlag(argv, "--update");
if (sourceOption !== undefined && tagOption !== undefined) {
  throw new Error("Choose either --source or --tag, not both.");
}

const token = process.env.GITHUB_TOKEN;
const tag =
  sourceOption === undefined
    ? (tagOption ?? (await latestSignalKReleaseTag({ fetchJson, token })))
    : "local checkout";
const hashes = await readLoaderSources({
  fetchText: async (url) => (await fetchOk(url)).text(),
  source: sourceOption === undefined ? undefined : resolve(sourceOption),
  tag,
});

if (shouldUpdate) {
  await writeFile(
    baselinePath,
    `${JSON.stringify({ hashes, repository: SIGNALK_REPOSITORY, tag }, undefined, 2)}\n`,
  );
  process.stdout.write(`Host loader baseline recorded at ${tag}.\n`);
} else {
  let baseline;
  try {
    baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  } catch (cause) {
    throw new Error(
      "Missing or unreadable host loader baseline. Run `npm run host-contract:loader:update`.",
      { cause },
    );
  }
  const moved = compareLoaderHashes(baseline.hashes ?? {}, hashes);
  if (moved.length > 0) {
    const details = LOADER_FACTS.filter(({ name }) => moved.includes(name))
      .map(
        ({ facts, file, name }) =>
          `- ${name} (${file}): recheck that ${facts}.`,
      )
      .join("\n");
    throw new Error(
      `The Signal K loader code at ${tag} differs from the baseline recorded at ${baseline.tag}:\n${details}\nOnce the facts hold, or the package follows the change, run \`npm run host-contract:loader:update\`.`,
    );
  }
  process.stdout.write(
    `Signal K loader at ${tag} unchanged since the baseline recorded at ${baseline.tag}: ${LOADER_FACTS.length} watched functions.\n`,
  );
}
