import { HOST_HARNESS_MARKER } from "./marker.js";

/** One module in a Module Federation share scope, as the Admin registers it. */
export interface HostShareScopeEntry {
  readonly eager: boolean;
  readonly from: string;
  readonly get: () => Promise<() => unknown>;
  readonly loaded: boolean;
  readonly shareConfig: {
    readonly requiredVersion: string;
    readonly singleton: boolean;
  };
}

/**
 * The share scope a panel container is initialized with. The maps stay
 * writable because a container's `init` registers into the scope it is given.
 */
export interface HostShareScope {
  react: Record<string, HostShareScopeEntry>;
  "react-dom": Record<string, HostShareScopeEntry>;
}

export interface HostShareScopeOptions {
  /**
   * The version to register both shares under, in place of the modules' own.
   * Signal K 2.24.0 and 2.25.0 registered React as 19.0.0 whatever React they
   * shipped; pass that to test a panel against those hosts.
   */
  readonly reportedVersion?: string | undefined;
}

/** A module that carries its version, as React and React DOM do. */
interface VersionedModule {
  readonly version: string;
}

function hostShare(
  module: VersionedModule,
  version: string,
): Record<string, HostShareScopeEntry> {
  return {
    [version]: {
      eager: true,
      from: "adminUI",
      get: () => Promise.resolve(() => module),
      loaded: true,
      shareConfig: { requiredVersion: `^${version}`, singleton: true },
    },
  };
}

/**
 * The share scope the Signal K Admin loader falls back to for a Webpack
 * remote, built from the React and React DOM the test page runs: each module
 * under its version, already loaded, from `adminUI`, as an eager singleton
 * requiring a caret range of that version.
 */
export function createHostShareScope(
  react: VersionedModule,
  reactDom: VersionedModule,
  { reportedVersion }: HostShareScopeOptions = {},
): HostShareScope {
  const scope: HostShareScope = {
    react: hostShare(react, reportedVersion ?? react.version),
    "react-dom": hostShare(reactDom, reportedVersion ?? reactDom.version),
  };
  // Not enumerable, so a container reading the scope never sees it; it is
  // here so the consumer check finds the harness in a remote that bundled
  // only this export.
  Object.defineProperty(scope, HOST_HARNESS_MARKER, { value: true });
  return scope;
}
