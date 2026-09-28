/**
 * A consumer's browser test fixture, compiled against the packed declarations
 * of `signalk-nearlcrews-ui/host-harness`: the entry a consumer imports from a
 * Playwright fixture page, never from its panel.
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import {
  createHostShareScope,
  HOST_HARNESS_MARKER,
  type HostConfigurationPanelProps,
  HostPanelFrame,
  type HostPanelFrameProps,
  type HostShareScope,
  loadPanelRemote,
  type PanelRemoteContainer,
} from "signalk-nearlcrews-ui/host-harness";

const REMOTE_URL = "/signalk-example/remoteEntry.js";

// A scope registered the way Signal K 2.24.0 and 2.25.0 under-reported React.
const shareScope: HostShareScope = createHostShareScope(React, ReactDOM, {
  reportedVersion: "19.0.0",
});

const saved: unknown[] = [];

const frame: HostPanelFrameProps = {
  configuration: {},
  onSave: (configuration) => {
    saved.push(configuration);
  },
  packageName: "signalk-example",
  shareScope,
  type: "module",
  url: REMOTE_URL,
};

export function mountFixture(root: HTMLElement): void {
  createRoot(root).render(<HostPanelFrame {...frame} />);
}

export function loadContainer(): Promise<PanelRemoteContainer> {
  return loadPanelRemote({ packageName: "signalk-example", url: REMOTE_URL });
}

export function isHarnessElement(element: Element): boolean {
  return element.hasAttribute(HOST_HARNESS_MARKER);
}

export function SavingPanel({
  configuration,
  save,
}: HostConfigurationPanelProps): React.JSX.Element {
  return (
    <button type="button" onClick={() => save(configuration)}>
      Save {saved.length}
    </button>
  );
}
