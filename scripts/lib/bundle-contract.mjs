import { basename, extname } from "node:path";

/**
 * The published JavaScript entry points, as entry name to target, derived from
 * the exports map so no reader keeps its own list. Every check that asks which
 * entries the package ships asks here: a hand-kept copy is how the entry added
 * in a release goes unverified.
 */
export function publicJavaScriptEntries(exportsField) {
  if (exportsField === null || typeof exportsField !== "object") {
    throw new Error("package.json exports must be an object.");
  }

  const exportedEntries = new Map();
  for (const [subpath, declaration] of Object.entries(exportsField)) {
    const importTarget =
      typeof declaration === "string"
        ? declaration
        : declaration !== null &&
            typeof declaration === "object" &&
            typeof declaration.import === "string"
          ? declaration.import
          : undefined;
    if (importTarget === undefined || extname(importTarget) !== ".js") {
      continue;
    }

    const expectedEntry =
      subpath === "." ? "index" : subpath.replace(/^\.\//, "");
    const expectedTarget = `./dist/${expectedEntry}.js`;
    const actualEntry = basename(importTarget, ".js");
    if (actualEntry !== expectedEntry || importTarget !== expectedTarget) {
      throw new Error(
        `Public export ${subpath} targets ${importTarget}; expected ${expectedTarget}.`,
      );
    }
    exportedEntries.set(expectedEntry, importTarget);
  }

  return exportedEntries;
}

export function assertPublicBundleBudgets(exportsField, entryBudgets) {
  const exportedEntries = publicJavaScriptEntries(exportsField);

  const budgetNames = Object.keys(entryBudgets).sort();
  const exportNames = [...exportedEntries.keys()].sort();
  if (budgetNames.join() !== exportNames.join()) {
    throw new Error(
      `Bundle budgets cover ${budgetNames.join(", ")}, but public JavaScript exports are ${exportNames.join(", ")}.`,
    );
  }

  return exportedEntries;
}

export function assertPublicCssExport(exportsField, expectedTarget) {
  if (exportsField?.["./tokens.css"] !== expectedTarget) {
    throw new Error(
      `The public tokens.css export must target ${expectedTarget}.`,
    );
  }
}
