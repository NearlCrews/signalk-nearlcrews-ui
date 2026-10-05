import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertConfiguratorKeyword,
  assertEntryCarriesNoLibrary,
  assertExposesPanel,
  assertModuleContainer,
  assertRemoteLocation,
  assertWebpackContainer,
  findModuleExports,
  remoteFormatOf,
  toSafeModuleId,
} from "../../bin/lib/host-loading.mjs";
import {
  assertModuleGraph,
  collectModulePaths,
  packageOf,
} from "../../bin/lib/module-graph.mjs";
import { createShareScope } from "../../bin/lib/panel-runtime.mjs";
import { safeModuleId } from "../../src/host-harness/load-remote.js";
import { createHostShareScope } from "../../src/host-harness/share-scope.js";
import { statsModule } from "./lib/webpack-stats.mjs";

/** A share scope with each entry's get replaced by the module it resolves to. */
async function resolvedShape(scope) {
  const shape = {};
  for (const [name, versions] of Object.entries(scope)) {
    shape[name] = {};
    for (const [version, { get, ...entry }] of Object.entries(versions)) {
      shape[name][version] = { ...entry, module: (await get())() };
    }
  }
  return shape;
}

describe("the Admin loading contract", () => {
  it("names the global the way the loader's toSafeModuleId does", () => {
    expect(toSafeModuleId("@canboat/visual-analyzer")).toBe(
      "_canboat_visual_analyzer",
    );
    expect(toSafeModuleId("signalk-chart-locker")).toBe("signalk_chart_locker");
  });

  it("names the global the same way the host harness does", () => {
    for (const name of [
      "@canboat/visual-analyzer",
      "signalk-chart-locker",
      "@signalk/plugin-name",
    ]) {
      expect(toSafeModuleId(name), name).toBe(safeModuleId(name));
    }
  });

  it("builds the share scope the host harness builds", async () => {
    const react = { version: "19.3.0" };
    const reactDom = { version: "19.3.1" };

    expect(await resolvedShape(createShareScope(react, reactDom))).toEqual(
      await resolvedShape(createHostShareScope(react, reactDom)),
    );
  });

  it("reads the script tag format from the package type", () => {
    expect(remoteFormatOf({ type: "module" })).toBe("module");
    expect(remoteFormatOf({ type: "commonjs" })).toBe("classic");
    expect(remoteFormatOf({})).toBe("classic");
  });

  it("requires the configurator keyword", () => {
    expect(() =>
      assertConfiguratorKeyword({
        keywords: ["signalk-plugin-configurator"],
      }),
    ).not.toThrow();
    expect(() => assertConfiguratorKeyword({})).toThrow(
      "the Admin shows its own schema form instead of the panel",
    );
  });

  it("requires public/remoteEntry.js under the root", () => {
    const root = join("/plugins", "panel");
    expect(() =>
      assertRemoteLocation(root, join(root, "public", "remoteEntry.js")),
    ).not.toThrow();
    expect(() =>
      assertRemoteLocation(
        root,
        join(root, "public", "panel", "remoteEntry.js"),
      ),
    ).toThrow("--remote points at public/panel/remoteEntry.js");
    expect(() =>
      assertRemoteLocation(root, join(root, "public", "container.js")),
    ).toThrow("Build the remote to public/remoteEntry.js.");
  });

  it("recognizes Webpack's container runtime by the error it builds", () => {
    expect(() =>
      assertWebpackContainer(
        'throw new Error("Container initialization failed as it has already been initialized with a different share scope")',
        "remoteEntry.js",
      ),
    ).not.toThrow();
    expect(() =>
      assertWebpackContainer("export { get, init }", "remoteEntry.js"),
    ).toThrow("a Vite or other module remote");
  });

  it("reads export clauses and exported declarations in either order", () => {
    expect([
      ...findModuleExports(
        "let n=r(1);const o=n.get,i=n.init;export{o as get,i as init};",
      ),
    ]).toEqual(["get", "init"]);
    expect([
      ...findModuleExports(
        'export { init as "init", get };\nexport async function load() {}\nexport const x = 1;',
      ),
    ]).toEqual(["init", "get", "load", "x"]);
    expect(findModuleExports("module.exports = container;").size).toBe(0);
  });

  it("requires a module entry to export get and init", () => {
    expect(() =>
      assertModuleContainer("export{a as init,b as get}", "remoteEntry.js"),
    ).not.toThrow();
    expect(() =>
      assertModuleContainer("export{a as get}", "remoteEntry.js"),
    ).toThrow("This remoteEntry.js exports get but not init");
    expect(() => assertModuleContainer("var c={};", "remoteEntry.js")).toThrow(
      "This remoteEntry.js exports nothing",
    );
  });

  it("requires the exposed module the Admin asks for", () => {
    expect(() =>
      assertExposesPanel(
        "const n={'./PluginConfigurationPanel':()=>r.e(86)}",
        "remoteEntry.js",
      ),
    ).not.toThrow();
    expect(() =>
      assertExposesPanel('"./PluginConfigurationPanel"', "remoteEntry.js"),
    ).toThrow("remoteEntry.js exposes no ./PluginConfigurationPanel module.");
  });

  it("keeps the library out of the entry", () => {
    expect(() =>
      assertEntryCarriesNoLibrary("var e={};", "remoteEntry.js"),
    ).not.toThrow();
    expect(() =>
      assertEntryCarriesNoLibrary(
        '{"data-snui-version":"0.13.0"}',
        "remoteEntry.js",
      ),
    ).toThrow("so the whole panel would load on every page for every user");
  });
});

describe("the Webpack module graph", () => {
  const LIBRARY = statsModule(
    "node_modules/signalk-nearlcrews-ui/dist/index.js",
  );

  it("finds each module's package, root, and file", () => {
    expect(
      packageOf("/p/node_modules/a/node_modules/@internationalized/date/x.js"),
    ).toEqual({
      file: "x.js",
      name: "@internationalized/date",
      root: "/p/node_modules/a/node_modules/@internationalized/date",
    });
    expect(packageOf("/p/src/panel.tsx")).toBeUndefined();
  });

  it("walks nested, grouped, and child compilation modules", () => {
    const stats = {
      children: [
        { modules: [statsModule("src/child.ts")], name: "HtmlWebpackCompiler" },
      ],
      modules: [
        { children: [statsModule("src/grouped.ts")], type: "modules by path" },
        {
          modules: [{ name: "./src/inner.ts + 2 modules" }],
          name: "./src/panel.tsx + 3 modules",
          type: "module",
        },
        { name: "container entry", type: "module" },
        { type: "module" },
        null,
      ],
    };

    expect(collectModulePaths(stats)).toEqual([
      "/plugin/src/grouped.ts",
      "./src/panel.tsx",
      "./src/inner.ts",
      "container entry",
      "/plugin/src/child.ts",
    ]);
  });

  it("passes the production JSX runtime and one copy of each package", () => {
    expect(
      assertModuleGraph({
        errors: [],
        modules: [
          LIBRARY,
          statsModule("node_modules/react/jsx-runtime.js"),
          statsModule("node_modules/react/cjs/react-jsx-runtime.production.js"),
          statsModule("node_modules/react-aria/dist/a.mjs"),
          statsModule("node_modules/react-aria/dist/b.mjs"),
        ],
      }),
    ).toBe(5);
  });

  it("fails errors, empty stats, and stats without an error count", () => {
    expect(() =>
      assertModuleGraph({ errorsCount: 2, modules: [LIBRARY] }),
    ).toThrow("The Webpack stats record 2 build errors");
    expect(() =>
      assertModuleGraph({ errorsCount: 1, modules: [LIBRARY] }),
    ).toThrow("record 1 build error,");
    expect(() => assertModuleGraph({ errorsCount: 0 })).toThrow(
      "The Webpack stats record no modules.",
    );
    expect(() => assertModuleGraph({ modules: [LIBRARY] })).toThrow(
      "The Webpack stats carry no errorsCount and no errors list.",
    );
  });

  it("fails React beyond the JSX runtime, host-owned packages, and a missing library", () => {
    expect(() =>
      assertModuleGraph({
        errorsCount: 0,
        modules: [LIBRARY, statsModule("node_modules/react/index.js")],
      }),
    ).toThrow(
      "The remote bundled React modules other than the production JSX runtime: /plugin/node_modules/react/index.js.",
    );
    expect(() =>
      assertModuleGraph({
        errorsCount: 0,
        modules: [LIBRARY, statsModule("node_modules/scheduler/index.js")],
      }),
    ).toThrow("modules the Signal K Admin host owns");
    expect(() =>
      assertModuleGraph({
        errorsCount: 0,
        modules: [statsModule("src/panel.tsx")],
      }),
    ).toThrow("list no module from signalk-nearlcrews-ui");
  });

  it("fails a second copy of a React Aria package", () => {
    expect(() =>
      assertModuleGraph({
        errorsCount: 0,
        modules: [
          LIBRARY,
          statsModule("node_modules/react-aria/dist/a.mjs"),
          statsModule(
            "node_modules/react-aria-components/node_modules/react-aria/dist/a.mjs",
          ),
        ],
      }),
    ).toThrow(
      "The remote bundled 2 copies of react-aria: /plugin/node_modules/react-aria, /plugin/node_modules/react-aria-components/node_modules/react-aria.",
    );
  });
});
