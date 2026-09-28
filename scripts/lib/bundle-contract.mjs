import { basename, extname } from "node:path";

/**
 * A React or React DOM module path inside a bundle's inputs. Both are host
 * shares, so a bundle that lists one carries a React copy of its own.
 */
export const BUNDLED_REACT_MODULE = /node_modules[\\/]react(?:-dom)?[\\/]/;

/** The string an exports-map conditions object gives `condition`, if any. */
export function conditionTarget(declaration, condition) {
  return declaration !== null &&
    typeof declaration === "object" &&
    typeof declaration[condition] === "string"
    ? declaration[condition]
    : undefined;
}

/** The specifier a consumer imports an exports-map subpath by. */
export function exportSpecifier(packageName, subpath) {
  return subpath === "." ? packageName : `${packageName}/${subpath.slice(2)}`;
}

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
        : conditionTarget(declaration, "import");
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

/**
 * Entry points that are test tooling rather than panel code: a consumer's
 * browser fixture imports them to load its built remote the way the Admin
 * does, and no panel remote may contain them.
 */
export const TOOLING_ENTRIES = Object.freeze(["host-harness"]);

/**
 * The public JavaScript entry points a panel remote may bundle: every one but
 * the test tooling, as entry name to target.
 */
export function panelJavaScriptEntries(exportsField) {
  return new Map(
    [...publicJavaScriptEntries(exportsField)].filter(
      ([entry]) => !TOOLING_ENTRIES.includes(entry),
    ),
  );
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
