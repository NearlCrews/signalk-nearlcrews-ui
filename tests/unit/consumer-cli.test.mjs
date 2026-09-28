import { Buffer } from "node:buffer";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { gzipBytesOf } from "../../bin/lib/consumer-checks.mjs";
import {
  CHUNK,
  CLASSIC_ENTRY,
  CONTAINER_RUNTIME,
  checkConsumer,
  createConsumer,
  EXPOSES,
  FEDERATION_REQUEST,
  MODULE_ENTRY,
  manifest,
  removeConsumers,
  runCli,
  SHARE_REGISTRATIONS,
  SHARED_NAMES,
  STAMP,
  shared,
} from "./lib/consumer-fixture.mjs";

const REMOTE_GZIP_BYTES = gzipBytesOf([
  Buffer.from(CHUNK),
  Buffer.from(CLASSIC_ENTRY),
]);
const ENTRY_GZIP_BYTES = gzipBytesOf([Buffer.from(CLASSIC_ENTRY)]);

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

    const result = checkConsumer(root, "--baseline", "size-baseline.json");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      `${manifest.name} ${manifest.version} consumer check passed`,
    );
    expect(result.stdout).toContain("Webpack configuration shares match");
    expect(result.stdout).toContain(
      `${String(REMOTE_GZIP_BYTES)} gzip bytes, within 0% of the ${String(REMOTE_GZIP_BYTES)}-byte baseline, remote entry ${String(ENTRY_GZIP_BYTES)} gzip bytes of them`,
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

    const result = checkConsumer(
      root,
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

    const result = checkConsumer(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain("Webpack configuration");
  });

  it("fails when the configuration drifts from the published share map", () => {
    const root = createConsumer({
      config: pluginConfig(
        "{ plugins: [{ options: { shared: { ...shared, react: { ...shared.react, strictVersion: true } } } }] }",
      ),
    });

    const result = checkConsumer(root);

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

describe("snui-check-consumer and the Signal K Admin loader", () => {
  it("names the container and the remote format it proved", () => {
    const result = checkConsumer(createConsumer());

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "classic remote assigning window.consumer_fixture",
    );
    expect(result.stdout).toContain(
      `remote entry ${String(ENTRY_GZIP_BYTES)} gzip bytes`,
    );
  });

  it("requires the keyword the server mounts configuration panels by", () => {
    const root = createConsumer({ manifest: { keywords: ["signalk-webapp"] } });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "package.json keywords do not include signalk-plugin-configurator",
    );
  });

  it("requires the entry where the server serves it from", () => {
    const root = createConsumer({
      files: { "dist/remoteEntry.js": CLASSIC_ENTRY },
    });

    const result = runCli("--root", root, "--remote", "dist/remoteEntry.js");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "--remote points at dist/remoteEntry.js, but the Signal K server serves /<package>/ from the package's public/ directory",
    );
  });

  it("proves a classic entry assigns the global the Admin reads", () => {
    const root = createConsumer({ name: "other-consumer" });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "remoteEntry.js did not assign a container with get and init to window.other_consumer",
    );
    const overridden = checkConsumer(root, "--container", "consumer_fixture");
    expect(overridden.status, overridden.stderr).toBe(0);
    expect(overridden.stdout).toContain(
      "classic remote assigning window.consumer_fixture",
    );
  });

  it("refuses a module entry in a package the server loads as classic", () => {
    const root = createConsumer({
      assets: { "main.chunk.js": CHUNK, "remoteEntry.js": MODULE_ENTRY },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'remoteEntry.js is an ES module, but package.json does not set "type": "module"',
    );
  });

  it("passes a module entry that exports get and init in a module package", () => {
    const root = createConsumer({
      assets: { "main.chunk.js": CHUNK, "remoteEntry.js": MODULE_ENTRY },
      manifest: { type: "module" },
    });

    const result = checkConsumer(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("module remote exporting get and init");
    expect(checkConsumer(root, "--container", "x").stderr).toContain(
      "--container names the global a classic container assigns itself to",
    );
  });

  it("refuses a classic entry in a package the server loads as a module", () => {
    // The guard three consumers wrote by hand, `includes("export")`, passes
    // this entry: webpack's own `.exports` carries the word.
    const root = createConsumer({
      assets: {
        "main.chunk.js": CHUNK,
        "remoteEntry.js": `${CLASSIC_ENTRY}module.exports=consumer_fixture;`,
      },
      manifest: { type: "module" },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'package.json sets "type": "module", so the Signal K server writes a <script type="module"> tag for remoteEntry.js',
    );
    expect(result.stderr).toContain("This remoteEntry.js exports nothing");
  });

  it("requires the module the Admin asks every configurator for", () => {
    const root = createConsumer({
      assets: {
        "main.chunk.js": CHUNK,
        "remoteEntry.js": CLASSIC_ENTRY.replace(
          "./PluginConfigurationPanel",
          "./AppPanel",
        ),
      },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "remoteEntry.js exposes no ./PluginConfigurationPanel module.",
    );
  });

  it("names the bundler it supports rather than blaming the share map", () => {
    const root = createConsumer({
      assets: {
        "main.chunk.js": CHUNK,
        "remoteEntry.js": CLASSIC_ENTRY.replace(CONTAINER_RUNTIME, ""),
      },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "remoteEntry.js carries no Webpack Module Federation container runtime.",
    );
    expect(result.stderr).not.toContain("consumes host shares");
  });

  it("keeps the library out of the entry the Admin loads on every page", () => {
    const root = createConsumer({
      assets: { "remoteEntry.js": `${CLASSIC_ENTRY}${CHUNK}` },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "remoteEntry.js carries the data-snui-version stamp, so the library is inside the remote entry itself.",
    );
  });

  it("refuses a remote that bundled the host harness", () => {
    const root = createConsumer({
      assets: {
        "main.chunk.js": `${CHUNK}var frame={"data-snui-host-harness":""};`,
        "remoteEntry.js": CLASSIC_ENTRY,
      },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The built remote bundled signalk-nearlcrews-ui/host-harness: main.chunk.js contains data-snui-host-harness.",
    );
  });
});

describe("snui-check-consumer dependency placement", () => {
  it("refuses the package in dependencies or optionalDependencies", () => {
    for (const pinField of ["dependencies", "optionalDependencies"]) {
      const result = checkConsumer(createConsumer({ pinField }));

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        `package.json declares signalk-nearlcrews-ui in ${pinField}. The panel remote bundles it, so it belongs in devDependencies`,
      );
    }
  });

  it("accepts a runtime placement on request and says what it costs", () => {
    const root = createConsumer({ pinField: "dependencies" });

    const result = checkConsumer(root, "--runtime-dependency");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "exact pin as a runtime dependency (every App Store install fetches signalk-nearlcrews-ui, React Aria, and, because npm installs peer dependencies, React and React DOM into the Signal K server's node_modules)",
    );
  });
});

describe("snui-check-consumer package names in CSS", () => {
  it("passes public tokens, documented hooks, and the panel container", () => {
    const root = createConsumer({
      assets: {
        "main.chunk.js": CHUNK,
        "main.css": `.row{gap:var(--snui-space-2);scroll-margin-block-end:var(--snui-sticky-clearance)}@container snui-panel (width<=32rem){.row{color:var(--snui-color-text-muted)}}`,
        "remoteEntry.js": CLASSIC_ENTRY,
      },
    });

    const result = checkConsumer(root);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("package names in 1 CSS file");
  });

  it("names every unknown, renamed, or misspelled package name", () => {
    const root = createConsumer({
      assets: {
        "main.chunk.js": CHUNK,
        "main.css": `.row{gap:var(--snui-space-22);color:var(--module__snui-color-border)}@container snui-panle (width<=32rem){.row{gap:0}}`,
        "remoteEntry.js": CLASSIC_ENTRY,
      },
    });

    const result = checkConsumer(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "main.css: var(--snui-space-22) names no public token or documented consumer hook",
    );
    expect(result.stderr).toContain(
      "main.css: --module__snui-color-border is a renamed form of the package's snui-color-border.",
    );
    expect(result.stderr).toContain(
      "main.css: @container snui-panle names no container.",
    );
  });
});

describe("snui-check-consumer --stats", () => {
  const module = (name) => ({
    name: `./node_modules/${name}`,
    nameForCondition: `/work/node_modules/${name}`,
    type: "module",
  });

  it("reads the module graph Webpack recorded", () => {
    const stats = {
      errorsCount: 0,
      modules: [
        module("signalk-nearlcrews-ui/dist/index.js"),
        module("react/jsx-runtime.js"),
      ],
    };
    const root = createConsumer({
      files: { "stats.json": JSON.stringify(stats) },
    });

    const result = checkConsumer(root, "--stats", "stats.json");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("module graph of 2 modules");
  });

  it("fails a graph that bundled React DOM", () => {
    const stats = {
      errorsCount: 0,
      modules: [
        module("signalk-nearlcrews-ui/dist/index.js"),
        module("react-dom/index.js"),
      ],
    };
    const root = createConsumer({
      files: { "stats.json": JSON.stringify(stats) },
    });

    const result = checkConsumer(root, "--stats", "stats.json");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The remote bundled modules the Signal K Admin host owns: /work/node_modules/react-dom/index.js.",
    );
  });
});

describe("snui-check-consumer --styles", () => {
  const PANEL = `import { Checkbox } from "signalk-nearlcrews-ui";
import styles from "./Panel.module.css";
export function Panel() {
  return <Checkbox className={styles.checkbox} label="Include" />;
}
`;

  it("passes a doubled override of a package component", () => {
    const root = createConsumer({
      files: {
        "src/panel/Panel.module.css": ".checkbox.checkbox { flex: 1 1 auto; }",
        "src/panel/Panel.tsx": PANEL,
      },
    });

    const result = checkConsumer(root, "--styles", "src/panel");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("doubled overrides in 1 CSS module");
  });

  it("fails a single class override of a package component", () => {
    const root = createConsumer({
      files: {
        "src/panel/Panel.module.css": ".checkbox { flex: 1 1 auto; }",
        "src/panel/Panel.tsx": PANEL,
      },
    });

    const result = checkConsumer(root, "--styles", "src/panel");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "src/panel/Panel.module.css: .checkbox lands on the package Checkbox (src/panel/Panel.tsx:4) through a single class selector",
    );
  });

  it("fails a directory with nothing to check", () => {
    const root = createConsumer({ files: { "src/panel/Panel.tsx": PANEL } });

    const result = checkConsumer(root, "--styles", "src/panel");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "--styles found no *.module.css under src/panel",
    );
  });
});

describe("the consumer fixture", () => {
  it("builds its entries from the shared pieces", () => {
    for (const entry of [CLASSIC_ENTRY, MODULE_ENTRY]) {
      expect(entry).toContain(SHARE_REGISTRATIONS);
      expect(entry).toContain(CONTAINER_RUNTIME);
      expect(entry).toContain(EXPOSES);
    }
  });
});
