/**
 * Reads the module graph Webpack records in its JSON stats and asserts what
 * the built files cannot show: which React files the remote bundled, and how
 * many copies of each package that must be a single instance.
 *
 * The marker scan in consumer-checks.mjs catches a bundled React runtime by
 * the strings it carries. The graph is the stricter view: it names every
 * module Webpack bundled, whether or not it carries a marker, and it tells two
 * copies of React Aria apart, which a nested install produces and which splits
 * the context the in-root portal and the locale provider rely on, so every
 * overlay throws.
 */
import { PACKAGE_NAME } from "./consumer-checks.mjs";

/**
 * The React files a panel may bundle: the production JSX runtime, which the
 * automatic JSX transform imports and the share map does not cover.
 */
const ALLOWED_REACT_FILES = Object.freeze([
  "jsx-runtime.js",
  "cjs/react-jsx-runtime.production.js",
]);

/** Packages of which nothing may be bundled: the host owns them. */
const HOST_OWNED_PACKAGES = Object.freeze(["react-dom", "scheduler"]);

/**
 * Packages that must be bundled at most once. React Aria 1.21 ships as the
 * `react-aria`, `react-aria-components`, and `react-stately` packages plus the
 * `@internationalized` scope; the older scoped packages are listed so a
 * dependency that still pulls one in is held to the same rule.
 */
const SINGLE_INSTANCE_PACKAGE =
  /^(?:react-aria|react-aria-components|react-stately|signalk-nearlcrews-ui|@internationalized\/[\w.-]+|@react-aria\/[\w.-]+|@react-stately\/[\w.-]+)$/;

const NODE_MODULES = "node_modules/";

/**
 * The path Webpack records for a module: `nameForCondition`, the resolved
 * file, when the stats carry it, and otherwise the readable name with its
 * concatenation suffix removed. Both are normalized to forward slashes.
 */
function modulePathOf(record) {
  const path =
    typeof record.nameForCondition === "string"
      ? record.nameForCondition
      : typeof record.name === "string"
        ? record.name.replace(/ \+ \d+ modules?$/, "")
        : undefined;
  return path?.replaceAll("\\", "/");
}

/**
 * Every module path in the stats: top-level modules, the modules Webpack
 * concatenated into them, grouped modules, and the modules of child
 * compilations.
 */
export function collectModulePaths(stats) {
  const paths = [];
  const visitModules = (records) => {
    for (const record of records ?? []) {
      if (record === null || typeof record !== "object") continue;
      // A module record, as opposed to a group of modules.
      if (record.type === undefined || record.type === "module") {
        const path = modulePathOf(record);
        if (path !== undefined) paths.push(path);
      }
      visitModules(record.modules);
      visitModules(record.children);
    }
  };
  // A compilation's own name, such as a child compiler's, is not a module.
  const visitCompilation = (compilation) => {
    if (compilation === null || typeof compilation !== "object") return;
    visitModules(compilation.modules);
    for (const child of compilation.children ?? []) visitCompilation(child);
  };
  visitCompilation(stats);
  return paths;
}

/**
 * The package a module path belongs to, by its last `node_modules` segment,
 * with the package root (the path up to and including the package name) and
 * the file's path inside the package. Undefined for a path outside every
 * `node_modules`.
 */
export function packageOf(path) {
  const index = path.lastIndexOf(NODE_MODULES);
  if (index === -1) return undefined;
  const parts = path.slice(index + NODE_MODULES.length).split("/");
  const nameParts = parts[0].startsWith("@") ? 2 : 1;
  const name = parts.slice(0, nameParts).join("/");
  return {
    file: parts.slice(nameParts).join("/"),
    name,
    root: path.slice(0, index + NODE_MODULES.length) + name,
  };
}

/** The error count the stats record, or undefined when they carry none. */
function errorCountOf(stats) {
  if (Number.isInteger(stats?.errorsCount)) return stats.errorsCount;
  if (Array.isArray(stats?.errors)) return stats.errors.length;
  return undefined;
}

/**
 * Asserts the module graph a Webpack stats file records. Returns the number of
 * module paths it read, for the summary.
 */
export function assertModuleGraph(stats) {
  const errors = errorCountOf(stats);
  if (errors === undefined) {
    throw new Error(
      "The Webpack stats carry no errorsCount and no errors list. Emit them with webpack --json, or with stats.toJson({ errors: true, modules: true, nestedModules: true }).",
    );
  }
  if (errors > 0) {
    throw new Error(
      `The Webpack stats record ${errors === 1 ? "1 build error" : `${errors} build errors`}, so the remote beside them is not the build it claims to be.`,
    );
  }

  const paths = collectModulePaths(stats);
  if (paths.length === 0) {
    throw new Error(
      "The Webpack stats record no modules. Emit them with webpack --json, or with stats.toJson({ modules: true, nestedModules: true }), so nested and concatenated modules are listed.",
    );
  }

  const roots = new Map();
  const reactFiles = new Set();
  const hostOwned = new Set();
  for (const path of paths) {
    const owner = packageOf(path);
    if (owner === undefined) continue;
    if (owner.name === "react") {
      if (!ALLOWED_REACT_FILES.includes(owner.file)) reactFiles.add(path);
    } else if (HOST_OWNED_PACKAGES.includes(owner.name)) {
      hostOwned.add(path);
    }
    if (SINGLE_INSTANCE_PACKAGE.test(owner.name)) {
      const known = roots.get(owner.name) ?? new Set();
      known.add(owner.root);
      roots.set(owner.name, known);
    }
  }

  if (reactFiles.size > 0) {
    throw new Error(
      `The remote bundled React modules other than the production JSX runtime: ${[...reactFiles].join(", ")}. React is a host share, so the remote must take it from the share scope.`,
    );
  }
  if (hostOwned.size > 0) {
    throw new Error(
      `The remote bundled modules the Signal K Admin host owns: ${[...hostOwned].join(", ")}. The host renders the panel with its own React DOM.`,
    );
  }
  if (!roots.has(PACKAGE_NAME)) {
    throw new Error(
      `The Webpack stats list no module from ${PACKAGE_NAME}, so the remote did not bundle it, or the stats describe another build.`,
    );
  }
  for (const [name, packageRoots] of roots) {
    if (packageRoots.size > 1) {
      throw new Error(
        `The remote bundled ${packageRoots.size} copies of ${name}: ${[...packageRoots].join(", ")}. Two copies split the React context the package's portal and locale providers share, so every overlay throws; deduplicate the install.`,
      );
    }
  }
  return paths.length;
}
