/**
 * Downloads the hosted visual baselines a refresh run produced and files them.
 *
 *   npm run baselines:fetch -- <run-id>
 *
 * The run id is the "Update visual baselines" workflow run to take the images
 * from. Each family's artifact is downloaded with the GitHub CLI into a
 * temporary directory, and only the files a snapshot spec expects for that
 * family are copied into the spec's snapshot directory, so a misnamed or
 * local image, or the other family's committed copy, cannot enter a family.
 * The family check then runs over the result, and `git status` shows what
 * changed.
 */
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { assertKnownOptions } from "../bin/lib/cli-arguments.mjs";
import {
  collectFiles,
  repositoryPath,
  withTemporaryDirectory,
} from "./lib/paths.mjs";
import { CI_WORKFLOW_PATH } from "./lib/release-checks.mjs";
import {
  familyFailures,
  hostedSnapshotVariants,
  planBaselineCopies,
  readSnapshotSpecs,
} from "./lib/snapshot-families.mjs";
import { bulletList } from "./lib/text.mjs";

const USAGE =
  "Usage: npm run baselines:fetch -- <run-id>, where <run-id> is the numeric id of an Update visual baselines run.";

const argv = process.argv.slice(2);
// This script takes no options, so every flag-shaped argument is a mistake.
assertKnownOptions(
  argv.filter((argument) => argument.startsWith("--")),
  [],
  { hint: `\n${USAGE}` },
);
const [runId, ...extra] = argv;
if (runId === undefined || extra.length > 0 || !/^\d+$/.test(runId)) {
  throw new Error(USAGE);
}

try {
  execFileSync("gh", ["--version"], { stdio: "ignore" });
} catch (cause) {
  throw new Error(
    "The GitHub CLI (gh) is required to download a run's artifacts. Install it from https://cli.github.com and run `gh auth login`.",
    { cause },
  );
}

const variants = hostedSnapshotVariants(
  await readFile(repositoryPath(CI_WORKFLOW_PATH), "utf8"),
);
const specs = await readSnapshotSpecs(repositoryPath);
const specSources = new Map(specs.map(({ source, spec }) => [spec, source]));

// Every family is downloaded and planned before any image is copied, so a
// failed download of a later family leaves the checkout as it was.
await withTemporaryDirectory("snui-baselines-", async (download) => {
  const plans = [];
  for (const variant of variants) {
    // Each artifact is a checkout's snapshot directories, so it also carries
    // the other family's committed images; only this family's are taken.
    const directory = join(download, variant);
    execFileSync(
      "gh",
      [
        "run",
        "download",
        runId,
        "--name",
        `baselines-${variant}`,
        "--dir",
        directory,
      ],
      { stdio: "inherit" },
    );
    const downloaded = await collectFiles(directory, {
      matches: (name) => name.endsWith(".png"),
    });
    const byName = new Map(downloaded.map((path) => [basename(path), path]));
    const { copies } = planBaselineCopies(
      downloaded.map((path) => basename(path)),
      specSources,
      [variant],
    );
    plans.push({ byName, copies, variant });
  }
  // The temporary directory goes when this callback returns, so the images
  // are copied into the checkout before it does.
  for (const { byName, copies, variant } of plans) {
    for (const { directory: target, file } of copies) {
      await mkdir(repositoryPath(target), { recursive: true });
      await copyFile(byName.get(file), repositoryPath(target, file));
    }
    process.stdout.write(
      `Copied ${String(copies.length)} ${variant} baseline images from run ${runId}.\n`,
    );
  }
});
const failures = familyFailures(
  await readSnapshotSpecs(repositoryPath),
  variants,
);
if (failures.length > 0) {
  throw new Error(
    `The fetched families are not complete:\n${bulletList(failures)}`,
  );
}
process.stdout.write(
  `Visual baseline families complete: ${variants.join(", ")}. Review the images with git status and git diff before committing.\n`,
);
