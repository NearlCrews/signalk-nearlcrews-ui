import { build } from "esbuild";
import { describe, expect, it } from "vitest";

import {
  BUNDLE_BUILD_OPTIONS,
  HOST_EXTERNALS,
} from "../../scripts/lib/bundle-contract.mjs";
import { repositoryPath } from "../../scripts/lib/paths.mjs";

/** Packages a panel remote resolves on its own, beside the ones its host shares. */
const REACT_ARIA_EXTERNALS = [
  "react-aria",
  "react-aria/*",
  "react-aria-components",
  "react-aria-components/*",
  "react-stately",
  "react-stately/*",
];

/**
 * Bundles a module from source the way the size check does, minified and
 * tree shaken, and returns the output text.
 */
async function bundleText(contents) {
  const result = await build({
    ...BUNDLE_BUILD_OPTIONS,
    external: [...HOST_EXTERNALS, ...REACT_ARIA_EXTERNALS],
    format: "esm",
    jsx: "automatic",
    logLevel: "silent",
    stdin: { contents, loader: "tsx", resolveDir: repositoryPath() },
  });
  return result.outputFiles[0]?.text ?? "";
}

/*
 * The defaults table promises that a component importing one group carries
 * that group alone. An initializer esbuild cannot prove free of side effects,
 * such as a template literal with a substitution, keeps its whole group in
 * every bundle that reads any other group from the file.
 */
describe("panel label defaults tree shaking", () => {
  it("keeps one group without the others", async () => {
    const text = await bundleText(
      'import { SAVE_ACTION_BAR_LABEL_DEFAULTS } from "./src/utils/panel-label-defaults.ts";\nexport const labels = SAVE_ACTION_BAR_LABEL_DEFAULTS;\n',
    );

    expect(text).toContain("Nothing to save");
    expect(text).not.toContain("This panel stopped working");
    expect(text).not.toContain("Out of date");
    expect(text).not.toContain("Nothing to show yet");
    expect(text).not.toContain("Browser update required");
  });

  it("leaves the panel error and freshness groups out of a SaveActionBar bundle", async () => {
    const text = await bundleText(
      'export { SaveActionBar } from "./src/components/SaveActionBar.tsx";\n',
    );

    expect(text).toContain("Nothing to save");
    expect(text).not.toContain("This panel stopped working");
    expect(text).not.toContain("Out of date");
  });
});
