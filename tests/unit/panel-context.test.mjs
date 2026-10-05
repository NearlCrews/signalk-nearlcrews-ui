import vm from "node:vm";

import { describe, expect, it } from "vitest";

import {
  createDomStubs,
  createPanelContext,
  DEFAULT_SCRIPT_URL,
  disposePanelContext,
  setNativeCssScope,
} from "../../bin/lib/panel-runtime.mjs";

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

describe("the stylesheet link a CSS chunk loader appends", () => {
  it("builds the link and answers its load once it is in the head", async () => {
    const { document } = createDomStubs(
      "http://localhost/panel/remoteEntry.js",
    );
    const link = document.createElement("LINK");
    link.setAttribute("data-webpack-loading", 1);
    const loaded = new Promise((resolve) => {
      link.onload = resolve;
    });

    expect(document.getElementsByTagName("link")).toEqual([]);
    expect(link.getAttribute("data-webpack-loading")).toBe("1");
    expect(document.head.appendChild(link)).toBe(link);
    expect(link.parentNode).toBe(document.head);
    await expect(loaded).resolves.toEqual({ target: link, type: "load" });

    link.removeAttribute("data-webpack-loading");
    expect(link.getAttribute("data-webpack-loading")).toBeNull();
    document.head.removeChild(link);
    expect(link.parentNode).toBeNull();
  });

  it("still refuses every other element", () => {
    const { document } = createDomStubs(
      "http://localhost/panel/remoteEntry.js",
    );

    expect(() => document.createElement("script")).toThrow(
      "The panel asked the document for an element.",
    );
  });
});
