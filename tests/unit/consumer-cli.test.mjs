import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

import { afterAll, describe, expect, it } from "vitest";

import {
  encodeRequiredVersion,
  gzipBytesOf,
} from "../../bin/lib/consumer-checks.mjs";
import { renderFederationEntry } from "../../scripts/lib/federation-share.mjs";
import { repositoryPath } from "../../scripts/lib/paths.mjs";

const manifest = createRequire(import.meta.url)("../../package.json");
const CLI = repositoryPath("bin", "snui-check-consumer.mjs");
const { cjs: FEDERATION_ENTRY, shared } = renderFederationEntry(
  manifest.peerDependencies,
  manifest.version,
);

/*
 * The share registrations Webpack 5 minifies into a remote entry. Every value
 * interpolated into this source goes through JSON.stringify, which is what
 * makes it a literal rather than more code, even though these particular
 * values come from the package manifest.
 */
const REMOTE_ENTRY = `var l={${Object.entries(shared)
  .map(
    ([name, share], index) =>
      `${String(90 + index)}:()=>s("default",${JSON.stringify(name)},!1,${encodeRequiredVersion(share.requiredVersion)})`,
  )
  .join(",")}};`;

/** The chunk the library lands in, carrying the PanelRoot version stamp. */
const CHUNK = `jsx("div",{"data-snui-root":"","data-snui-version":${JSON.stringify(manifest.version)}});`;

const REMOTE_GZIP_BYTES = gzipBytesOf([
  Buffer.from(REMOTE_ENTRY),
  Buffer.from(CHUNK),
]);

/** A configuration whose ModuleFederationPlugin shares the published map. */
function pluginConfig(source) {
  const entry = JSON.stringify(`${manifest.name}/federation`);
  return `const { shared } = require(${entry});\nmodule.exports = ${source};\n`;
}

const workspaces = [];

afterAll(() => {
  for (const workspace of workspaces) {
    rmSync(workspace, { force: true, recursive: true });
  }
});

/**
 * A consumer directory as `npm ci` leaves one: the published manifest and
 * federation entry under node_modules, an exact pin beside them, and a built
 * remote to check.
 */
function createConsumer({
  baseline,
  config,
  configName = "webpack.config.cjs",
  linkWebpack = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "snui-consumer-"));
  workspaces.push(root);

  const installed = join(root, "node_modules", manifest.name);
  mkdirSync(join(installed, "dist"), { recursive: true });
  writeFileSync(join(installed, "package.json"), JSON.stringify(manifest));
  writeFileSync(join(installed, "dist", "federation.cjs"), FEDERATION_ENTRY);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer-fixture",
      private: true,
      devDependencies: { [manifest.name]: manifest.version },
    }),
  );

  const remoteDirectory = join(root, "public");
  mkdirSync(remoteDirectory);
  writeFileSync(join(remoteDirectory, "remoteEntry.js"), REMOTE_ENTRY);
  writeFileSync(join(remoteDirectory, "main.chunk.js"), CHUNK);

  if (config !== undefined) {
    const configPath = join(root, configName);
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, config);
  }
  if (linkWebpack) {
    symlinkSync(
      repositoryPath("node_modules", "webpack"),
      join(root, "node_modules", "webpack"),
      "junction",
    );
  }
  if (baseline !== undefined) {
    writeFileSync(join(root, "size-baseline.json"), JSON.stringify(baseline));
  }
  return root;
}

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

describe("snui-check-consumer", () => {
  it("passes a Webpack consumer whose plugin keeps the share map in _options", () => {
    // Webpack 5's ModuleFederationPlugin stores the options it was
    // constructed with on _options, so a check that only read `options` would
    // fail every real consumer.
    const root = createConsumer({
      baseline: { gzipBytes: REMOTE_GZIP_BYTES, maximumIncreasePercent: 0 },
      config: pluginConfig(
        "{ plugins: [{}, { _options: { shared: { ...shared } } }] }",
      ),
      linkWebpack: true,
    });

    const result = runCli(
      "--root",
      root,
      "--remote",
      "public/remoteEntry.js",
      "--baseline",
      "size-baseline.json",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      `${manifest.name} ${manifest.version} consumer check passed`,
    );
    expect(result.stdout).toContain("Webpack configuration shares match");
    expect(result.stdout).toContain(
      `${String(REMOTE_GZIP_BYTES)} gzip bytes, within 0% of the ${String(REMOTE_GZIP_BYTES)}-byte baseline`,
    );
  });

  it("awaits a function-form configuration named by --webpack-config", () => {
    // The configuration is called the way Webpack calls it, so a consumer
    // that branches on the mode sees the production branch.
    const root = createConsumer({
      config: pluginConfig(
        `async (environment, argv) => {
  if (argv.mode !== "production") throw new Error("Expected the production mode.");
  return { plugins: [{ options: { shared: { ...shared } } }] };
}`,
      ),
      configName: join("build", "webpack.config.cjs"),
    });

    const result = runCli(
      "--root",
      root,
      "--remote",
      "public/remoteEntry.js",
      "--webpack-config",
      join("build", "webpack.config.cjs"),
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Webpack configuration shares match");
  });

  it("discovers webpack.config.js and walks an array of configurations", () => {
    const root = createConsumer({
      config: pluginConfig(
        "[{ plugins: [] }, { plugins: [{ options: { shared: { ...shared } } }] }]",
      ),
      configName: "webpack.config.js",
    });

    const result = runCli(
      "--root",
      root,
      "--remote",
      join(root, "public", "remoteEntry.js"),
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Webpack configuration shares match");
  });

  it("checks the built remote alone when the consumer ships no configuration", () => {
    const root = createConsumer();

    const result = runCli("--root", root, "--remote", "public/remoteEntry.js");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain("Webpack configuration");
  });

  it("fails when the configuration drifts from the published share map", () => {
    const root = createConsumer({
      config: pluginConfig(
        "{ plugins: [{ options: { shared: { ...shared, react: { ...shared.react, strictVersion: true } } } }] }",
      ),
    });

    const result = runCli("--root", root, "--remote", "public/remoteEntry.js");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Spread `shared` from signalk-nearlcrews-ui/federation",
    );
  });

  it("requires both the consumer root and the built remote", () => {
    const result = runCli("--remote", "public/remoteEntry.js");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Usage: snui-check-consumer");
  });

  it("rejects a following flag where a path belongs", () => {
    const result = runCli("--root", "--remote", "public/remoteEntry.js");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--root requires a path.");
  });
});
