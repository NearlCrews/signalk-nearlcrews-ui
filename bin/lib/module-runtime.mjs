/**
 * Renders a panel remote built as an ES module, the way the Signal K Admin
 * loads one for a package whose package.json `type` is `"module"`: import the
 * entry, read `get` and `init` off its namespace, initialize the share scope
 * with the consumer's React, and render the exposed module.
 *
 * A module cannot be evaluated in a `vm` context without Node's experimental
 * `vm.SourceTextModule`, so the render runs in a worker thread instead: a
 * separate realm whose global carries the same DOM stubs the classic context
 * does, where `import()` loads the entry by file URL and Webpack's module chunk
 * loader imports the chunks beside it the same way. Terminating the worker is
 * what bounds a remote that loops while it evaluates.
 *
 * Node picks each file's module format from the nearest package.json, so the
 * caller runs this only after the host loading check has proven the package
 * sets `"type": "module"`, which makes the entry and its `.js` chunks load as
 * ES modules here exactly as the Admin's module script tag loads them.
 *
 * Like the classic context, the worker is an API-compatibility harness and not
 * a security boundary: the remote runs with the privileges of whoever started
 * the check.
 */
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} from "node:worker_threads";

import {
  DEFAULT_TIMEOUT_MS,
  installDomStubs,
  isContainer,
  loadConsumerReact,
  loadExposedModule,
  panelComponentOf,
  panelLoadError,
  renderPanelStates,
  withTimeout,
} from "./panel-runtime.mjs";

/** Marks the worker data this file runs as a worker for. */
const WORKER_FLAG = "snuiModulePanelRender";

/**
 * What a stage that outlives its bound is reported as, by the realm's own
 * timer for the evaluation and by the parent's for every stage.
 */
function stageTimeout(stage, entryName, exposedModule) {
  switch (stage) {
    case "evaluate":
      return `${entryName} did not finish evaluating`;
    case "load":
      return `The remote did not finish loading ${exposedModule}`;
    case "render":
      return "The panel did not finish rendering";
    default:
      return "The render worker did not start";
  }
}

/**
 * The render itself, in whatever realm calls it. `globalObject` is the realm's
 * global, which receives the stubs, and `importEntry` loads the entry: the
 * worker passes its own global and `import()`. Reports each stage through
 * `onStage` before it starts, so the parent can say which one ran out of time.
 */
export async function renderModuleRemoteInRealm({
  entryUrl,
  exposedModule,
  globalObject,
  importEntry,
  onStage = () => {},
  react,
  reactDom,
  renderCompatibilityNotice = true,
  renderToStaticMarkup,
  states,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const entryName = basename(new URL(entryUrl).pathname);
  installDomStubs(globalObject, entryUrl);
  let panelModule;
  try {
    onStage("evaluate");
    const container = await withTimeout(
      Promise.resolve(importEntry(entryUrl)),
      timeoutMs,
      stageTimeout("evaluate", entryName, exposedModule),
    );
    if (!isContainer(container)) {
      throw new Error(
        `${entryName} does not export get and init, which the Signal K Admin reads off a module remote.`,
      );
    }
    onStage("load");
    panelModule = await loadExposedModule({
      container,
      entryName,
      exposedModule,
      react,
      reactDom,
      timeoutMs,
    });
  } catch (cause) {
    throw panelLoadError(cause);
  }
  onStage("render");
  return renderPanelStates({
    component: panelComponentOf(panelModule, exposedModule),
    react,
    renderCompatibilityNotice,
    renderToStaticMarkup,
    scopeTarget: globalObject,
    states,
  });
}

/**
 * How long the worker gets to start and load the consumer's React before the
 * remote runs at all. That part is not the remote's to answer for, so it is
 * not held to the remote's own bound, which a caller may set tight.
 */
const WORKER_START_TIMEOUT_MS = 3 * DEFAULT_TIMEOUT_MS;

/**
 * Renders a module remote in a worker thread and returns what
 * `renderPanelStates` returns. `entryPath` is the built remote entry and
 * `root` the consumer, whose React the worker loads.
 */
export function renderModulePanelRemote({
  entryPath,
  exposedModule,
  renderCompatibilityNotice = true,
  root,
  states,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const entryName = basename(entryPath);
  return new Promise((resolvePromise, rejectPromise) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: {
        [WORKER_FLAG]: true,
        entryUrl: pathToFileURL(entryPath).href,
        exposedModule,
        renderCompatibilityNotice,
        root,
        states,
        timeoutMs,
      },
    });
    let settled = false;
    let timer;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timer);
      void worker.terminate();
      outcome();
    };
    // Each stage gets the whole bound, measured from the moment it starts.
    const arm = (stage) => {
      const bound = stage === "start" ? WORKER_START_TIMEOUT_MS : timeoutMs;
      globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(() => {
        const description = stageTimeout(stage, entryName, exposedModule);
        settle(() => {
          rejectPromise(
            panelLoadError(new Error(`${description} within ${bound}ms.`)),
          );
        });
      }, bound);
    };
    arm("start");
    worker.on("message", (message) => {
      if (message?.type === "stage") {
        arm(message.stage);
      } else if (message?.type === "done") {
        settle(() => {
          resolvePromise(message.result);
        });
      } else if (message?.type === "failed") {
        settle(() => {
          rejectPromise(new Error(message.message));
        });
      }
    });
    worker.on("error", (cause) => {
      settle(() => {
        rejectPromise(panelLoadError(cause));
      });
    });
    worker.on("exit", (code) => {
      settle(() => {
        rejectPromise(
          new Error(
            `The render worker exited with code ${code} before it answered.`,
          ),
        );
      });
    });
  });
}

/**
 * The worker side: load the consumer's React in this realm, render, and post
 * the result or the failure back.
 */
async function answerParent(data) {
  try {
    const result = await renderModuleRemoteInRealm({
      ...data,
      ...loadConsumerReact(createRequire(join(data.root, "package.json"))),
      globalObject: globalThis,
      importEntry: (url) => import(url),
      onStage: (stage) => {
        parentPort.postMessage({ stage, type: "stage" });
      },
    });
    parentPort.postMessage({ result, type: "done" });
  } catch (error) {
    parentPort.postMessage({
      message: error instanceof Error ? error.message : String(error),
      type: "failed",
    });
  }
}

if (!isMainThread && workerData?.[WORKER_FLAG] === true) {
  await answerParent(workerData);
}
