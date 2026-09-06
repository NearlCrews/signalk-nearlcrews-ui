import { describe, expect, it } from "vitest";

import {
  collectSnapshotNames,
  expectedSnapshotFiles,
  FAMILY_PROJECTS,
  hostedSnapshotVariants,
  missingSnapshotFiles,
  snapshotProject,
} from "../../scripts/lib/snapshot-families.mjs";

const SPEC = `
await expect(page).toHaveScreenshot("panel-light.png");
await expect(page).toHaveScreenshot('panel-mobile-light.png', { fullPage: true });
await withActiveSave(page, "panel-light-active.png");
await expect(page).toHaveScreenshot("panel-native-controls-webkit.png");
await expect(page).toHaveScreenshot("panel-light.png");
const notASnapshot = "panel-other.png";
`;

describe("visual baseline families", () => {
  it("collects each literal screenshot name once, sorted", () => {
    expect(collectSnapshotNames(SPEC)).toEqual([
      "panel-light-active.png",
      "panel-light.png",
      "panel-mobile-light.png",
      "panel-native-controls-webkit.png",
    ]);
  });

  it("maps the mobile and WebKit screenshots to their projects", () => {
    expect(snapshotProject("panel-light.png")).toBe("chromium");
    expect(snapshotProject("panel-mobile-light.png")).toBe("mobile-chromium");
    expect(snapshotProject("panel-native-controls-webkit.png")).toBe("webkit");
    expect([...FAMILY_PROJECTS]).toEqual([
      "chromium",
      "mobile-chromium",
      "webkit",
    ]);
  });

  it("names every file one hosted family needs", () => {
    expect(expectedSnapshotFiles(SPEC, "ubuntu24-x64")).toEqual([
      "panel-light-active-chromium-linux-ubuntu24-x64.png",
      "panel-light-chromium-linux-ubuntu24-x64.png",
      "panel-mobile-light-mobile-chromium-linux-ubuntu24-x64.png",
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
      "panel-mobile-light-mobile-chromium-linux-ubuntu24-arm64.png",
      "panel-native-controls-webkit-webkit-linux-ubuntu24-arm64.png",
    ]);
    expect(
      missingSnapshotFiles(SPEC, "ubuntu24-arm64", [
        ...present,
        "panel-mobile-light-mobile-chromium-linux-ubuntu24-arm64.png",
        "panel-native-controls-webkit-webkit-linux-ubuntu24-arm64.png",
      ]),
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
});
