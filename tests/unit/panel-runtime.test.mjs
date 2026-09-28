import vm from "node:vm";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";

import {
  assertMarkupIncludes,
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  createPanelContext,
  DEFAULT_SCRIPT_URL,
  renderPanelRemote,
  setNativeCssScope,
} from "../../bin/lib/panel-runtime.mjs";
import {
  CONTAINER_RUNTIME,
  checkConsumer,
  createConsumer,
  EXPOSES,
  manifest,
  removeConsumers,
  SHARE_REGISTRATIONS,
  STAMP,
} from "./lib/consumer-fixture.mjs";

/** React, react-dom, and what react-dom/server loads beside them. */
const REACT_PACKAGES = ["react", "react-dom", "scheduler"];

const EXPOSED_MODULE = "./PluginConfigurationPanel";
const NOTICE = `React.createElement("section", { "${COMPATIBILITY_NOTICE_MARKER}": "" }, "Browser update required")`;
const PANEL = `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, "Loading conversions")`;

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
    "main.chunk.js": `${chunkPrelude}self.snuiFixtureModules["${EXPOSED_MODULE}"] = function (React) {
  return {
    default: function PluginConfigurationPanel(props) {
      ${saveDuringRender ? "props.save({ saved: true });" : ""}
      if (typeof window.CSSScopeRule !== "function") return ${compatibilityNotice};
      return ${panel};
    },
  };
};
`,
    "remoteEntry.js": `${SHARE_REGISTRATIONS}
${CONTAINER_RUNTIME}
${EXPOSES}
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
    "main.chunk.js": `self.snuiFixtureModules["${EXPOSED_MODULE}"] = function (React) {
  return ${moduleSource};
};
`,
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

function runRuntimeCli(root, ...args) {
  return checkConsumer(root, "--runtime", "--expose", EXPOSED_MODULE, ...args);
}

afterAll(removeConsumers);

describe("snui-check-consumer --runtime", () => {
  it("renders the panel the host renders and reports the bundles it ran", () => {
    const root = createConsumer({
      assets: panelRemote(),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root, "--expect", "Loading conversions");

    expect(result.status, result.stderr).toBe(0);
    // Two separate clauses: the JSX runtime is reported on every invocation,
    // so it no longer sits immediately before the runtime-only clause.
    expect(result.stdout).toContain("production JSX runtime");
    expect(result.stdout).toContain("panel rendered from 2 bundles");
  });

  it("catches a development JSX runtime without running the panel", () => {
    const root = createConsumer({
      assets: panelRemote({
        chunkPrelude:
          'var _jsxFileName = "src/panel/PluginConfigurationPanel.tsx";\nfunction jsxDEV(type, props) { return props; }\n',
      }),
      link: REACT_PACKAGES,
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
    const root = createConsumer({
      assets: panelRemote({
        chunkPrelude: `var installed = { "data-snui-version": "${STAMP}" };\n`,
        panel:
          'React.createElement("div", { "data-snui-root": "", "data-snui-version": "9.9." + "9" }, "Panel")',
      }),
      link: REACT_PACKAGES,
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
    const root = createConsumer({
      assets: panelRemote({
        chunkPrelude: `var installed = { "data-snui-root": "", "data-snui-version": "${STAMP}" };\n`,
        panel: 'React.createElement("div", null, "Panel")',
      }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `it rendered no PanelRoot of signalk-nearlcrews-ui ${manifest.version}`,
    );
  });

  it("requires the compatibility notice a browser without CSS scope gets", () => {
    const root = createConsumer({
      assets: panelRemote({ compatibilityNotice: PANEL }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      `The panel rendered for a browser without native CSS @scope does not contain ${COMPATIBILITY_NOTICE_MARKER}.`,
    );
  });

  it("takes the consumer's own words for a replaced compatibility notice", () => {
    const root = createConsumer({
      assets: panelRemote({
        compatibilityNotice:
          'React.createElement("p", null, "This panel needs a newer browser.")',
      }),
      link: REACT_PACKAGES,
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

  it("reports every --expect the rendered panel is missing", () => {
    const root = createConsumer({
      assets: panelRemote(),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root, "--expect", "Saved conversions");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The rendered panel does not contain Saved conversions.",
    );
  });

  it("opens the panel with configuration undefined, as a fresh install does", () => {
    // Written against a null configuration, which the host never passes.
    const root = createConsumer({
      assets: panelRemote({
        panel: `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, props.configuration === null ? "Unconfigured" : props.configuration.label)`,
      }),
      link: REACT_PACKAGES,
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
    const root = createConsumer({
      assets: panelRemote({
        panel: `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, props.configuration === undefined ? "Unconfigured" : props.configuration.limits.depth)`,
      }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel did not render with configuration {}, which the Signal K Admin passes a package enabled by default before its first save:",
    );
  });

  it("passes the configuration the host holds through --props", () => {
    const root = createConsumer({
      assets: panelRemote({
        panel: `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, props.configuration?.label ?? "Unconfigured")`,
      }),
      link: REACT_PACKAGES,
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
    const root = createConsumer({
      assets: panelRemote({ saveDuringRender: true }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel called save while it rendered without native CSS @scope, with configuration undefined, and with configuration {}.",
    );
  });

  it("reports a save made only while the panel renders with configuration {}", () => {
    // Normalizing {} through the plugin's defaults is the path most likely
    // to save during render, so the {} render counts saves like every other.
    const root = createConsumer({
      assets: panelRemote({
        panel: `(props.configuration !== undefined && props.save({ normalized: true }), ${PANEL})`,
      }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "The panel called save while it rendered with configuration {}.",
    );
    expect(result.stderr).toContain("The host passes save for a user action");
  });

  it("names the container global a remote entry did not assign", () => {
    const root = createConsumer({
      assets: panelRemote(),
      link: REACT_PACKAGES,
      name: "other-consumer",
    });

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
    const root = createConsumer({
      assets: panelRemote(),
      link: REACT_PACKAGES,
    });

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
    const root = createConsumer({
      assets: panelRemote({
        entryPrelude: 'matchMedia("(prefers-reduced-motion: reduce)");\n',
      }),
      link: REACT_PACKAGES,
    });

    const result = runRuntimeCli(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("matchMedia is not defined.");
    expect(result.stderr).toContain(
      "the DOM stubs in bin/lib/panel-runtime.mjs are where one goes",
    );
  });

  it("needs a module to render", () => {
    const root = createConsumer({
      assets: panelRemote(),
      link: REACT_PACKAGES,
    });

    const result = checkConsumer(root, "--runtime");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--runtime needs --expose <module>");
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

describe("the panel context", () => {
  /** What React Aria's focus-visible setup and transition tracker touch. */
  const REACT_ARIA_SETUP = `
    if (typeof document === "undefined") throw new Error("no document");
    if (document.readyState === "loading") throw new Error("deferred to DOMContentLoaded");
    const focus = window.HTMLElement.prototype.focus;
    Reflect.defineProperty(window.HTMLElement.prototype, "focus", {
      configurable: true,
      writable: true,
      value: function () {},
    });
    document.addEventListener("keydown", () => {}, true);
    document.addEventListener("keyup", () => {}, true);
    document.body.addEventListener("transitionrun", () => {});
    document.body.addEventListener("transitionend", () => {});
    window.addEventListener("focus", () => {}, true);
    window.addEventListener("blur", () => {}, false);
    document.currentScript.src;
  `;

  it("answers the import-time setup this package's dependencies run", () => {
    expect(() =>
      vm.runInContext(REACT_ARIA_SETUP, createPanelContext()),
    ).not.toThrow();
  });

  it("is one object for window, self, and globalThis, as a browser is", () => {
    const context = createPanelContext();

    expect(
      vm.runInContext(
        "window === self && self === globalThis && window.document === document",
        context,
      ),
    ).toBe(true);
    expect(vm.runInContext("document.currentScript.src", context)).toBe(
      DEFAULT_SCRIPT_URL,
    );
    expect(
      vm.runInContext("typeof setTimeout === 'function'", context),
      "host globals pass through",
    ).toBe(true);
  });

  it("refuses the network and the document's own elements", () => {
    const context = createPanelContext();

    expect(() => vm.runInContext("fetch('/plugins')", context)).toThrow(
      "The panel fetched while it rendered.",
    );
    expect(() =>
      vm.runInContext("document.createElement('script')", context),
    ).toThrow("pre-registers every chunk");
  });

  it("takes the CSS scope interface away and puts it back", () => {
    const context = createPanelContext();
    const supported = "typeof window.CSSScopeRule === 'function'";

    expect(vm.runInContext(supported, context)).toBe(true);
    setNativeCssScope(context, false);
    expect(vm.runInContext(supported, context)).toBe(false);
    setNativeCssScope(context, true);
    expect(vm.runInContext(supported, context)).toBe(true);
  });
});

describe("rendered version stamps", () => {
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

describe("rendered markup assertions", () => {
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
