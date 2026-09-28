/**
 * Browser test tooling that stands in for the Signal K Admin loader, so a
 * consumer's browser suite loads its built panel remote the way the Admin
 * does: the Admin's fallback share scope, its routing on the script tag type,
 * and its configuration view around the panel.
 *
 * It is a harness, not a component: import it from a test fixture, never
 * from a panel. It ships as its own entry point so it cannot reach a panel
 * bundle through the root, and `snui-check-consumer` fails a remote that
 * contains it. It mirrors signalk-server at 756b555d (2.33.0); the loader
 * changed in 2.25, 2.26, 2.27, and 2.29, so a host change is one edit here
 * rather than one in every consumer's fixture.
 */
export {
  HostPanelFrame,
  type HostPanelFrameProps,
} from "./host-harness/HostPanelFrame.js";
export {
  type HostConfigurationPanelProps,
  type LoadPanelRemoteOptions,
  loadPanelRemote,
  type PanelRemoteContainer,
  type PanelRemoteModule,
  type PanelRemoteType,
} from "./host-harness/load-remote.js";
export { HOST_HARNESS_MARKER } from "./host-harness/marker.js";
export {
  createHostShareScope,
  type HostShareScope,
  type HostShareScopeEntry,
  type HostShareScopeOptions,
} from "./host-harness/share-scope.js";
