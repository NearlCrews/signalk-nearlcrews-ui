import { join } from "node:path";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";

import {
  renderModulePanelRemote,
  renderModuleRemoteInRealm,
} from "../../bin/lib/module-runtime.mjs";
import {
  createPanelContext,
  disposePanelContext,
  HOST_STATES,
  installDomStubs,
} from "../../bin/lib/panel-runtime.mjs";
import {
  createConsumer,
  ENTRY_PREAMBLE,
  EXPOSED_MODULE,
  REACT_PACKAGES,
  REMOTE_ENTRY,
  removeConsumers,
  runRuntimeCli,
  STAMP,
} from "./lib/consumer-fixture.mjs";

/** Stands in for the file URL a worker imports the built entry from. */
const ENTRY_URL = "file:///plugins/panel/public/remoteEntry.js";

/**
 * A remote built as an ES module in a package whose type is "module": an entry
 * that exports get and init, loads its stylesheet through a link the way
 * Webpack's CSS chunk loader does, and imports the chunk holding the panel.
 * The chunk runs what React Aria's import-time setup touches.
 */
function moduleRemote({ entryPrelude = "" } = {}) {
  return {
    "main.chunk.js": `document.addEventListener("keydown", () => {}, true);
document.body.addEventListener("transitionrun", () => {});
window.addEventListener("focus", () => {}, true);
const focus = window.HTMLElement.prototype.focus;
export function panelModule(React) {
  return {
    default: function PluginConfigurationPanel(props) {
      if (typeof window.CSSScopeRule !== "function") {
        return React.createElement("section", { "data-browser-compatibility-message": "" }, "Browser update required");
      }
      const label = props.configuration?.label ?? "Unconfigured";
      return React.createElement("div", { "data-snui-root": "", "data-snui-version": "${STAMP}" }, label);
    },
  };
}
`,
    "main.css": ".row.row{gap:var(--snui-space-2)}",
    "remoteEntry.js": `${ENTRY_PREAMBLE}
${entryPrelude}
let sharedReact = null;
function loadStylesheet() {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.setAttribute("data-webpack-loading", 1);
    link.rel = "stylesheet";
    link.href = new URL("./main.css", import.meta.url).href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}
export const init = async (scope) => {
  const entry = scope.react[Object.keys(scope.react)[0]];
  sharedReact = (await entry.get())();
};
export const get = async (name) => {
  if (name !== "${EXPOSED_MODULE}") throw new Error("no module " + name);
  await loadStylesheet();
  const chunk = await import("./main.chunk.js");
  return () => chunk.panelModule(sharedReact);
};
`,
  };
}

function moduleConsumer(options = {}) {
  return createConsumer({
    assets: moduleRemote(options),
    link: REACT_PACKAGES,
    manifest: { type: "module" },
  });
}

/** Renders in a realm the test passes, with the suite's own React. */
function renderInRealm(options) {
  return renderModuleRemoteInRealm({
    entryUrl: ENTRY_URL,
    exposedModule: EXPOSED_MODULE,
    react: React,
    reactDom: ReactDOM,
    renderToStaticMarkup,
    states: HOST_STATES,
    ...options,
  });
}

/** Renders a consumer's built remote in a worker, as the command line does. */
function renderInWorker(root, options = {}) {
  return renderModulePanelRemote({
    entryPath: join(root, REMOTE_ENTRY),
    exposedModule: EXPOSED_MODULE,
    root,
    states: HOST_STATES,
    ...options,
  });
}

afterAll(removeConsumers);

describe("renderModuleRemoteInRealm", () => {
  /** A module namespace exposing the panel, as import() returns one. */
  function namespaceFor(scope) {
    let sharedReact;
    return {
      get: async () => () => ({
        default: function Panel(props) {
          if (typeof scope.CSSScopeRule !== "function") {
            return sharedReact.createElement("p", null, "Notice");
          }
          return sharedReact.createElement(
            "div",
            { "data-snui-version": STAMP },
            props.configuration === undefined ? "Unconfigured" : "Configured",
          );
        },
      }),
      init: async (shareScope) => {
        sharedReact = (await shareScope.react[React.version].get())();
      },
    };
  }

  it("renders the compatibility notice and every state in the realm it is given", async () => {
    const realm = {};
    const stages = [];

    const result = await renderInRealm({
      globalObject: realm,
      importEntry: async () => namespaceFor(realm),
      onStage: (stage) => stages.push(stage),
    });

    expect(stages).toEqual(["evaluate", "load", "render"]);
    expect(result.compatibility.markup).toBe("<p>Notice</p>");
    expect(result.renders.map(({ markup }) => markup)).toEqual([
      `<div data-snui-version="${STAMP}">Unconfigured</div>`,
      `<div data-snui-version="${STAMP}">Configured</div>`,
    ]);
    expect(realm.window).toBe(realm);
    expect(realm.self).toBe(realm);
  });

  it("names an entry that exports no container", async () => {
    await expect(
      renderInRealm({
        globalObject: {},
        importEntry: async () => ({ get: () => {} }),
      }),
    ).rejects.toThrow(
      "The panel remote did not load: remoteEntry.js does not export get and init, which the Signal K Admin reads off a module remote.",
    );
  });
});

describe("installDomStubs", () => {
  it("defines the stubs over a global's own getters and functions", () => {
    const realm = {};
    Object.defineProperty(realm, "navigator", {
      configurable: true,
      get: () => ({ userAgent: "Node.js" }),
    });
    realm.fetch = () => "network";

    installDomStubs(realm, ENTRY_URL);

    expect(realm.document.currentScript.src).toBe(ENTRY_URL);
    expect(() => realm.fetch("/plugins")).toThrow(
      "The panel fetched while it rendered.",
    );
    expect(typeof realm.CSSScopeRule).toBe("function");
    expect(realm.navigator.userAgent).toBe("Node.js");
  });

  it("keeps a worker's new stubs out of its keys, and a classic context's in them", () => {
    const worker = { fetch: () => "network" };
    installDomStubs(worker, ENTRY_URL);
    expect(Object.keys(worker)).toEqual(["fetch"]);

    const context = createPanelContext({ scriptUrl: ENTRY_URL });
    try {
      expect(Object.keys(context)).toEqual(
        expect.arrayContaining(["document", "fetch", "self", "window"]),
      );
    } finally {
      disposePanelContext(context);
    }
  });
});

describe("renderModulePanelRemote", () => {
  it("renders a module remote in a worker, stylesheet and chunk included", async () => {
    const root = moduleConsumer();

    const result = await renderInWorker(root);

    expect(result.compatibility.markup).toContain(
      "data-browser-compatibility-message",
    );
    expect(result.renders[0].markup).toContain("Unconfigured");
    expect(result.renders[1].markup).toContain(`data-snui-version="${STAMP}"`);
  });

  it("stops a remote that never finishes evaluating", async () => {
    const root = moduleConsumer({ entryPrelude: "for (;;) {}" });

    await expect(renderInWorker(root, { timeoutMs: 1000 })).rejects.toThrow(
      "The panel remote did not load: remoteEntry.js did not finish evaluating within 1000ms.",
    );
  });

  it("reports a worker that exits before it answers", async () => {
    const root = moduleConsumer({ entryPrelude: "process.exit(3);" });

    await expect(renderInWorker(root)).rejects.toThrow(
      "The render worker exited with code 3 before it answered.",
    );
  });

  it("reports an error the remote throws outside the render", async () => {
    const root = moduleConsumer({
      entryPrelude:
        'setTimeout(() => { throw new Error("Timer threw"); }, 0);\nawait new Promise(() => {});',
    });

    await expect(renderInWorker(root)).rejects.toThrow(
      "The panel remote did not load: Timer threw.",
    );
  });

  it("reports a failure the worker caught", async () => {
    const root = moduleConsumer();

    await expect(
      renderInWorker(root, { exposedModule: "./Missing" }),
    ).rejects.toThrow("The panel remote did not load: no module ./Missing.");
  });

  it("runs from the command line for a module package", () => {
    const root = moduleConsumer();

    const result = runRuntimeCli(
      root,
      "--props",
      '{"configuration":{"label":"Two conversions"}}',
      "--expect",
      "Two conversions",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("module remote exporting get and init");
    expect(result.stdout).toContain(
      "panel rendered from 2 bundles with configuration undefined and {} and --props",
    );
  });
});
