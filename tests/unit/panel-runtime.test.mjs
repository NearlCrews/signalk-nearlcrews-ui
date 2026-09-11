import vm from "node:vm";

import { afterAll, describe, expect, it } from "vitest";

import {
  assertMarkupVersionStamp,
  COMPATIBILITY_NOTICE_MARKER,
  createPanelContext,
  DEFAULT_SCRIPT_URL,
  setNativeCssScope,
} from "../../bin/lib/panel-runtime.mjs";
import {
  createConsumer,
  manifest,
  removeConsumers,
  runCli,
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

function runRuntimeCli(root, ...args) {
  return runCli(
    "--root",
    root,
    "--remote",
    "public/remoteEntry.js",
    "--runtime",
    "--expose",
    EXPOSED_MODULE,
    ...args,
  );
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
    expect(result.stdout).toContain(
      "production JSX runtime, panel rendered from 2 bundles",
    );
  });

  it("catches a development JSX runtime the static checks pass", () => {
    const root = createConsumer({
      assets: panelRemote({
        chunkPrelude:
          'var _jsxFileName = "src/panel/PluginConfigurationPanel.tsx";\nfunction jsxDEV(type, props) { return props; }\n',
      }),
      link: REACT_PACKAGES,
    });

    expect(
      runCli("--root", root, "--remote", "public/remoteEntry.js").status,
      "the static mode passes the same build",
    ).toBe(0);

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
      runCli("--root", root, "--remote", "public/remoteEntry.js").status,
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

  it("passes the configuration the host holds through --props", () => {
    const root = createConsumer({
      assets: panelRemote({
        panel: `React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, props.configuration.label)`,
      }),
      link: REACT_PACKAGES,
    });

    expect(runRuntimeCli(root).status, "a null configuration").not.toBe(0);
    expect(
      runRuntimeCli(
        root,
        "--props",
        '{"configuration":{"label":"Two conversions"}}',
        "--expect",
        "Two conversions",
      ).status,
    ).toBe(0);
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
      "The panel called save 2 times while it rendered",
    );
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
      "remoteEntry.js did not assign a container to window.other_consumer",
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

    const result = runCli(
      "--root",
      root,
      "--remote",
      "public/remoteEntry.js",
      "--runtime",
      "--expose",
      "./Missing",
    );

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

    const result = runCli(
      "--root",
      root,
      "--remote",
      "public/remoteEntry.js",
      "--runtime",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--runtime needs --expose <module>");
  });

  it("leaves the static mode alone and refuses its options without --runtime", () => {
    const root = createConsumer({ assets: panelRemote() });

    const result = runCli(
      "--root",
      root,
      "--remote",
      "public/remoteEntry.js",
      "--expose",
      EXPOSED_MODULE,
      "--expect",
      "Loading conversions",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--expect and --expose need --runtime.");
    // Without them the same build passes with no React installed beside it.
    expect(
      runCli("--root", root, "--remote", "public/remoteEntry.js").status,
    ).toBe(0);
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
