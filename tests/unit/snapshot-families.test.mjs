import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectSnapshotNames,
  expectedSnapshotFiles,
  familyFailures,
  hostedSnapshotVariants,
  missingSnapshotFiles,
  orphanSnapshotFiles,
  planBaselineCopies,
  readSnapshotSpecs,
  SNAPSHOT_SPECS,
  snapshotDirectory,
  snapshotProject,
  takesScreenshots,
} from "../../scripts/lib/snapshot-families.mjs";

const SPEC = `
await expect(page).toHaveScreenshot("panel-light.png");
await expect(page).toHaveScreenshot('panel-mobile-coarse-light.png', { fullPage: true });
await withActiveSave(page, "panel-light-active.png");
await expect(page).toHaveScreenshot("panel-native-controls-webkit.png");
await expect(page).toHaveScreenshot("panel-light.png");
`;

/** A spec that loops over themes keeps its names in a literal table. */
const LOOPING_SPEC = `
const BASELINES = { Light: \`showcase-light.png\`, Night: 'showcase-night.png' };
await expect(page).toHaveScreenshot(BASELINES[theme]);
`;

describe("visual baseline families", () => {
  it("collects each literal screenshot name once, sorted", () => {
    expect(collectSnapshotNames(SPEC)).toEqual([
      "panel-light-active.png",
      "panel-light.png",
      "panel-mobile-coarse-light.png",
      "panel-native-controls-webkit.png",
    ]);
  });

  it("reads names a looping spec keeps in a table", () => {
    expect(collectSnapshotNames(LOOPING_SPEC)).toEqual([
      "showcase-light.png",
      "showcase-night.png",
    ]);
  });

  it("maps the mobile and WebKit screenshots to their projects", () => {
    expect(snapshotProject("panel-light.png")).toBe("chromium");
    expect(snapshotProject("panel-mobile-coarse-light.png")).toBe(
      "mobile-chromium",
    );
    expect(snapshotProject("panel-native-controls-webkit.png")).toBe("webkit");
  });

  it("refuses a spec it found no literal screenshot name in", () => {
    expect(() =>
      collectSnapshotNames("await expect(page).toHaveScreenshot(name);"),
    ).toThrow("The browser spec declares no literal screenshot names.");
  });

  it("names every file one hosted family needs", () => {
    expect(expectedSnapshotFiles(SPEC, "ubuntu24-x64")).toEqual([
      "panel-light-active-chromium-linux-ubuntu24-x64.png",
      "panel-light-chromium-linux-ubuntu24-x64.png",
      "panel-mobile-coarse-light-mobile-chromium-linux-ubuntu24-x64.png",
      "panel-native-controls-webkit-webkit-linux-ubuntu24-x64.png",
    ]);
  });

  it("reports only the missing files of a family", () => {
    const present = [
      "panel-light-active-chromium-linux-ubuntu24-arm64.png",
      "panel-light-chromium-linux-ubuntu24-arm64.png",
      "panel-light-chromium-linux-local-arm64.png",
    ];
    expect(missingSnapshotFiles(SPEC, "ubuntu24-arm64", present)).toEqual([
      "panel-mobile-coarse-light-mobile-chromium-linux-ubuntu24-arm64.png",
      "panel-native-controls-webkit-webkit-linux-ubuntu24-arm64.png",
    ]);
    expect(
      missingSnapshotFiles(SPEC, "ubuntu24-arm64", [
        ...present,
        "panel-mobile-coarse-light-mobile-chromium-linux-ubuntu24-arm64.png",
        "panel-native-controls-webkit-webkit-linux-ubuntu24-arm64.png",
      ]),
    ).toEqual([]);
  });

  it("reports committed images of the family that no screenshot asks for", () => {
    const present = [
      ...expectedSnapshotFiles(SPEC, "ubuntu24-arm64"),
      "panel-renamed-chromium-linux-ubuntu24-arm64.png",
      "panel-other-family-chromium-linux-ubuntu24-x64.png",
      "panel-light-chromium-linux-local-arm64.png",
    ];

    expect(orphanSnapshotFiles(SPEC, "ubuntu24-arm64", present)).toEqual([
      "panel-renamed-chromium-linux-ubuntu24-arm64.png",
    ]);
    expect(
      orphanSnapshotFiles(
        SPEC,
        "ubuntu24-arm64",
        expectedSnapshotFiles(SPEC, "ubuntu24-arm64"),
      ),
    ).toEqual([]);
  });

  it("reads the hosted families from the CI browser matrix", () => {
    expect(
      hostedSnapshotVariants(
        `  - snapshot_variant: ubuntu24-x64\n  - snapshot_variant: ubuntu24-arm64\n  SNUI_SNAPSHOT_VARIANT: \${{ matrix.snapshot_variant }}\n`,
      ),
    ).toEqual(["ubuntu24-x64", "ubuntu24-arm64"]);
    expect(() => hostedSnapshotVariants("jobs: {}\n")).toThrow(
      "ci.yml declares no snapshot_variant values.",
    );
  });

  it("files each downloaded image by the spec that expects it", () => {
    const specs = new Map([
      ["tests/browser/panel.spec.ts", SPEC],
      ["tests/browser/showcase.spec.ts", LOOPING_SPEC],
    ]);
    expect(
      planBaselineCopies(
        [
          "showcase-night-chromium-linux-ubuntu24-x64.png",
          "panel-light-chromium-linux-ubuntu24-x64.png",
          "panel-light-chromium-linux-ubuntu24-arm64.png",
          "panel-light-chromium-linux-local-arm64.png",
          "renamed-chromium-linux-ubuntu24-x64.png",
        ],
        specs,
        ["ubuntu24-x64"],
      ),
    ).toEqual({
      copies: [
        {
          directory: "tests/browser/panel.spec.ts-snapshots",
          file: "panel-light-chromium-linux-ubuntu24-x64.png",
        },
        {
          directory: "tests/browser/showcase.spec.ts-snapshots",
          file: "showcase-night-chromium-linux-ubuntu24-x64.png",
        },
      ],
      skipped: [
        "panel-light-chromium-linux-local-arm64.png",
        "panel-light-chromium-linux-ubuntu24-arm64.png",
        "renamed-chromium-linux-ubuntu24-x64.png",
      ],
    });
    expect(() =>
      planBaselineCopies(["a.png", "a.png"], specs, ["ubuntu24-x64"]),
    ).toThrow("The download holds a.png more than once.");
  });

  it("names every missing and orphaned image by spec and family", () => {
    const spec = "tests/browser/showcase.spec.ts";
    expect(
      familyFailures(
        [
          {
            present: [
              "showcase-light-chromium-linux-ubuntu24-x64.png",
              "showcase-old-chromium-linux-ubuntu24-x64.png",
            ],
            source: LOOPING_SPEC,
            spec,
          },
        ],
        ["ubuntu24-x64"],
      ),
    ).toEqual([
      `ubuntu24-x64: ${snapshotDirectory(spec)}/showcase-night-chromium-linux-ubuntu24-x64.png is missing`,
      `ubuntu24-x64: ${snapshotDirectory(spec)}/showcase-old-chromium-linux-ubuntu24-x64.png is committed but no screenshot asks for it`,
    ]);
  });

  it("reads every snapshot spec, with no files where a directory is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "snui-families-"));
    try {
      const [panel, showcase] = SNAPSHOT_SPECS;
      mkdirSync(join(root, snapshotDirectory(panel)), { recursive: true });
      writeFileSync(join(root, panel), SPEC);
      writeFileSync(join(root, showcase), LOOPING_SPEC);
      writeFileSync(
        join(
          root,
          snapshotDirectory(panel),
          "panel-light-chromium-linux-ubuntu24-x64.png",
        ),
        "",
      );
      const specs = await readSnapshotSpecs((path) => join(root, path));
      expect(specs).toEqual([
        {
          present: ["panel-light-chromium-linux-ubuntu24-x64.png"],
          source: SPEC,
          spec: panel,
        },
        { present: [], source: LOOPING_SPEC, spec: showcase },
      ]);
      await expect(
        readSnapshotSpecs(() => join(root, "missing", "spec.ts")),
      ).rejects.toThrow(/ENOENT/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("tells a spec that takes screenshots from one that does not", () => {
    expect(takesScreenshots(SPEC)).toBe(true);
    expect(takesScreenshots(LOOPING_SPEC)).toBe(true);
    expect(takesScreenshots("await expect(page).toHaveScreenshot(name);")).toBe(
      true,
    );
    expect(takesScreenshots('await page.goto("/showcase.html");')).toBe(false);
  });
});
