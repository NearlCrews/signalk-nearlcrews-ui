/**
 * Renders a built panel remote the way the Signal K Admin host does: run
 * remoteEntry.js as a classic script, initialize the share scope with the
 * consumer's React, get the exposed module, and render it to static markup.
 * A remote built as an ES module takes the same steps in a worker thread,
 * through module-runtime.mjs, which shares the stubs and the renders below.
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

import {
  assertOnlyVersionStamp,
  markupVersionStamps,
  PACKAGE_NAME,
  VERSION_STAMP_ATTRIBUTE,
} from "./consumer-checks.mjs";
import { REMOTE_ENTRY_NAME } from "./host-loading.mjs";

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
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * A `<link rel="stylesheet">` as Webpack's CSS chunk loader builds one: it sets
 * attributes, assigns `onload` and `onerror`, and appends the link to the
 * document head.
 */
function createStylesheetLink() {
  const attributes = new Map();
  return {
    getAttribute: (name) => attributes.get(name) ?? null,
    onerror: null,
    onload: null,
    parentNode: null,
    removeAttribute: (name) => {
      attributes.delete(name);
    },
    setAttribute: (name, value) => {
      attributes.set(name, String(value));
    },
    tagName: "LINK",
  };
}

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
 * apart from the two guards, which turn a network call and a stray element
 * into a finding rather than a confusing failure. The one element the
 * document builds is the stylesheet link Webpack's CSS chunk loader appends
 * for a panel that ships CSS modules, and the head answers its load at once:
 * rendering happens server-side, so no stylesheet would ever apply.
 * `document.documentElement`, `localStorage`, and `matchMedia`, which an
 * earlier copy of this harness carried, are read by neither, and this library
 * feature-detects the last two itself, so their absence is a state it
 * supports rather than a hole here. These are inert listeners and not a DOM
 * implementation.
 *
 * Recheck this list on a React Aria upgrade: a failing load names the member.
 */
export function createDomStubs(scriptUrl) {
  const eventTarget = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const head = {
    appendChild: (node) => {
      node.parentNode = head;
      queueMicrotask(() => {
        node.onload?.({ target: node, type: "load" });
      });
      return node;
    },
    removeChild: (node) => {
      node.parentNode = null;
      return node;
    },
  };
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
      // The CSS chunk loader looks for a link it already added, then appends
      // one here.
      getElementsByTagName: () => [],
      head,
      // Every JavaScript chunk beside a classic entry is pre-registered below,
      // and a module remote imports its chunks, so the webpack chunk loader
      // should never reach for a script element.
      createElement: (tagName) => {
        if (String(tagName).toLowerCase() === "link") {
          return createStylesheetLink();
        }
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
export const DEFAULT_SCRIPT_URL = `http://localhost/plugins/panel/${REMOTE_ENTRY_NAME}`;

/**
 * Puts the DOM stubs on a realm's global: the classic context below, or a
 * worker's own global for a module remote. Node 22 and later define
 * `navigator` as a getter on the global and no `self` at all, so every stub is
 * defined as a property rather than assigned, which also replaces Node's own
 * `fetch` with the stub that turns a render reaching the network into a
 * finding. The classic context's stubs are enumerable, like the host globals
 * and timers assigned to its sandbox. A worker's leave the attribute alone, so
 * a new stub stays out of the global's keys and Node's own `fetch` keeps its
 * place in them.
 */
export function installDomStubs(
  globalObject,
  scriptUrl,
  { enumerable = false } = {},
) {
  const stubs = createDomStubs(scriptUrl);
  const attributes = enumerable
    ? { configurable: true, enumerable: true, writable: true }
    : { configurable: true, writable: true };
  const define = (name, value) => {
    Object.defineProperty(globalObject, name, { ...attributes, value });
  };
  define("document", stubs.document);
  define("window", globalObject);
  define("self", globalObject);
  for (const [name, value] of Object.entries(stubs.window)) {
    define(name, value);
  }
  setNativeCssScope(globalObject, true);
}

/**
 * A context that answers what a panel remote reads at import and render time.
 * `window`, `self`, and `globalThis` are the one object, as they are in a
 * browser, because webpack registers its chunks on `self` and the classic
 * container assigns itself to `window`.
 */
export function createPanelContext({ scriptUrl = DEFAULT_SCRIPT_URL } = {}) {
  const sandbox = {};
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
  context.globalThis = context;
  installDomStubs(context, scriptUrl, { enumerable: true });
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
 * preflight looks for, so one global can render both the panel and the
 * compatibility notice a browser without native CSS `@scope` gets. Defined
 * rather than assigned, because a worker's global is Node's own, whose
 * properties an assignment does not always reach.
 */
export function setNativeCssScope(target, supported) {
  if (supported) {
    Object.defineProperty(target, "CSSScopeRule", {
      configurable: true,
      value: class CSSScopeRule {},
      writable: true,
    });
    return;
  }
  Reflect.deleteProperty(target, "CSSScopeRule");
}

/**
 * One entry in a Module Federation share scope, exactly as the Admin loader's
 * fallback registers it, `from: "adminUI"` included, so a remote's version
 * warnings read here as they do in the Admin.
 */
function shareEntry(module, version) {
  return {
    [version]: {
      get: () => Promise.resolve(() => module),
      loaded: true,
      from: "adminUI",
      eager: true,
      shareConfig: { singleton: true, requiredVersion: `^${version}` },
    },
  };
}

/**
 * The share scope the Admin's loader falls back to, with the consumer's React.
 * The host harness builds the same shape as `createHostShareScope`; a unit
 * test holds the two equal.
 */
export function createShareScope(react, reactDom) {
  return {
    react: shareEntry(react, react.version),
    "react-dom": shareEntry(reactDom, reactDom.version),
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
 * Runs one built file in the context as the classic script the Signal K Admin
 * host loads for a package without `"type": "module"`. An ES module there is a
 * build the Admin cannot run, so a file that does not compile is named as such
 * rather than left as a bare SyntaxError. What the script throws while it runs
 * is the caller's to report.
 */
function runClassicScript({ context, name, source, timeoutMs }) {
  let script;
  try {
    script = new vm.Script(source, { filename: name });
  } catch (cause) {
    if (MODULE_SYNTAX.test(source)) {
      throw new Error(
        `${name} is an ES module, but package.json does not set "type": "module", so the Signal K server writes a classic <script> tag for it, which cannot run module syntax. Build the remote with a library type of "var" or "window", or give the package the module type if its server code allows.`,
        { cause },
      );
    }
    throw cause;
  }
  script.runInContext(context, { timeout: timeoutMs });
}

/**
 * Whether a value is a Module Federation container as the Admin loader takes
 * one: an object, a module namespace included, whose `get` and `init` are
 * functions.
 */
export function isContainer(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.get === "function" &&
    typeof value.init === "function"
  );
}

/**
 * Runs a classic remote entry in the context and returns the container it
 * assigned to `containerName`, the global the Admin reads it from. The entry
 * is the small container runtime and loads no chunk while it evaluates.
 */
function evaluateClassicContainer({
  containerName,
  context,
  entryName,
  source,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  runClassicScript({ context, name: entryName, source, timeoutMs });
  const container = context[containerName];
  if (!isContainer(container)) {
    throw new Error(
      `${entryName} did not assign a container with get and init to window.${containerName}, the global the Signal K Admin reads a classic remote from: the package name with -, @, and / replaced by underscores. Name the Webpack container ${containerName}, or pass --container for a host that loads it under another name.`,
    );
  }
  return container;
}

/**
 * Asserts a classic remote entry, evaluated alone, assigns its container to
 * the global the Admin reads. The context lasts for the one evaluation and is
 * disposed whether or not the entry loads, so a timer the entry scheduled
 * cannot keep the caller from exiting.
 */
export function assertClassicContainerLoads({
  containerName,
  entryName,
  source,
  timeoutMs,
}) {
  const context = createPanelContext();
  try {
    evaluateClassicContainer({
      containerName,
      context,
      entryName,
      source,
      timeoutMs,
    });
  } finally {
    disposePanelContext(context);
  }
}

/**
 * Bounds a step the remote controls. A container whose init or get never
 * settles is a bug in the build being checked, and without a bound it stops
 * the check rather than failing it.
 */
export function withTimeout(work, timeoutMs, description) {
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
 * Initializes a container with the consumer's React and loads the exposed
 * module out of it, as the Admin loader does for either remote format.
 * `beforeGet` runs between the two, which is where a classic remote's chunks
 * are registered.
 */
export async function loadExposedModule({
  beforeGet = () => {},
  container,
  entryName,
  exposedModule,
  react,
  reactDom,
  timeoutMs,
}) {
  await withTimeout(
    Promise.resolve(container.init(createShareScope(react, reactDom))),
    timeoutMs,
    `${entryName} did not finish initializing the share scope`,
  );
  beforeGet();
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
 * Loads the exposed module out of a built classic container. `bundles` are the
 * JavaScript files beside the remote entry, which are pre-registered after the
 * container runtime exists: the browser loads them on demand, and registering
 * them here keeps the check deterministic without a networked script loader.
 * `entryName` is the file the caller pointed the check at.
 */
async function loadPanelModule({
  bundles,
  containerName,
  context,
  entryName,
  exposedModule,
  react,
  reactDom,
  timeoutMs,
}) {
  const remoteEntry = bundles.find(({ name }) => name === entryName);
  if (remoteEntry === undefined) {
    throw new Error(`The panel build produced no ${entryName}.`);
  }
  const container = evaluateClassicContainer({
    containerName,
    context,
    entryName,
    source: remoteEntry.source,
    timeoutMs,
  });
  return await loadExposedModule({
    beforeGet: () => {
      for (const { name, source } of bundles) {
        if (name !== entryName) {
          runClassicScript({ context, name, source, timeoutMs });
        }
      }
    },
    container,
    entryName,
    exposedModule,
    react,
    reactDom,
    timeoutMs,
  });
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
export function panelComponentOf(panelModule, exposedModule) {
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

/**
 * Asserts the rendered panel carries the installed version's stamp and no
 * other. A second stamp means two copies of this package rendered in one tree,
 * which the versioned CSS scope cannot survive.
 */
export function assertMarkupVersionStamp(markup, expectedVersion) {
  const stamps = markupVersionStamps(markup);
  if (stamps.size === 0) {
    throw new Error(
      `The rendered panel carries no ${VERSION_STAMP_ATTRIBUTE} stamp, so it rendered no PanelRoot of ${PACKAGE_NAME} ${expectedVersion}.`,
    );
  }
  assertOnlyVersionStamp(stamps, expectedVersion, "The rendered panel");
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
export function failureOf(cause) {
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

/** The error every way a remote fails to load is reported as. */
export function panelLoadError(cause) {
  return new Error(`The panel remote did not load: ${failureOf(cause)}`, {
    cause,
  });
}

/**
 * The consumer's own React, React DOM, and static renderer, which the panel
 * renders with as it does in the Admin. `consumerRequire` resolves from the
 * consumer's root.
 */
export function loadConsumerReact(consumerRequire) {
  try {
    return {
      react: consumerRequire("react"),
      reactDom: consumerRequire("react-dom"),
      renderToStaticMarkup:
        consumerRequire("react-dom/server").renderToStaticMarkup,
    };
  } catch (cause) {
    throw new Error(
      `--runtime renders the panel with the consumer's own React, which is not installed: ${cause.message}`,
      { cause },
    );
  }
}

/**
 * The states the Signal K Admin opens a configuration panel in before anyone
 * saves. The host seeds `configuration` from the plugin's options file, which
 * holds none for a plugin nobody has configured, and the server writes `{}`
 * for a package that enables itself by default. It never passes null.
 */
export const HOST_STATES = Object.freeze([
  Object.freeze({
    description:
      "configuration undefined, which the Signal K Admin passes a plugin nobody has configured",
    label: "with configuration undefined",
    props: Object.freeze({ configuration: undefined }),
  }),
  Object.freeze({
    description:
      "configuration {}, which the Signal K Admin passes a package enabled by default before its first save",
    label: "with configuration {}",
    props: Object.freeze({ configuration: {} }),
  }),
]);

/**
 * Renders the panel component once per host state, after an optional first
 * render without native CSS `@scope`, which is what this package's preflight
 * turns into a compatibility notice. `states` are `{ description, props }`
 * pairs; the compatibility render takes the first state's props, the state the
 * host opens a panel in first. Each render gets its own `save`, counted
 * separately, because a panel with one call site saves once per render and a
 * total would report it as though it had several.
 */
export function renderPanelStates({
  component,
  react,
  renderCompatibilityNotice,
  renderToStaticMarkup,
  scopeTarget,
  states,
}) {
  const render = ({ description, props }) => {
    let saves = 0;
    const renderProps = {
      ...props,
      save: () => {
        saves += 1;
      },
    };
    try {
      const markup = renderToStaticMarkup(
        react.createElement(component, renderProps),
      );
      return { markup, saves };
    } catch (cause) {
      throw new Error(
        `The panel did not render with ${description}: ${failureOf(cause)}`,
        { cause },
      );
    }
  };

  let compatibility;
  if (renderCompatibilityNotice) {
    setNativeCssScope(scopeTarget, false);
    try {
      compatibility = render({
        description: `${states[0].description}, in a browser without native CSS @scope`,
        props: states[0].props,
      });
    } finally {
      setNativeCssScope(scopeTarget, true);
    }
  }
  return { compatibility, renders: states.map(render) };
}

/**
 * Renders the exposed panel of a classic remote: once without native CSS
 * `@scope` for the compatibility notice, then once per host state. Returns the
 * compatibility render, if any, and one render per state, each with its markup
 * and the number of times the panel called `save` while it rendered.
 */
export async function renderPanelRemote({
  bundles,
  containerName,
  entryName = REMOTE_ENTRY_NAME,
  exposedModule,
  react,
  reactDom,
  renderCompatibilityNotice = true,
  renderToStaticMarkup,
  scriptUrl,
  states,
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
      throw panelLoadError(cause);
    }
    return renderPanelStates({
      component: panelComponentOf(panelModule, exposedModule),
      react,
      renderCompatibilityNotice,
      renderToStaticMarkup,
      scopeTarget: context,
      states,
    });
  } finally {
    disposePanelContext(context);
  }
}
