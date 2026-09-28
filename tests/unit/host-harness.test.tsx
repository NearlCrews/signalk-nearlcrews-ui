import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

import {
  createHostShareScope,
  HOST_HARNESS_MARKER,
  type HostConfigurationPanelProps,
  HostPanelFrame,
  loadPanelRemote,
  type PanelRemoteContainer,
} from "../../src/host-harness.js";

const PACKAGE_NAME = "signalk-harness-panel";
const GLOBAL_NAME = "signalk_harness_panel";
const REMOTE_URL = `/${PACKAGE_NAME}/remoteEntry.js`;

afterEach(() => {
  Reflect.deleteProperty(window, GLOBAL_NAME);
  for (const script of document.querySelectorAll("script")) script.remove();
  vi.restoreAllMocks();
});

/** A container whose panel shows the configuration it holds and saves one. */
function panelContainer(
  panel: React.ComponentType<HostConfigurationPanelProps> = SavingPanel,
): {
  readonly get: Mock<PanelRemoteContainer["get"]>;
  readonly init: Mock<PanelRemoteContainer["init"]>;
} {
  return {
    get: vi.fn<PanelRemoteContainer["get"]>(() =>
      Promise.resolve(() => ({ default: panel })),
    ),
    init: vi.fn<PanelRemoteContainer["init"]>(),
  };
}

function SavingPanel({
  configuration,
  save,
}: HostConfigurationPanelProps): React.JSX.Element {
  return (
    <div>
      <p>
        {configuration === undefined
          ? "undefined"
          : JSON.stringify(configuration)}
      </p>
      <button type="button" onClick={() => save({ depth: 3 })}>
        Save
      </button>
    </div>
  );
}

/** Registers a classic container the way its remote entry would. */
function registerClassic(container: PanelRemoteContainer): void {
  Object.defineProperty(window, GLOBAL_NAME, {
    configurable: true,
    value: container,
    writable: true,
  });
}

/** An ES module the harness can import, as a data URL. */
function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`;
}

describe("createHostShareScope", () => {
  it("shapes each share the way the Admin loader's fallback does", async () => {
    const scope = createHostShareScope(React, ReactDOM);

    expect(Object.keys(scope)).toEqual(["react", "react-dom"]);
    const reactShare = scope.react[React.version];
    expect(reactShare).toEqual({
      eager: true,
      from: "adminUI",
      get: expect.any(Function) as unknown,
      loaded: true,
      shareConfig: { requiredVersion: `^${React.version}`, singleton: true },
    });
    expect((await reactShare?.get())?.()).toBe(React);
    expect((await scope["react-dom"][ReactDOM.version]?.get())?.()).toBe(
      ReactDOM,
    );
    expect(
      Reflect.get(scope, HOST_HARNESS_MARKER),
      "a non-enumerable brand the consumer check finds",
    ).toBe(true);
  });

  it("registers an under-reported version, as Signal K 2.24 and 2.25 did", () => {
    const scope = createHostShareScope(React, ReactDOM, {
      reportedVersion: "19.0.0",
    });

    expect(Object.keys(scope.react)).toEqual(["19.0.0"]);
    expect(scope["react-dom"]["19.0.0"]?.shareConfig.requiredVersion).toBe(
      "^19.0.0",
    );
  });
});

describe("loadPanelRemote", () => {
  it("takes a classic container already on the page", async () => {
    const container = panelContainer();
    registerClassic(container);

    await expect(
      loadPanelRemote({ packageName: PACKAGE_NAME, url: REMOTE_URL }),
    ).resolves.toBe(container);
    expect(document.querySelector("script")).toBeNull();
  });

  it("injects the classic script the server would have written and reads the global", async () => {
    const container = panelContainer();
    const loading = loadPanelRemote({
      packageName: PACKAGE_NAME,
      type: "classic",
      url: REMOTE_URL,
    });

    const script = document.querySelector("script");
    expect(script?.getAttribute("src")).toBe(REMOTE_URL);
    expect(script?.hasAttribute(HOST_HARNESS_MARKER)).toBe(true);
    registerClassic(container);
    script?.dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBe(container);
  });

  it("reuses a script already on the page", async () => {
    const existing = document.createElement("script");
    existing.setAttribute("src", REMOTE_URL);
    document.head.append(existing);
    const loading = loadPanelRemote({
      packageName: PACKAGE_NAME,
      url: REMOTE_URL,
    });

    expect(document.querySelectorAll("script")).toHaveLength(1);
    existing.dispatchEvent(new Event("error"));

    await expect(loading).rejects.toThrow(
      `signalk-nearlcrews-ui: Module "${PACKAGE_NAME}" is not available. Make sure the webapp is installed.`,
    );
  });

  it("imports a module remote and reads get and init off it", async () => {
    const url = moduleUrl(
      "export const get = async () => () => ({ default: () => null });\nexport const init = () => {};",
    );

    const container = await loadPanelRemote({
      packageName: PACKAGE_NAME,
      type: "module",
      url,
    });

    expect(typeof container.get).toBe("function");
    expect(typeof container.init).toBe("function");
  });

  it("refuses a module remote without get and init", async () => {
    const url = moduleUrl("export const get = () => {};");

    await expect(
      loadPanelRemote({ packageName: PACKAGE_NAME, type: "module", url }),
    ).rejects.toThrow(
      `signalk-nearlcrews-ui: Module "${PACKAGE_NAME}" is not available.`,
    );
  });
});

describe("HostPanelFrame", () => {
  it("opens the panel with configuration undefined and holds what it saves", async () => {
    const container = panelContainer();
    registerClassic(container);
    const onSave = vi.fn();

    const { container: host } = render(
      <HostPanelFrame
        onSave={onSave}
        packageName={PACKAGE_NAME}
        url={REMOTE_URL}
      />,
    );

    expect(host.firstElementChild?.hasAttribute(HOST_HARNESS_MARKER)).toBe(
      true,
    );
    expect(await screen.findByText("undefined")).toBeInTheDocument();
    expect(container.init).toHaveBeenCalledTimes(1);
    expect(container.get).toHaveBeenCalledWith("./PluginConfigurationPanel");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ depth: 3 });
    expect(await screen.findByText('{"depth":3}')).toBeInTheDocument();
  });

  it("seeds the configuration it is given and shares one scope across frames", async () => {
    const container = panelContainer();
    registerClassic(container);
    const shareScope = createHostShareScope(React, ReactDOM);

    render(
      <>
        <HostPanelFrame
          configuration={{}}
          packageName={PACKAGE_NAME}
          shareScope={shareScope}
          url={REMOTE_URL}
        />
        <HostPanelFrame
          configuration={{ depth: 1 }}
          packageName={PACKAGE_NAME}
          shareScope={shareScope}
          url={REMOTE_URL}
        />
      </>,
    );

    expect(await screen.findByText("{}")).toBeInTheDocument();
    expect(await screen.findByText('{"depth":1}')).toBeInTheDocument();
    expect(
      container.init,
      "a container initializes once",
    ).toHaveBeenCalledTimes(1);
    expect(container.init).toHaveBeenCalledWith(shareScope);
  });

  it("renders the Admin's own error module when the remote is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const url = moduleUrl("export const nothing = 1;");

    render(
      <HostPanelFrame packageName={PACKAGE_NAME} type="module" url={url} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Error loading component" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Module "${PACKAGE_NAME}" is not available. Make sure the webapp is installed.`,
      ),
    ).toBeInTheDocument();
  });

  it("words the other load failures as the Admin does", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cases: readonly [PanelRemoteContainer, string][] = [
      [
        { get: () => Promise.resolve(undefined), init: () => undefined },
        `Module "${PACKAGE_NAME}" does not export the required component.`,
      ],
      [
        {
          get: () =>
            Promise.reject(
              new TypeError(
                "Cannot read properties of undefined (reading 'x')",
              ),
            ),
          init: () => undefined,
        },
        `This webapp may be incompatible with React 19. It may need to be updated by its developer. (${PACKAGE_NAME})`,
      ],
      [
        {
          get: () => Promise.reject(new Error("Boom")),
          init: () => {
            throw new Error("Container has already been initialized");
          },
        },
        "Failed to load webapp: Boom",
      ],
    ];

    for (const [container, message] of cases) {
      registerClassic(container);
      const { unmount } = render(
        <HostPanelFrame packageName={PACKAGE_NAME} url={REMOTE_URL} />,
      );
      expect(await screen.findByText(message)).toBeInTheDocument();
      unmount();
    }
  });

  it("catches a panel that throws in the Admin's own boundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Broken(): React.JSX.Element {
      throw new Error("Panel exploded");
    }
    registerClassic(panelContainer(Broken));

    await act(() => {
      render(<HostPanelFrame packageName={PACKAGE_NAME} url={REMOTE_URL} />);
      return Promise.resolve();
    });

    expect(
      await screen.findByRole("heading", {
        name: "Plugin Configuration Unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(PACKAGE_NAME)).toBeInTheDocument();
    expect(screen.getByText("Panel exploded")).toBeInTheDocument();
  });
});
