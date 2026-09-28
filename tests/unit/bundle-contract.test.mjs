import { describe, expect, it } from "vitest";

import {
  assertPublicBundleBudgets,
  assertPublicCssExport,
  exportSpecifier,
  panelJavaScriptEntries,
  TOOLING_ENTRIES,
} from "../../scripts/lib/bundle-contract.mjs";

const exportsField = {
  ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
  "./forms": {
    import: "./dist/forms.js",
    types: "./dist/forms.d.ts",
  },
  "./tokens.css": "./dist/tokens.css",
};

describe("public bundle contract", () => {
  it("requires an exact budget for every public JavaScript export", () => {
    expect([
      ...assertPublicBundleBudgets(exportsField, { index: 1, forms: 2 }),
    ]).toEqual([
      ["index", "./dist/index.js"],
      ["forms", "./dist/forms.js"],
    ]);
    expect(() => assertPublicBundleBudgets(exportsField, { index: 1 })).toThrow(
      "Bundle budgets cover index, but public JavaScript exports are forms, index.",
    );
    expect(() =>
      assertPublicBundleBudgets(exportsField, {
        index: 1,
        forms: 2,
        overlays: 3,
      }),
    ).toThrow(
      "Bundle budgets cover forms, index, overlays, but public JavaScript exports are forms, index.",
    );
  });

  it("names each export by the specifier a consumer imports it with", () => {
    expect(exportSpecifier("signalk-nearlcrews-ui", ".")).toBe(
      "signalk-nearlcrews-ui",
    );
    expect(exportSpecifier("signalk-nearlcrews-ui", "./forms")).toBe(
      "signalk-nearlcrews-ui/forms",
    );
  });

  it("requires the public token stylesheet target", () => {
    expect(() =>
      assertPublicCssExport(exportsField, "./dist/tokens.css"),
    ).not.toThrow();
    expect(() =>
      assertPublicCssExport(
        { ...exportsField, "./tokens.css": "./dist/other.css" },
        "./dist/tokens.css",
      ),
    ).toThrow("The public tokens.css export must target ./dist/tokens.css.");
  });

  it("requires canonical dist targets", () => {
    expect(() =>
      assertPublicBundleBudgets(
        {
          ...exportsField,
          "./forms": {
            import: "./nested/forms.js",
            types: "./dist/forms.d.ts",
          },
        },
        { index: 1, forms: 2 },
      ),
    ).toThrow(
      "Public export ./forms targets ./nested/forms.js; expected ./dist/forms.js.",
    );
  });

  it("requires budgets for direct-string JavaScript exports", () => {
    const directStringExports = {
      ...exportsField,
      "./new": "./dist/new.js",
    };

    expect(() =>
      assertPublicBundleBudgets(directStringExports, {
        index: 1,
        forms: 2,
      }),
    ).toThrow(
      "Bundle budgets cover forms, index, but public JavaScript exports are forms, index, new.",
    );
    expect([
      ...assertPublicBundleBudgets(directStringExports, {
        index: 1,
        forms: 2,
        new: 3,
      }),
    ]).toContainEqual(["new", "./dist/new.js"]);
  });

  it("keeps the test tooling entries out of what a panel may bundle", () => {
    expect(TOOLING_ENTRIES).toEqual(["host-harness"]);
    expect([
      ...panelJavaScriptEntries({
        ...exportsField,
        "./host-harness": {
          import: "./dist/host-harness.js",
          types: "./dist/host-harness.d.ts",
        },
      }),
    ]).toEqual([
      ["index", "./dist/index.js"],
      ["forms", "./dist/forms.js"],
    ]);
  });
});
