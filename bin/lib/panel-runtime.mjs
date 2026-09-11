/**
 * Renders a built panel remote the way the Signal K Admin host does: run
 * remoteEntry.js as a classic script, initialize the share scope with the
 * consumer's React, get the exposed module, and render it to static markup.
 *
 * The checks in consumer-checks.mjs read the built files without running them.
 * These assertions need the panel to evaluate and render, which is what catches
 * a development JSX runtime, a chunk that throws while it evaluates, a panel
 * that renders nothing, and a stale copy of this library rendering under a
 * current pin.
 */
import vm from "node:vm";

/**
 * Globals Node and the browser both provide, passed through unchanged. These
 * are real implementations rather than stubs: a bundle built for a browser
 * reaches for them, and faking them would only hide what the panel does. Names
 * the running Node does not define are skipped, so the list may name a global
 * that a supported Node version has not shipped yet.
 */
const HOST_GLOBALS = Object.freeze([
  "AbortController",
  "AbortSignal",
  "CustomEvent",
  "DOMException",
  "Event",
  "EventTarget",
  "Intl",
  "TextDecoder",
  "TextEncoder",
  "URL",
  "URLSearchParams",
  "atob",
  "btoa",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "performance",
  "queueMicrotask",
  "setInterval",
  "setTimeout",
  "structuredClone",
]);

/**
 * The DOM members a panel remote touches before anything renders, in one
 * place, because they track other people's import-time global setup rather
 * than anything this package chose.
 *
 * React Aria's `useFocusVisible` and its transition tracker both run setup the
 * moment their chunk evaluates, guarded only on `document` being defined. This
 * context defines `document` and `window`, so it also has to answer what that
 * setup touches. Measured against this package's own federation fixture and a
 * consumer panel, the remote reads every member below while it evaluates,
 * apart from the two guards, which turn a network call and a chunk load into a
 * finding rather than a confusing failure. `document.documentElement`,
 * `localStorage`, and `matchMedia`, which an earlier copy of this harness
 * carried, are read by neither, and this library feature-detects the last two
 * itself, so their absence is a state it supports rather than a hole here.
 * Rendering happens server-side, so these are inert listeners and not a DOM
 * implementation.
 *
 * Recheck this list on a React Aria upgrade: a failing load names the member.
 */
function createDomStubs(scriptUrl) {
  const eventTarget = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return {
    document: {
      // Webpack's automatic public path resolves the chunk base from the
      // running script, with a getElementsByTagName("script") fallback.
      currentScript: { tagName: "SCRIPT", src: scriptUrl },
      // Both React Aria setups defer to DOMContentLoaded while the document
      // reads "loading", so "complete" is what makes them run here at all.
      readyState: "complete",
      // The transition tracker binds transitionrun and transitionend here.
      body: eventTarget(),
      // The focus-visible setup binds keydown, keyup, and click here.
      ...eventTarget(),
      // Every chunk beside the remote entry is pre-registered below, so the
      // webpack chunk loader should never reach for a script element.
      createElement: () => {
        throw new Error(
          "The panel asked the document for an element. The runtime check pre-registers every chunk beside the remote entry, so a chunk it did not find was requested, or the panel builds DOM while it renders.",
        );
      },
    },
    window: {
      // The focus-visible setup replaces HTMLElement.prototype.focus.
      HTMLElement: class HTMLElement {},
      // The same setup binds focus and blur on the window.
      ...eventTarget(),
      // Not a stub: a render that reaches the network is a finding, so make
      // it one rather than letting Node's own fetch answer.
      fetch: () => {
        throw new Error("The panel fetched while it rendered.");
      },
    },
  };
}

/** The attribute this package's compatibility notice carries. */
export const COMPATIBILITY_NOTICE_MARKER = "data-browser-compatibility-message";

/** Stands in for the script the Signal K Admin host loads the panel from. */
export const DEFAULT_SCRIPT_URL =
  "http://localhost/plugins/panel/remoteEntry.js";

/**
 * A context that answers what a panel remote reads at import and render time.
 * `window`, `self`, and `globalThis` are the one object, as they are in a
 * browser, because webpack registers its chunks on `self` and the classic
 * container assigns itself to `window`.
 */
export function createPanelContext({ scriptUrl = DEFAULT_SCRIPT_URL } = {}) {
  const stubs = createDomStubs(scriptUrl);
  const sandbox = { document: stubs.document };
  for (const name of HOST_GLOBALS) {
    if (name in globalThis) sandbox[name] = globalThis[name];
  }

  const context = vm.createContext(sandbox);
  context.self = context;
  context.window = context;
  context.globalThis = context;
  Object.assign(context, stubs.window);
  setNativeCssScope(context, true);
  return context;
}

/**
 * Adds or removes the interface this package's `supportsNativeCssScope`
 * preflight looks for, so one context can render both the panel and the
 * compatibility notice a browser without native CSS `@scope` gets.
 */
export function setNativeCssScope(context, supported) {
  if (supported) {
    context.CSSScopeRule = class CSSScopeRule {};
    return;
  }
  Reflect.deleteProperty(context, "CSSScopeRule");
}

/** One entry in a Module Federation share scope, as a host provides it. */
function shareEntry(module, version) {
  return {
    [version]: {
      get: () => Promise.resolve(() => module),
      loaded: true,
      from: "snui-check-consumer",
      eager: true,
      shareConfig: { singleton: true, requiredVersion: `^${version}` },
    },
  };
}

/**
 * Loads the exposed module out of a built classic container. `bundles` are the
 * JavaScript files beside the remote entry, which are pre-registered after the
 * container runtime exists: the browser loads them on demand, and registering
 * them here keeps the check deterministic without a networked script loader.
 */
async function loadPanelModule({
  bundles,
  containerName,
  context,
  exposedModule,
  react,
  reactDom,
}) {
  const remoteEntry = bundles.find(({ name }) => name === "remoteEntry.js");
  if (remoteEntry === undefined) {
    throw new Error("The panel build produced no remoteEntry.js.");
  }
  vm.runInContext(remoteEntry.source, context, { filename: "remoteEntry.js" });

  const container = context[containerName];
  if (container === null || typeof container !== "object") {
    throw new Error(
      `remoteEntry.js did not assign a container to window.${containerName}. Pass --container when the Webpack library name is not the package name with its punctuation replaced by underscores.`,
    );
  }

  await container.init({
    react: shareEntry(react, react.version),
    "react-dom": shareEntry(reactDom, reactDom.version),
  });
  for (const { name, source } of bundles) {
    if (name !== "remoteEntry.js") {
      vm.runInContext(source, context, { filename: name });
    }
  }

  const factory = await container.get(exposedModule);
  if (typeof factory !== "function") {
    throw new Error(`The remote exposes no ${exposedModule} module.`);
  }
  return factory();
}

/** The component the host renders out of an exposed panel module. */
function panelComponentOf(panelModule, exposedModule) {
  const component =
    typeof panelModule === "function" ? panelModule : panelModule?.default;
  if (typeof component !== "function") {
    throw new Error(
      `${exposedModule} has no default export the host can render.`,
    );
  }
  return component;
}

/** Versions stamped on rendered markup, by this package and by any other. */
function markupVersionStamps(markup) {
  return new Set(
    [...markup.matchAll(/data-snui-version="(\d+\.\d+\.\d+)"/g)].map(
      (match) => match[1],
    ),
  );
}

/**
 * Asserts the rendered panel carries the installed version's stamp and no
 * other. A second stamp means two copies of this package rendered in one tree,
 * which the versioned CSS scope cannot survive.
 */
export function assertMarkupVersionStamp(markup, expectedVersion) {
  const stamps = markupVersionStamps(markup);
  if (stamps.size === 0) {
    throw new Error(
      `The rendered panel carries no data-snui-version stamp, so it rendered no PanelRoot of signalk-nearlcrews-ui ${expectedVersion}.`,
    );
  }
  const unexpected = [...stamps].filter((stamp) => stamp !== expectedVersion);
  if (unexpected.length > 0) {
    throw new Error(
      `The rendered panel stamps data-snui-version with ${[...stamps].join(", ")}; expected exactly ${expectedVersion}.`,
    );
  }
}

/** Asserts every expected string appears in the rendered markup. */
export function assertMarkupIncludes(markup, expectations, description) {
  for (const expectation of expectations) {
    if (!markup.includes(expectation)) {
      throw new Error(`${description} does not contain ${expectation}.`);
    }
  }
}

/**
 * Why a load failed, and where to fix it when the panel reached for something
 * this context does not answer. A missing global surfaces as a reference or
 * type error out of the sandbox, whose intrinsics are its own, so the name
 * rather than `instanceof` is what identifies it.
 */
function failureOf(cause) {
  const reason =
    typeof cause?.message === "string" ? cause.message : String(cause);
  const sentence = /[!.?]$/.test(reason) ? reason : `${reason}.`;
  const missingGlobal =
    cause?.name === "ReferenceError" || cause?.name === "TypeError";
  return missingGlobal
    ? `${sentence} A global the panel reached for at import time may be missing: the DOM stubs in bin/lib/panel-runtime.mjs are where one goes.`
    : sentence;
}

/**
 * Renders the exposed panel twice: once without native CSS `@scope`, which is
 * what this package's preflight turns into a compatibility notice, and once
 * with it, which is the panel itself. Returns both markups.
 */
export async function renderPanelRemote({
  bundles,
  containerName,
  exposedModule,
  props,
  react,
  reactDom,
  renderCompatibilityNotice = true,
  renderToStaticMarkup,
  scriptUrl,
}) {
  const context = createPanelContext({ scriptUrl });
  let panelModule;
  try {
    panelModule = await loadPanelModule({
      bundles,
      containerName,
      context,
      exposedModule,
      react,
      reactDom,
    });
  } catch (cause) {
    throw new Error(`The panel remote did not load: ${failureOf(cause)}`, {
      cause,
    });
  }
  const component = panelComponentOf(panelModule, exposedModule);
  const render = () =>
    renderToStaticMarkup(react.createElement(component, props));

  let compatibilityMarkup;
  if (renderCompatibilityNotice) {
    setNativeCssScope(context, false);
    compatibilityMarkup = render();
    setNativeCssScope(context, true);
  }
  return { compatibilityMarkup, markup: render() };
}
