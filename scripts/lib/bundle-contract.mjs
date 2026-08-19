import { basename, extname } from "node:path";

export function assertPublicBundleBudgets(exportsField, entryBudgets) {
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
