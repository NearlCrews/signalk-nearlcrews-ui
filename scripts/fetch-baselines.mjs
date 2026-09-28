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
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { collectFiles, repositoryPath } from "./lib/paths.mjs";
import { CI_WORKFLOW_PATH } from "./lib/release-checks.mjs";
import {
  familyFailures,
  hostedSnapshotVariants,
  planBaselineCopies,
  readSnapshotSpecs,
} from "./lib/snapshot-families.mjs";
import { bulletList } from "./lib/text.mjs";

const [runId, ...extra] = process.argv.slice(2);
if (runId === undefined || extra.length > 0 || !/^\d+$/.test(runId)) {
  throw new Error(
    "Usage: npm run baselines:fetch -- <run-id>, where <run-id> is the numeric id of an Update visual baselines run.",
  );
}

const variants = hostedSnapshotVariants(
  await readFile(repositoryPath(CI_WORKFLOW_PATH), "utf8"),
);
const specs = await readSnapshotSpecs(repositoryPath);
const specSources = new Map(specs.map(({ source, spec }) => [spec, source]));
const download = await mkdtemp(join(tmpdir(), "snui-baselines-"));
try {
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
    for (const { directory: target, file } of copies) {
      await mkdir(repositoryPath(target), { recursive: true });
      await copyFile(byName.get(file), repositoryPath(target, file));
    }
    process.stdout.write(
      `Copied ${String(copies.length)} ${variant} baseline images from run ${runId}.\n`,
    );
  }
} finally {
  await rm(download, { force: true, recursive: true });
}

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
