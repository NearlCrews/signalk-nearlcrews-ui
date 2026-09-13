import vm from "node:vm";

import { describe, expect, it } from "vitest";

import {
  createPanelContext,
  disposePanelContext,
  renderPanelRemote,
} from "../../bin/lib/panel-runtime.mjs";

/** A classic container whose share-scope initialization never settles. */
const HUNG_CONTAINER = `window.probe_panel = {
  init: function () { return new Promise(function () {}); },
  get: function () { return Promise.reject(new Error("not reached")); },
};
`;

const REACT = { createElement: () => ({}), version: "19.3.0" };

describe("panel context timers", () => {
  it("clears a timer the panel scheduled, and never holds the loop open", async () => {
    const context = createPanelContext();
    const ticks = vm.runInContext(
      `const counted = { ticks: 0 };
      counted.handle = setInterval(() => { counted.ticks += 1; }, 5);
      counted.timeout = setTimeout(() => { counted.ticks += 100; }, 5);
      counted;`,
      context,
    );

    expect(ticks.handle.hasRef(), "a panel timer never keeps Node alive").toBe(
      false,
    );
    expect(ticks.timeout.hasRef()).toBe(false);
    disposePanelContext(context);
    await new Promise((resolve) => {
      setTimeout(resolve, 40);
    });

    expect(ticks.ticks, "the disposed timers did not fire").toBe(0);
  });

  it("ignores a context it never handed timers to", () => {
    expect(() => {
      disposePanelContext(vm.createContext({}));
    }).not.toThrow();
  });
});

describe("a remote that never settles", () => {
  it("fails within the bound rather than stopping the check", async () => {
    await expect(
      renderPanelRemote({
        bundles: [{ name: "remoteEntry.js", source: HUNG_CONTAINER }],
        containerName: "probe_panel",
        exposedModule: "./PluginConfigurationPanel",
        props: {},
        react: REACT,
        reactDom: { version: "19.3.0" },
        renderToStaticMarkup: () => "",
        timeoutMs: 50,
      }),
    ).rejects.toThrow(
      "remoteEntry.js did not finish initializing the share scope within 50ms.",
    );
  });
});
