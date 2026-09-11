import { Buffer } from "node:buffer";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { gzipBytesOf } from "../../bin/lib/consumer-checks.mjs";
import {
  CHUNK,
  createConsumer,
  FEDERATION_REQUEST,
  manifest,
  removeConsumers,
  runCli,
  SHARE_REGISTRATIONS,
  SHARED_NAMES,
  STAMP,
  shared,
} from "./lib/consumer-fixture.mjs";

const REMOTE_GZIP_BYTES = gzipBytesOf([
  Buffer.from(SHARE_REGISTRATIONS),
  Buffer.from(CHUNK),
]);

/** A configuration whose ModuleFederationPlugin shares the published map. */
function pluginConfig(source) {
  return `const { shared } = require("${FEDERATION_REQUEST}");\nmodule.exports = ${source};\n`;
}

afterAll(removeConsumers);

describe("snui-check-consumer", () => {
  it("writes a fixture that matches the manifest it stands in for", () => {
    // The generated source uses literals, so this is what keeps them true.
    expect(Object.keys(shared).sort()).toEqual([...SHARED_NAMES].sort());
    expect(FEDERATION_REQUEST).toBe(`${manifest.name}/federation`);
    expect(STAMP).toBe(manifest.version);
  });

  it("passes a Webpack consumer whose plugin keeps the share map in _options", () => {
    // Webpack 5's ModuleFederationPlugin stores the options it was
    // constructed with on _options, so a check that only read `options` would
    // fail every real consumer.
    const root = createConsumer({
      baseline: { gzipBytes: REMOTE_GZIP_BYTES, maximumIncreasePercent: 0 },
      config: pluginConfig(
        "{ plugins: [{}, { _options: { shared: { ...shared } } }] }",
      ),
      link: ["webpack"],
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
