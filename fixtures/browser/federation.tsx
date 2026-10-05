import * as React from "react";
import * as ReactDOM from "react-dom";
import type { Root } from "react-dom/client";
import {
  createHostShareScope,
  HostPanelFrame,
  loadPanelRemote,
  type PanelRemoteType,
} from "signalk-nearlcrews-ui/host-harness";
import { mountFixture } from "./mount.js";

declare const __CLASSIC_REMOTE_URL__: string;
declare const __ESM_REMOTE_URL__: string;

declare global {
  interface Window {
    unmountFederationFixture?: (rootId: string) => void;
  }
}

/**
 * The version Signal K Admin 2.24.0 and 2.25.0 register their React share as,
 * whatever React they ship; every release from 2.26.0 registers React.version.
 * Under-reporting on those two supported releases is the only reason the
 * package's shares are non-strict singletons, so one of the two remotes here
 * is loaded against it rather than against the installed version, and both
 * have to mount against the host React either way.
 */
const HOST_REPORTED_REACT_VERSION = "19.0.0";

interface FixtureRemote {
  /**
   * The configuration the host opens the panel with. Each remote opens in one
   * of the two states the Signal K Admin opens a panel in before its first
   * save: undefined for a plugin nobody has configured, `{}` for a package
   * enabled by default.
   */
  readonly configuration: unknown;
  /**
   * The package the Admin would know the remote by. The classic remote's
   * container global is derived from it, so it matches the Webpack library
   * name; the module remote takes another, because the Admin reads a global
   * of the same name before it imports anything.
   */
  readonly packageName: string;
  readonly reportedVersion?: string;
  readonly rootId: string;
  readonly type: PanelRemoteType;
  readonly url: string;
}

const REMOTES: readonly FixtureRemote[] = [
  {
    configuration: undefined,
    packageName: "signalk-nearlcrews-ui",
    rootId: "classic-root",
    type: "classic",
    url: __CLASSIC_REMOTE_URL__,
  },
  {
    configuration: {},
    packageName: "signalk-nearlcrews-ui-module-fixture",
    reportedVersion: HOST_REPORTED_REACT_VERSION,
    rootId: "esm-root",
    type: "module",
    url: __ESM_REMOTE_URL__,
  },
];

function mountRemote(remote: FixtureRemote): Root {
  // mountFixture mounts every browser fixture under StrictMode, and here it
  // matters most of all: this is the fixture that mounts and unmounts remotes
  // and then asserts the document is left with no style elements, so the
  // double invocation catches an effect whose cleanup does not undo its setup.
  return mountFixture(
    <HostPanelFrame
      configuration={remote.configuration}
      packageName={remote.packageName}
      shareScope={createHostShareScope(React, ReactDOM, {
        reportedVersion: remote.reportedVersion,
      })}
      type={remote.type}
      url={remote.url}
    />,
    remote.rootId,
  );
}

try {
  // Both containers load before anything renders, so the ready flag means both
  // remotes reached the page the way the Admin loader reaches them.
  await Promise.all(REMOTES.map((remote) => loadPanelRemote(remote)));
  const rootsById = new Map(
    REMOTES.map((remote) => [remote.rootId, mountRemote(remote)]),
  );
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
