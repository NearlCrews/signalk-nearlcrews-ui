import * as React from "react";
import { createRoot, type Root } from "react-dom/client";

declare const __CLASSIC_REMOTE_URL__: string;
declare const __ESM_REMOTE_URL__: string;

interface RemoteContainer {
  get(module: string): Promise<() => { default: React.ComponentType }>;
  init(scope: ShareScope): Promise<void> | void;
}

interface ShareScope {
  readonly react: Record<
    string,
    {
      readonly eager: boolean;
      readonly from: string;
      readonly get: () => Promise<() => typeof React>;
      readonly loaded: boolean;
    }
  >;
}

declare global {
  interface Window {
    signalkNearlcrewsUiClassicFixture?: RemoteContainer;
    unmountFederationFixture?: (rootId: string) => void;
  }
}

const shareScope: ShareScope = {
  react: {
    [React.version]: {
      eager: true,
      from: "fixture-host",
      get: () => Promise.resolve(() => React),
      loaded: true,
    },
  },
};

function loadClassicContainer(): Promise<RemoteContainer> {
  return new Promise((resolveContainer, reject) => {
    const script = document.createElement("script");
    script.src = __CLASSIC_REMOTE_URL__;
    script.addEventListener("load", () => {
      const container = window.signalkNearlcrewsUiClassicFixture;
      if (container === undefined) {
        reject(new Error("Classic container was not registered."));
        return;
      }
      resolveContainer(container);
    });
    script.addEventListener("error", () => {
      reject(new Error("Classic remoteEntry.js failed to load."));
    });
    document.head.append(script);
  });
}

async function loadEsmContainer(): Promise<RemoteContainer> {
  return (await import(
    /* @vite-ignore */ __ESM_REMOTE_URL__
  )) as RemoteContainer;
}

async function renderRemote(
  container: RemoteContainer,
  rootId: string,
): Promise<Root> {
  await container.init(shareScope);
  const factory = await container.get("./Panel");
  const module = factory();
  const root = document.querySelector(`#${rootId}`);
  if (!(root instanceof HTMLElement)) {
    throw new Error(`Missing federation fixture root: ${rootId}`);
  }
  const reactRoot = createRoot(root);
  reactRoot.render(<module.default />);
  return reactRoot;
}

try {
  const [classicContainer, esmContainer] = await Promise.all([
    loadClassicContainer(),
    loadEsmContainer(),
  ]);
  const mountedRoots = await Promise.all([
    renderRemote(classicContainer, "classic-root"),
    renderRemote(esmContainer, "esm-root"),
  ]);
  const rootsById = new Map([
    ["classic-root", mountedRoots[0]],
    ["esm-root", mountedRoots[1]],
  ]);
  window.unmountFederationFixture = (rootId) => {
    rootsById.get(rootId)?.unmount();
    rootsById.delete(rootId);
  };
  document.body.dataset.federationReady = "true";
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const errorElement = document.querySelector("#federation-error");
  if (errorElement !== null) errorElement.textContent = message;
  document.body.dataset.federationReady = "false";
}
