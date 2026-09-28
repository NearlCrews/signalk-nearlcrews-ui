import * as React from "react";
import * as ReactDOM from "react-dom";
import { describe, expectTypeOf, it } from "vitest";

import {
  createHostShareScope,
  type HOST_HARNESS_MARKER,
  type HostConfigurationPanelProps,
  HostPanelFrame,
  type HostPanelFrameProps,
  type HostShareScope,
  type HostShareScopeEntry,
  loadPanelRemote,
  type PanelRemoteContainer,
  type PanelRemoteType,
} from "../../src/host-harness.js";

/**
 * The host harness is published browser test tooling: its entry is versioned
 * API like any other, so its signatures are pinned here.
 */
describe("host harness types", () => {
  it("builds a share scope from the React modules a page runs", () => {
    const scope = createHostShareScope(React, ReactDOM, {
      reportedVersion: "19.0.0",
    });
    expectTypeOf(scope).toEqualTypeOf<HostShareScope>();
    expectTypeOf(scope.react).toEqualTypeOf<
      Record<string, HostShareScopeEntry>
    >();
    // @ts-expect-error a module without a version is not React
    createHostShareScope({}, ReactDOM);
  });

  it("loads a container by package name, URL, and script type", () => {
    expectTypeOf(
      loadPanelRemote({ packageName: "p", url: "/p/remoteEntry.js" }),
    ).toEqualTypeOf<Promise<PanelRemoteContainer>>();
    expectTypeOf<PanelRemoteType>().toEqualTypeOf<"classic" | "module">();
    void loadPanelRemote({
      packageName: "p",
      // @ts-expect-error the server writes only classic and module script tags
      type: "esm",
      url: "/p/remoteEntry.js",
    });
  });

  it("frames a panel with the props the Admin passes", () => {
    expectTypeOf<HostConfigurationPanelProps["save"]>().toEqualTypeOf<
      (configuration: unknown) => void
    >();
    expectTypeOf(HostPanelFrame)
      .parameter(0)
      .toEqualTypeOf<HostPanelFrameProps>();
    expectTypeOf<
      typeof HOST_HARNESS_MARKER
    >().toEqualTypeOf<"data-snui-host-harness">();
    // @ts-expect-error the frame needs the package name the Admin keys the container by
    const missing: HostPanelFrameProps = { url: "/p/remoteEntry.js" };
    expectTypeOf(missing).not.toBeNever();
  });
});
