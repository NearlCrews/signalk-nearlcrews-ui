import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function readJavaScript(directory) {
  const names = await readdir(directory);
  const javascriptNames = names.filter((name) => name.endsWith(".js"));
  const files = await Promise.all(
    javascriptNames.map(async (name) => ({
      name,
      source: await readFile(join(directory, name), "utf8"),
    })),
  );
  return files;
}

async function readStats(directory) {
  const stats = JSON.parse(
    await readFile(join(directory, "stats.json"), "utf8"),
  );
  if (stats.errorsCount !== 0 || stats.warningsCount !== 0) {
    throw new Error(
      `Federation build reported ${stats.errorsCount} errors and ${stats.warningsCount} warnings.`,
    );
  }
  return stats;
}

function collectModuleNames(modules) {
  return modules.flatMap((module) => [
    module.name,
    ...collectModuleNames(module.modules ?? []),
  ]);
}

const classicFiles = await readJavaScript("fixtures/federation/classic/dist");
const esmFiles = await readJavaScript("fixtures/federation/esm/dist");
const classicStats = await readStats("fixtures/federation/classic/dist");
const esmStats = await readStats("fixtures/federation/esm/dist");
const classicRemote = classicFiles.find(
  (file) => file.name === "remoteEntry.js",
);
const esmRemote = esmFiles.find((file) => file.name === "remoteEntry.js");

if (!classicRemote?.source.includes("signalkNearlcrewsUiClassicFixture")) {
  throw new Error(
    "Classic remoteEntry.js does not expose the global container.",
  );
}

if (!esmRemote?.source.includes("export")) {
  throw new Error("ESM remoteEntry.js does not contain module exports.");
}

for (const [format, files, stats] of [
  ["classic", classicFiles, classicStats],
  ["esm", esmFiles, esmStats],
]) {
  const combined = files.map((file) => file.source).join("\n");
  if (!combined.includes("data-snui-version")) {
    throw new Error(`${format} fixture did not bundle the UI package.`);
  }
  for (const marker of [
    "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE",
    "react.production.min",
    "react-dom.production.min",
  ]) {
    if (combined.includes(marker)) {
      throw new Error(`${format} fixture bundled React marker ${marker}.`);
    }
  }

  const moduleNames = collectModuleNames(stats.modules ?? []).filter(
    (name) => typeof name === "string",
  );
  if (!moduleNames.some((name) => name.includes("dist/index.js"))) {
    throw new Error(`${format} fixture did not consume the built package.`);
  }
  if (
    !moduleNames.some((name) =>
      name.startsWith("consume shared module (default) react@"),
    )
  ) {
    throw new Error(`${format} fixture did not consume host-shared React.`);
  }

  const bundledReactModules = moduleNames.filter((name) =>
    /node_modules[\\/]react(?:-dom)?[\\/]/.test(name),
  );
  const unexpectedReactModules = bundledReactModules.filter(
    (name) =>
      !/[\\/]react[\\/]jsx-runtime\.js$/.test(name) &&
      !/[\\/]react[\\/]cjs[\\/]react-jsx-runtime\.production\.js$/.test(name),
  );
  if (unexpectedReactModules.length > 0) {
    throw new Error(
      `${format} fixture bundled unexpected React modules: ${unexpectedReactModules.join(", ")}.`,
    );
  }
}

console.log("Classic and ESM Module Federation fixtures passed.");
