import type { ComponentType } from "react";
import { packageError } from "../utils/errors.js";
import { windowGlobal } from "../utils/window-global.js";
import { HOST_HARNESS_MARKER } from "./marker.js";
import type { HostShareScope } from "./share-scope.js";

/** The props the Signal K Admin passes a configuration panel. */
export interface HostConfigurationPanelProps {
  readonly configuration: unknown;
  readonly save: (configuration: unknown) => void;
}

/** What a remote's exposed module factory returns. */
export interface PanelRemoteModule {
  readonly default: ComponentType<HostConfigurationPanelProps>;
}

/** A Module Federation container, as the Admin loader calls it. */
export interface PanelRemoteContainer {
  get(module: string): Promise<(() => PanelRemoteModule) | undefined | null>;
  init(shareScope: HostShareScope): Promise<void> | void;
}

/**
 * The script tag the Signal K server writes for a package: `"module"` when its
 * package.json `type` is `"module"`, `"classic"` otherwise.
 */
export type PanelRemoteType = "classic" | "module";

export interface LoadPanelRemoteOptions {
  /** The consumer's npm package name, which names a classic container's global. */
  readonly packageName: string;
  /** Which script tag the server writes for the package. Default `"classic"`. */
  readonly type?: PanelRemoteType | undefined;
  /** The remote entry's URL, as the test page serves it. */
  readonly url: string;
}

/** How long the Admin waits on a classic script before reading its global. */
const SCRIPT_LOAD_TIMEOUT_MS = 10_000;

/**
 * The global the Admin reads a classic container from: the package name with
 * `-`, `@`, and `/` replaced by underscores, as the loader's `toSafeModuleId`
 * builds it.
 *
 * @internal Held equal to the consumer check's copy by a unit test.
 */
export function safeModuleId(packageName: string): string {
  return packageName.replaceAll(/[-@/]/g, "_");
}

/**
 * The error the Admin shows for a remote it could not load.
 *
 * @internal Shared with `HostPanelFrame`; not part of the entry.
 */
export function remoteUnavailableMessage(packageName: string): string {
  return `Module "${packageName}" is not available. Make sure the webapp is installed.`;
}

/**
 * Waits for a classic script to run. The server writes the tag into the Admin
 * page; a test page has no server, so the harness writes it when none is
 * there. Like the Admin, it waits for load, error, or a timeout, and the
 * caller reads the global afterwards.
 */
function loadClassicScript(url: string): Promise<void> {
  return new Promise((resolve) => {
    let script = [...document.querySelectorAll("script[src]")].find(
      (candidate) => candidate.getAttribute("src") === url,
    );
    if (script === undefined) {
      script = document.createElement("script");
      script.setAttribute("src", url);
      script.setAttribute(HOST_HARNESS_MARKER, "");
      document.head.append(script);
    }
    const timer = window.setTimeout(resolve, SCRIPT_LOAD_TIMEOUT_MS);
    const done = (): void => {
      window.clearTimeout(timer);
      resolve();
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", done, { once: true });
  });
}

/** Whether a module namespace carries the container the Admin reads off it. */
function isContainer(value: unknown): value is PanelRemoteContainer {
  const candidate = value as Partial<PanelRemoteContainer> | null;
  return (
    typeof candidate?.get === "function" && typeof candidate.init === "function"
  );
}

/**
 * Loads a panel container the way the Signal K Admin loader does: a container
 * already on the page's global wins; otherwise a module remote is imported and
 * its `get` and `init` exports are the container, and a classic remote's
 * script is run and its global read. Rejects with the Admin's own words,
 * after the package prefix, when no container results.
 */
export async function loadPanelRemote({
  packageName,
  type = "classic",
  url,
}: LoadPanelRemoteOptions): Promise<PanelRemoteContainer> {
  const globalName = safeModuleId(packageName);
  const existing = windowGlobal<PanelRemoteContainer>(window, globalName);
  if (existing !== undefined) return existing;

  if (type === "module") {
    let namespace: unknown;
    try {
      namespace = await import(/* @vite-ignore */ url);
    } catch (cause) {
      throw packageError(remoteUnavailableMessage(packageName), { cause });
    }
    if (isContainer(namespace)) return namespace;
    throw packageError(remoteUnavailableMessage(packageName));
  }

  await loadClassicScript(url);
  const container = windowGlobal<PanelRemoteContainer>(window, globalName);
  if (container === undefined) {
    throw packageError(remoteUnavailableMessage(packageName));
  }
  return container;
}
