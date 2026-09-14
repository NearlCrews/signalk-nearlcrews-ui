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
 *
 * The context below is an API-compatibility harness, not a security boundary.
 * The host's own React, its DOM stubs, and its timers cross into it by
 * reference, so a bundle evaluated here can reach the host realm and run with
 * the privileges of whoever started the check. Point it only at a build the
 * operator trusts.
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
  "structuredClone",
]);

/**
 * Timers a context scheduled, keyed by the context, so `disposePanelContext`
 * can clear them. `setInterval` and `setTimeout` are not in the list above
 * because a real Node timer keeps the event loop alive: a panel that starts a
 * poll or a retry while its chunk evaluates would otherwise leave the check
 * printing its result and then never exiting, which reads in CI as a hang.
 */
const CONTEXT_TIMERS = new WeakMap();

/**
 * How long a panel gets to evaluate, initialize, or answer a module. A bundle
 * that loops or never settles is a bug in the build being checked, and without
 * a bound it stops the check rather than failing it. Callers can pass their
 * own `timeoutMs`.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

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
  const timers = new Set();
  const scheduler =
    (start) =>
    (...args) => {
      const handle = start(...args);
      timers.add(handle);
      // Unreferenced as well as recorded, so a timer scheduled after the
      // renders cannot hold the process open on its own.
      if (typeof handle?.unref === "function") handle.unref();
      return handle;
    };
  sandbox.setInterval = scheduler(globalThis.setInterval);
  sandbox.setTimeout = scheduler(globalThis.setTimeout);

  const context = vm.createContext(sandbox);
  CONTEXT_TIMERS.set(context, timers);
  context.self = context;
  context.window = context;
  context.globalThis = context;
  Object.assign(context, stubs.window);
  setNativeCssScope(context, true);
  return context;
}

/**
 * Clears every timer the panel scheduled through the context, which is what
 * lets the check exit once it has printed its result. A context is finished
 * with once its renders are over, so the harness disposes its own.
 */
export function disposePanelContext(context) {
  const timers = CONTEXT_TIMERS.get(context);
  if (timers === undefined) return;
  // Node's clearTimeout and clearInterval both accept any Timeout, so one
  // call clears either kind of handle.
  for (const handle of timers) globalThis.clearTimeout(handle);
  timers.clear();
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
 * A top-level import or export statement, which only an ES module carries.
 * Consulted after a script compilation fails, so a string holding the word
 * export cannot be mistaken for one.
 */
const MODULE_SYNTAX =
  /(?:^|[\s;}])(?:export\s*(?:\{|\*|default[\s({[]|(?:const|let|var|function|class|async)\b)|import\s*(?:\{|\*|["'])|import\s+[\w$]+\s*(?:,|from\b))/;

/**
 * Compiles one built file as the classic script the Signal K Admin host loads.
 * An output-module remote is a supported build that this check cannot run, so
 * it is named as such rather than left as a bare SyntaxError.
 */
function compileBundle(name, source) {
  try {
    return new vm.Script(source, { filename: name });
  } catch (cause) {
    if (MODULE_SYNTAX.test(source)) {
      throw new Error(
        `${name} is an ES module. This check loads a remote the way the Admin host loads a classic container, so it cannot run a remote built with a library type of "module". Run the check without --runtime, which reads the same build without evaluating it.`,
        { cause },
      );
    }
    throw cause;
  }
}

/**
 * Bounds a step the remote controls. A container whose init or get never
 * settles is a bug in the build being checked, and without a bound it stops
 * the check rather than failing it.
 */
function withTimeout(work, timeoutMs, description) {
  let timer;
  const bound = new Promise((_resolve, reject) => {
    timer = globalThis.setTimeout(() => {
      reject(new Error(`${description} within ${timeoutMs}ms.`));
    }, timeoutMs);
    if (typeof timer?.unref === "function") timer.unref();
  });
  return Promise.race([work, bound]).finally(() => {
    globalThis.clearTimeout(timer);
  });
}

/**
 * Loads the exposed module out of a built classic container. `bundles` are the
 * JavaScript files beside the remote entry, which are pre-registered after the
 * container runtime exists: the browser loads them on demand, and registering
 * them here keeps the check deterministic without a networked script loader.
 * `entryName` is the file the caller pointed the check at, because a consumer
 * may give its container any filename.
 */
async function loadPanelModule({
  bundles,
  containerName,
  context,
  entryName = "remoteEntry.js",
  exposedModule,
  react,
  reactDom,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const remoteEntry = bundles.find(({ name }) => name === entryName);
  if (remoteEntry === undefined) {
    throw new Error(`The panel build produced no ${entryName}.`);
  }
  compileBundle(entryName, remoteEntry.source).runInContext(context, {
    timeout: timeoutMs,
  });

  const container = context[containerName];
  if (container === null || typeof container !== "object") {
    throw new Error(
      `${entryName} did not assign a container to window.${containerName}. Pass --container when the Webpack library name is not the package name with its punctuation replaced by underscores.`,
    );
  }

  await withTimeout(
    container.init({
      react: shareEntry(react, react.version),
      "react-dom": shareEntry(reactDom, reactDom.version),
    }),
    timeoutMs,
    `${entryName} did not finish initializing the share scope`,
  );
  for (const { name, source } of bundles) {
    if (name !== entryName) {
      compileBundle(name, source).runInContext(context, { timeout: timeoutMs });
    }
  }

  const factory = await withTimeout(
    container.get(exposedModule),
    timeoutMs,
    `The remote did not answer ${exposedModule}`,
  );
  if (typeof factory !== "function") {
    throw new Error(`The remote exposes no ${exposedModule} module.`);
  }
  return await withTimeout(
    Promise.resolve(factory()),
    timeoutMs,
    `${exposedModule} did not finish loading`,
  );
}

/**
 * Whether React can render this as an element type. `memo` and `forwardRef`
 * return an object carrying a `$$typeof` marker rather than a function, and
 * the host renders those as readily as a plain component.
 */
function isElementType(value) {
  if (typeof value === "function") return true;
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.$$typeof === "symbol"
  );
}

/** The component the host renders out of an exposed panel module. */
function panelComponentOf(panelModule, exposedModule) {
  const component = isElementType(panelModule)
    ? panelModule
    : panelModule?.default;
  if (!isElementType(component)) {
    throw new Error(
      `${exposedModule} has no default export the host can render.`,
    );
  }
  return component;
}

/** Versions stamped on rendered markup, by this package and by any other. */
function markupVersionStamps(markup) {
  return new Set(
    [...markup.matchAll(/data-snui-version="(\d+\.\d+\.\d+[\w.+-]*)"/g)].map(
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
 * The type errors a member this context does not answer produces, as the
 * engines word them. An ordinary type error in the panel's own code is the
 * commonest failure of all, and pointing its author at this package's stub
 * list sends them into the wrong file.
 */
const MISSING_MEMBER =
  /is not a function|Cannot read properties of (?:undefined|null)|is (?:undefined|not an object)/i;

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
    cause?.name === "ReferenceError" ||
    (cause?.name === "TypeError" && MISSING_MEMBER.test(reason));
  return missingGlobal
    ? `${sentence} A global the panel reached for at import time may be missing: the DOM stubs in bin/lib/panel-runtime.mjs are where one goes.`
    : sentence;
}

/**
 * Renders the exposed panel twice: once without native CSS `@scope`, which is
 * what this package's preflight turns into a compatibility notice, and once
 * with it, which is the panel itself. Returns both markups and the number of
 * times the panel called `save` in each render.
 */
export async function renderPanelRemote({
  bundles,
  containerName,
  entryName,
  exposedModule,
  props,
  react,
  reactDom,
  renderCompatibilityNotice = true,
  renderToStaticMarkup,
  scriptUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const context = createPanelContext({ scriptUrl });
  try {
    let panelModule;
    try {
      panelModule = await loadPanelModule({
        bundles,
        containerName,
        context,
        entryName,
        exposedModule,
        react,
        reactDom,
        timeoutMs,
      });
    } catch (cause) {
      throw new Error(`The panel remote did not load: ${failureOf(cause)}`, {
        cause,
      });
    }
    const component = panelComponentOf(panelModule, exposedModule);
    // The host passes `save` for a user action, so the check supplies it and
    // counts each render separately: a panel with one call site saves once per
    // render, and a total would report it as though it had two.
    const saveCalls = [];
    const renderProps = {
      ...props,
      save: () => {
        saveCalls[saveCalls.length - 1] += 1;
      },
    };
    const render = () => {
      saveCalls.push(0);
      try {
        return renderToStaticMarkup(
          react.createElement(component, renderProps),
        );
      } catch (cause) {
        throw new Error(`The panel did not render: ${failureOf(cause)}`, {
          cause,
        });
      }
    };

    let compatibilityMarkup;
    if (renderCompatibilityNotice) {
      setNativeCssScope(context, false);
      compatibilityMarkup = render();
      setNativeCssScope(context, true);
    }
    return { compatibilityMarkup, markup: render(), saveCalls };
  } finally {
    disposePanelContext(context);
  }
}
