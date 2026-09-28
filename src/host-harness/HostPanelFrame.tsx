import * as React from "react";
import {
  Component,
  createElement,
  type ReactNode,
  Suspense,
  useState,
} from "react";
import * as ReactDOM from "react-dom";

import {
  loadPanelRemote,
  type PanelRemoteContainer,
  type PanelRemoteModule,
  type PanelRemoteType,
  remoteUnavailableMessage,
} from "./load-remote.js";
import { HOST_HARNESS_MARKER } from "./marker.js";
import { createHostShareScope, type HostShareScope } from "./share-scope.js";

export interface HostPanelFrameProps {
  /**
   * The configuration the host holds when the panel opens. Leave it unset for
   * a plugin nobody has configured, which the host passes as undefined; pass
   * `{}` for a package enabled by default before its first save.
   */
  readonly configuration?: unknown;
  /** Called with what the panel saves, as the host posts it to the server. */
  readonly onSave?: ((configuration: unknown) => void) | undefined;
  /** The consumer's npm package name. */
  readonly packageName: string;
  /**
   * The share scope to initialize the container with. Defaults to one scope
   * per page built from the React this frame renders with, as the Admin keeps
   * one fallback scope for every remote.
   */
  readonly shareScope?: HostShareScope | undefined;
  /** Which script tag the server writes for the package. Default `"classic"`. */
  readonly type?: PanelRemoteType | undefined;
  /** The remote entry's URL, as the test page serves it. */
  readonly url: string;
}

/** The module the Admin asks every configurator's container for. */
const PLUGIN_CONFIG_PANEL = "./PluginConfigurationPanel";

let pageShareScope: HostShareScope | undefined;
/**
 * Each container's initialization, so frames that open together share one
 * rather than racing to initialize the same container twice.
 */
const containerInitializations = new WeakMap<
  PanelRemoteContainer,
  Promise<void>
>();

/** The Admin's fallback for a module it could not load. */
function errorModule(message: string): PanelRemoteModule {
  function ErrorLoadingComponent(): ReactNode {
    return (
      <div className="p-4 text-center">
        <h4 className="text-danger">Error loading component</h4>
        <p className="text-secondary small mt-3">{message}</p>
      </div>
    );
  }
  return { default: ErrorLoadingComponent };
}

/**
 * Initializes a container once, as the Admin does. A container another code
 * path already initialized says so, and that is not a failure.
 */
async function initialize(
  container: PanelRemoteContainer,
  shareScope: HostShareScope,
): Promise<void> {
  try {
    await container.init(shareScope);
  } catch (error) {
    if (
      !(
        error instanceof Error &&
        error.message.includes("already been initialized")
      )
    ) {
      throw error;
    }
  }
}

function initializeContainer(
  container: PanelRemoteContainer,
  shareScope: HostShareScope,
): Promise<void> {
  let initialization = containerInitializations.get(container);
  if (initialization === undefined) {
    // A failed initialization is forgotten, so the next frame tries again as
    // the Admin would.
    initialization = initialize(container, shareScope).catch(
      (error: unknown) => {
        containerInitializations.delete(container);
        throw error;
      },
    );
    containerInitializations.set(container, initialization);
  }
  return initialization;
}

/**
 * The React 19 path of the Admin's `toLazyDynamicComponent`: load the
 * container, initialize it, get the panel, and turn each failure into the
 * error module the Admin renders in its place.
 */
async function loadPanelRemoteModule(
  options: Pick<HostPanelFrameProps, "packageName" | "type" | "url">,
  shareScope: HostShareScope,
): Promise<PanelRemoteModule> {
  const { packageName } = options;
  let container: PanelRemoteContainer;
  try {
    container = await loadPanelRemote(options);
  } catch {
    console.error(`Could not load module ${packageName}`);
    return errorModule(remoteUnavailableMessage(packageName));
  }
  try {
    await initializeContainer(container, shareScope);
    const factory = await container.get(PLUGIN_CONFIG_PANEL);
    if (!factory) {
      return errorModule(
        `Module "${packageName}" does not export the required component.`,
      );
    }
    return factory();
  } catch (error) {
    console.error(
      `Error loading ${PLUGIN_CONFIG_PANEL} from ${packageName}:`,
      error,
    );
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("hasOwnProperty") ||
      message.includes("Cannot read properties of undefined") ||
      (message.includes("Cannot access") &&
        message.includes("before initialization"))
    ) {
      return errorModule(
        `This webapp may be incompatible with React 19. It may need to be updated by its developer. (${packageName})`,
      );
    }
    return errorModule(`Failed to load webapp: ${message}`);
  }
}

interface PluginErrorBoundaryProps {
  readonly children: ReactNode;
  readonly pluginName: string;
}

interface PluginErrorBoundaryState {
  readonly error: Error | null;
}

/** The Admin's own boundary around a configuration panel, with its words. */
class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  override state: PluginErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { error };
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return (
      <div className="alert alert-warning">
        <h5>Plugin Configuration Unavailable</h5>
        <p>
          The configuration panel for <strong>{this.props.pluginName}</strong>{" "}
          could not be loaded. This plugin may need to be updated for React 19
          compatibility.
        </p>
        <details>
          <summary>Technical details</summary>
          <pre style={{ fontSize: "0.8rem" }}>{error.message}</pre>
        </details>
      </div>
    );
  }
}

/**
 * Renders a built panel remote the way the Signal K Admin's configuration
 * view does, for a consumer's browser tests: the Admin's error boundary and
 * Suspense fallback around the lazily loaded panel, `configuration` held in
 * state seeded from the prop, and `save` replacing it. The outer element
 * stands in for the card body the Admin renders the panel inside.
 *
 * Mirrors `EmbeddedPluginConfigurationForm` and `toLazyDynamicComponent` in
 * signalk-server at 756b555d (2.33.0). The legacy React 16 bridge is left
 * out: a panel built on this package needs React 19.
 */
export function HostPanelFrame({
  configuration: initialConfiguration,
  onSave,
  packageName,
  shareScope,
  type,
  url,
}: HostPanelFrameProps): ReactNode {
  const [Panel] = useState(() =>
    React.lazy(() => {
      pageShareScope ??= createHostShareScope(React, ReactDOM);
      return loadPanelRemoteModule(
        { packageName, type, url },
        shareScope ?? pageShareScope,
      );
    }),
  );
  const [configuration, setConfiguration] =
    useState<unknown>(initialConfiguration);
  const save = (next: unknown): void => {
    onSave?.(next);
    setConfiguration(next);
  };

  return (
    <div className="card-body" {...{ [HOST_HARNESS_MARKER]: "" }}>
      <PluginErrorBoundary pluginName={packageName}>
        <Suspense fallback="Loading...">
          {createElement(Panel, { configuration, save })}
        </Suspense>
      </PluginErrorBoundary>
    </div>
  );
}
