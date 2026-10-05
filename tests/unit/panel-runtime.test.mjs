import { createRequire } from "node:module";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";

import {
  assertClassicContainerLoads,
  assertMarkupIncludes,
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  loadConsumerReact,
  renderPanelRemote,
} from "../../bin/lib/panel-runtime.mjs";
import {
  checkConsumer,
  createConsumer,
  ENTRY_PREAMBLE,
  EXPOSED_MODULE,
  manifest,
  REACT_PACKAGES,
  removeConsumers,
  runRuntimeCli,
  STAMP,
} from "./lib/consumer-fixture.mjs";

/** Source for a panel root element stamped with the installed version, holding `child`. */
function panelElement(child) {
  return `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, ${child})`;
}

const NOTICE = `React.createElement("section", { "${COMPATIBILITY_NOTICE_MARKER}": "" }, "Browser update required")`;
const PANEL = panelElement('"Loading conversions"');

/** A classic container whose share-scope initialization never settles. */
const HUNG_CONTAINER = `window.probe_panel = {
  init: function () { return new Promise(function () {}); },
  get: function () { return Promise.reject(new Error("not reached")); },
};
`;

/**
 * A chunk that registers `moduleSource`, an expression over React, as the
 * exposed panel module, under the key the fixture entry looks it up by.
 */
function chunkExposing(moduleSource) {
  return `self.snuiFixtureModules["${EXPOSED_MODULE}"] = function (React) {
  return ${moduleSource};
};
`;
}

/**
 * A built panel remote: a classic container that takes React from the share
 * scope the check initializes, and a chunk holding the panel itself. The
 * container touches what React Aria's import-time setup touches, so the
 * fixture stands or falls with the check's own DOM stubs.
 */
function panelRemote({
  chunkPrelude = "",
  compatibilityNotice = NOTICE,
  entryPrelude = "",
  panel = PANEL,
  saveDuringRender = false,
} = {}) {
  return {
    "main.chunk.js": `${chunkPrelude}${chunkExposing(`{
    default: function PluginConfigurationPanel(props) {
      ${saveDuringRender ? "props.save({ saved: true });" : ""}
      if (typeof window.CSSScopeRule !== "function") return ${compatibilityNotice};
      return ${panel};
    },
  }`)}`,
    "remoteEntry.js": `${ENTRY_PREAMBLE}
${entryPrelude}var publicPath = document.currentScript.src.replace(/[^/]+$/, "");
if (document.readyState !== "loading") {
  var patchedFocus = HTMLElement.prototype.focus;
  document.body.addEventListener("transitionrun", function () {});
  document.addEventListener("keydown", function () {}, true);
  window.addEventListener("focus", function () {}, true);
}
self.snuiFixtureModules = self.snuiFixtureModules || {};
var sharedReact = null;
window.consumer_fixture = {
  init: function (scope) {
    var entry = scope.react[Object.keys(scope.react)[0]];
    return Promise.resolve(entry.get()).then(function (factory) {
      sharedReact = factory();
    });
  },
  get: function (name) {
    var module = self.snuiFixtureModules[name];
    if (module === undefined) return Promise.reject(new Error("no module " + name));
    return Promise.resolve(function () {
      return module(sharedReact);
    });
  },
};
`,
  };
}

/** A remote's files as the renderer takes them: a name and its source. */
function bundlesOf(assets) {
  return Object.entries(assets).map(([name, source]) => ({ name, source }));
}

/** The fixture remote with its chunk exposing `moduleSource` as the panel module. */
function remoteExposing(moduleSource) {
  return bundlesOf({
    ...panelRemote(),
    "main.chunk.js": chunkExposing(moduleSource),
  });
}

/** The first state the host opens a panel in, as the CLI describes it. */
const UNCONFIGURED = {
  description: "configuration undefined",
  props: { configuration: undefined },
};

/**
 * Renders the fixture remote in this process, the way the CLI does after it
 * spawns, so the renderer's own branches are measured rather than only
 * exercised through a child process.
 */
function renderInProcess(options = {}) {
  return renderPanelRemote({
    bundles: bundlesOf(panelRemote()),
    containerName: "consumer_fixture",
    exposedModule: EXPOSED_MODULE,
    react: React,
    reactDom: ReactDOM,
    renderToStaticMarkup,
    states: [UNCONFIGURED],
    ...options,
  });
}

/** A consumer holding the fixture remote, with React installed beside it. */
function runtimeConsumer(remote = {}, consumer = {}) {
  return createConsumer({
    assets: panelRemote(remote),
    link: REACT_PACKAGES,
    ...consumer,
  });
}

afterAll(removeConsumers);

describe("snui-check-consumer --runtime", () => {
  it("renders the panel the host renders and reports the bundles it ran", () => {
    const root = runtimeConsumer();

    const result = runRuntimeCli(root, "--expect", "Loading conversions");

    expect(result.status, result.stderr).toBe(0);
    // Two separate clauses: the JSX runtime is reported on every invocation,
    // and the bundle count only with --runtime, so nothing holds them
    // adjacent.
    expect(result.stdout).toContain("production JSX runtime");
    expect(result.stdout).toContain("panel rendered from 2 bundles");
  });

  it("catches a development JSX runtime without running the panel", () => {
    const root = runtimeConsumer({
      chunkPrelude:
        'var _jsxFileName = "src/panel/PluginConfigurationPanel.tsx";\nfunction jsxDEV(type, props) { return props; }\n',
    });

    const staticRun = checkConsumer(root);
    expect(staticRun.status, "the static mode catches it too").not.toBe(0);
    expect(staticRun.stderr).toContain(
      "uses the React development JSX runtime: main.chunk.js contains jsxDEV",
    );

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "uses the React development JSX runtime: main.chunk.js contains jsxDEV",
    );
  });

  it("catches a rendered version stamp the bundled literal hides", () => {
    // The chunk carries the installed version as a literal, so the static
    // stamp check passes; the panel renders a different one.
    const root = runtimeConsumer({
      chunkPrelude: `var installed = { "data-snui-version": "${STAMP}" };\n`,
      panel:
        'React.createElement("div", { "data-snui-root": "", "data-snui-version": "9.9." + "9" }, "Panel")',
    });

    expect(
      checkConsumer(root).status,
      "the static mode passes the same build",
    ).toBe(0);

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `The rendered panel stamps data-snui-version with 9.9.9; expected exactly ${manifest.version}.`,
    );
  });

  it("catches a panel that renders no panel root at all", () => {
    const root = runtimeConsumer({
      chunkPrelude: `var installed = { "data-snui-root": "", "data-snui-version": "${STAMP}" };\n`,
      panel: 'React.createElement("div", null, "Panel")',
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `it rendered no PanelRoot of signalk-nearlcrews-ui ${manifest.version}`,
    );
  });

  it("requires the compatibility notice a browser without CSS scope gets", () => {
    const root = runtimeConsumer({ compatibilityNotice: PANEL });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `The panel rendered for a browser without native CSS @scope does not contain ${COMPATIBILITY_NOTICE_MARKER}.`,
    );
  });

  it("takes the consumer's own words for a replaced compatibility notice", () => {
    const root = runtimeConsumer({
      compatibilityNotice:
        'React.createElement("p", null, "This panel needs a newer browser.")',
    });

    expect(
      runRuntimeCli(
        root,
        "--expect-unsupported",
        "This panel needs a newer browser.",
      ).status,
    ).toBe(0);
    expect(runRuntimeCli(root, "--no-compatibility-render").status).toBe(0);
    expect(runRuntimeCli(root).status).not.toBe(0);
  });

  it("refuses --expect-unsupported beside the option that skips its render", () => {
    // The pair would assert nothing about the text it names and still pass.
    const root = runtimeConsumer();

    const result = runRuntimeCli(
      root,
      "--no-compatibility-render",
      "--expect-unsupported",
      "Browser update required",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "--expect-unsupported needs the compatibility render that --no-compatibility-render skips.",
    );
    expect(
      runRuntimeCli(root, "--no-compatibility-render", "--expect-unsupported")
        .stderr,
    ).toContain("--expect-unsupported requires text.");
  });

  it("reports every --expect the rendered panel is missing", () => {
    const root = runtimeConsumer();

    const result = runRuntimeCli(root, "--expect", "Saved conversions");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The rendered panel does not contain Saved conversions.",
    );
  });

  it("opens the panel with configuration undefined, as a fresh install does", () => {
    // Written against a null configuration, which the host never passes.
    const root = runtimeConsumer({
      panel: panelElement(
        'props.configuration === null ? "Unconfigured" : props.configuration.label',
      ),
    });

    const result = runRuntimeCli(
      root,
      "--props",
      '{"configuration":{"label":"Two conversions"}}',
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel did not render with configuration undefined, which the Signal K Admin passes a plugin nobody has configured: Cannot read properties of undefined (reading 'label').",
    );
  });

  it("opens the panel with configuration {}, as a package enabled by default does", () => {
    const root = runtimeConsumer({
      panel: panelElement(
        'props.configuration === undefined ? "Unconfigured" : props.configuration.limits.depth',
      ),
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel did not render with configuration {}, which the Signal K Admin passes a package enabled by default before its first save:",
    );
  });

  it("passes the configuration the host holds through --props", () => {
    const root = runtimeConsumer({
      panel: panelElement('props.configuration?.label ?? "Unconfigured"'),
    });

    const unconfigured = runRuntimeCli(root, "--expect", "Unconfigured");
    expect(unconfigured.status, unconfigured.stderr).toBe(0);
    expect(unconfigured.stdout).toContain(
      "with configuration undefined and {}.",
    );
    const configured = runRuntimeCli(
      root,
      "--props",
      '{"configuration":{"label":"Two conversions"}}',
      "--expect",
      "Two conversions",
    );
    expect(configured.status, configured.stderr).toBe(0);
    expect(configured.stdout).toContain(
      "with configuration undefined and {} and --props.",
    );
    expect(runRuntimeCli(root, "--props", "not json").stderr).toContain(
      "--props is not valid JSON",
    );
    expect(runRuntimeCli(root, "--props", "[1]").stderr).toContain(
      "--props must be a JSON object.",
    );
  });

  it("reports a panel that calls save while it renders", () => {
    const root = runtimeConsumer({ saveDuringRender: true });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel called save while it rendered without native CSS @scope, with configuration undefined, and with configuration {}.",
    );
  });

  it("reports a save made only while the panel renders with configuration {}", () => {
    // Normalizing {} through the plugin's defaults is the path most likely
    // to save during render, so the {} render counts saves like every other.
    const root = runtimeConsumer({
      panel: `(props.configuration !== undefined && props.save({ normalized: true }), ${PANEL})`,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel called save while it rendered with configuration {}.",
    );
    expect(result.stderr).toContain("The host passes save for a user action");
  });

  it("names the container global a remote entry did not assign", () => {
    const root = runtimeConsumer({}, { name: "other-consumer" });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "remoteEntry.js did not assign a container with get and init to window.other_consumer",
    );
    expect(runRuntimeCli(root, "--container", "consumer_fixture").status).toBe(
      0,
    );
  });

  it("names the module a remote entry does not expose", () => {
    const root = runtimeConsumer();

    const result = checkConsumer(root, "--runtime", "--expose", "./Missing");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel remote did not load: no module ./Missing.",
    );
    expect(
      result.stderr,
      "a named module is not a missing global",
    ).not.toContain("DOM stubs");
  });

  it("points a missing global at the one place the stubs live", () => {
    // What a React Aria release that reaches for a new global looks like.
    const root = runtimeConsumer({
      entryPrelude: 'matchMedia("(prefers-reduced-motion: reduce)");\n',
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("matchMedia is not defined.");
    expect(result.stderr).toContain(
      "the DOM stubs in bin/lib/panel-runtime.mjs are where one goes",
    );
  });

  it("needs a module to render", () => {
    const root = runtimeConsumer();

    const result = checkConsumer(root, "--runtime");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--runtime needs --expose <module>");
  });

  it("reports an argument error before a missing React", () => {
    // No React linked: neither error needs a render, so each comes first.
    const root = createConsumer({ assets: panelRemote() });

    const props = runRuntimeCli(root, "--props", "not json");
    expect(props.status).not.toBe(0);
    expect(props.stderr).toContain("--props is not valid JSON");
    expect(props.stderr).not.toContain("which is not installed");

    const unsupported = runRuntimeCli(
      root,
      "--no-compatibility-render",
      "--expect-unsupported",
      "Browser update required",
    );
    expect(unsupported.status).not.toBe(0);
    expect(unsupported.stderr).toContain(
      "--expect-unsupported needs the compatibility render that --no-compatibility-render skips.",
    );
    expect(unsupported.stderr).not.toContain("which is not installed");
  });

  it("leaves the static mode alone and refuses its options without --runtime", () => {
    const root = createConsumer({ assets: panelRemote() });

    const result = checkConsumer(
      root,
      "--expose",
      EXPOSED_MODULE,
      "--expect",
      "Loading conversions",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--expect and --expose need --runtime.");
    // Without them the same build passes with no React installed beside it.
    expect(checkConsumer(root).status).toBe(0);
  });
});

describe("renderPanelRemote in process", () => {
  it("renders the compatibility notice, then the panel, counting saves per render", async () => {
    const result = await renderInProcess();

    expect(result.compatibility.markup).toContain(COMPATIBILITY_NOTICE_MARKER);
    expect(result.renders[0].markup).toContain(`data-snui-version="${STAMP}"`);
    expect(result.renders[0].markup).toContain("Loading conversions");
    expect(result.compatibility.saves).toBe(0);
    expect(result.renders.map((render) => render.saves)).toEqual([0]);
  });

  it("skips the compatibility render on request and counts a save in each render", async () => {
    const skipped = await renderInProcess({ renderCompatibilityNotice: false });
    expect(skipped.compatibility).toBeUndefined();
    expect(skipped.renders.map((render) => render.saves)).toEqual([0]);

    const saving = await renderInProcess({
      bundles: bundlesOf(panelRemote({ saveDuringRender: true })),
    });
    expect(saving.compatibility.saves).toBe(1);
    expect(saving.renders.map((render) => render.saves)).toEqual([1]);
  });

  it("renders a module that is itself the component, as memo returns one", async () => {
    const result = await renderInProcess({
      bundles: remoteExposing(
        `React.memo(function Panel() { return React.createElement("div", { "data-snui-version": "${STAMP}" }, "Memo panel"); })`,
      ),
      renderCompatibilityNotice: false,
    });

    expect(result.renders[0].markup).toContain("Memo panel");
  });

  it("names each way a remote fails to load", async () => {
    await expect(
      renderInProcess({
        bundles: bundlesOf({ "main.chunk.js": "void 0;" }),
      }),
    ).rejects.toThrow(
      "The panel remote did not load: The panel build produced no remoteEntry.js.",
    );
    await expect(
      renderInProcess({ containerName: "other_consumer" }),
    ).rejects.toThrow(
      "remoteEntry.js did not assign a container with get and init to window.other_consumer",
    );
    await expect(
      renderInProcess({ exposedModule: "./Missing" }),
    ).rejects.toThrow("The panel remote did not load: no module ./Missing.");
    await expect(
      renderInProcess({
        bundles: [{ name: "remoteEntry.js", source: "export default {};" }],
      }),
    ).rejects.toThrow(
      'remoteEntry.js is an ES module, but package.json does not set "type": "module"',
    );
    // A syntax error that is not module syntax is reported as it stands.
    await expect(
      renderInProcess({
        bundles: [{ name: "remoteEntry.js", source: "var = ;" }],
      }),
    ).rejects.toThrow(/^The panel remote did not load: Unexpected token/);
    await expect(
      renderInProcess({
        bundles: [
          {
            name: "remoteEntry.js",
            source:
              "window.consumer_fixture = { init: function () {}, get: function () { return Promise.resolve(42); } };",
          },
        ],
      }),
    ).rejects.toThrow(`The remote exposes no ${EXPOSED_MODULE} module.`);
  });

  it("fails a remote that never settles within the bound, rather than stopping the check", async () => {
    await expect(
      renderInProcess({
        bundles: [{ name: "remoteEntry.js", source: HUNG_CONTAINER }],
        containerName: "probe_panel",
        timeoutMs: 50,
      }),
    ).rejects.toThrow(
      "remoteEntry.js did not finish initializing the share scope within 50ms.",
    );
  });

  it("refuses a module with nothing the host can render", async () => {
    await expect(
      renderInProcess({ bundles: remoteExposing("{ default: 42 }") }),
    ).rejects.toThrow(
      `${EXPOSED_MODULE} has no default export the host can render.`,
    );
  });

  it("points only a missing member at the stubs when the panel fails to render", async () => {
    const renderFailure = (body) =>
      renderInProcess({
        bundles: remoteExposing(`{ default: function Panel() { ${body} } }`),
        renderCompatibilityNotice: false,
      });

    await expect(renderFailure("return undefinedGlobal();")).rejects.toThrow(
      "The panel did not render with configuration undefined: undefinedGlobal is not defined. A global the panel reached for at import time may be missing",
    );
    await expect(renderFailure("return null.member;")).rejects.toThrow(
      "the DOM stubs in bin/lib/panel-runtime.mjs are where one goes.",
    );
    await expect(
      renderFailure('throw new TypeError("Wrong kind of panel!");'),
    ).rejects.toThrow(
      /^The panel did not render with configuration undefined: Wrong kind of panel!$/,
    );
    await expect(renderFailure('throw new Error("Boom");')).rejects.toThrow(
      /^The panel did not render with configuration undefined: Boom\.$/,
    );
    await expect(renderFailure('throw "plain";')).rejects.toThrow(
      /^The panel did not render with configuration undefined: plain\.$/,
    );
  });
});

describe("a classic entry evaluated alone", () => {
  it("passes one that assigns its container and names one that does not", () => {
    const entry = {
      containerName: "consumer_fixture",
      entryName: "remoteEntry.js",
      source: panelRemote()["remoteEntry.js"],
    };

    expect(() => {
      assertClassicContainerLoads(entry);
    }).not.toThrow();
    expect(() => {
      assertClassicContainerLoads({
        ...entry,
        containerName: "other_consumer",
      });
    }).toThrow(
      "remoteEntry.js did not assign a container with get and init to window.other_consumer",
    );
  });
});

describe("the consumer's own React", () => {
  it("loads through the consumer's require, and says when it is not installed", () => {
    const loaded = loadConsumerReact(createRequire(import.meta.url));

    expect(loaded.react.version).toBe(React.version);
    expect(loaded.reactDom.version).toBe(ReactDOM.version);
    expect(loaded.renderToStaticMarkup).toBeTypeOf("function");
    expect(() =>
      loadConsumerReact(() => {
        throw new Error("Cannot find module 'react'");
      }),
    ).toThrow(
      "--runtime renders the panel with the consumer's own React, which is not installed: Cannot find module 'react'",
    );
  });
});

describe("rendered markup assertions", () => {
  it("accepts one matching stamp and rejects a second copy", () => {
    expect(() =>
      assertMarkupVersionStamp(
        '<div data-snui-version="0.10.0"></div>',
        "0.10.0",
      ),
    ).not.toThrow();
    expect(() =>
      assertMarkupVersionStamp(
        '<div data-snui-version="0.10.0"><p data-snui-version="0.9.0"></p></div>',
        "0.10.0",
      ),
    ).toThrow(
      "stamps data-snui-version with 0.10.0, 0.9.0; expected exactly 0.10.0.",
    );
  });

  it("names a panel that rendered no stamp at all", () => {
    expect(() => assertMarkupVersionStamp("<div></div>", "0.10.0")).toThrow(
      `The rendered panel carries no data-snui-version stamp, so it rendered no PanelRoot of ${manifest.name} 0.10.0.`,
    );
  });

  it("passes markup holding every expectation and names the first one missing", () => {
    expect(() =>
      assertMarkupIncludes("<p>Depth alarm</p>", ["Depth", "alarm"], "Panel"),
    ).not.toThrow();
    expect(() =>
      assertMarkupIncludes("<p>Depth</p>", ["Depth", "Wind"], "The panel"),
    ).toThrow("The panel does not contain Wind.");
  });
});
