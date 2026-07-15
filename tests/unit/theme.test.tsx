import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  PanelRoot,
  SegmentedControl,
  THEME_STORAGE_KEY,
  type ThemeChoice,
  ThemeToggle,
} from "../../src/index.js";

describe("PanelRoot themes", () => {
  it("uses full width by default and offers bounded width options", () => {
    render(
      <>
        <PanelRoot data-testid="full">Full</PanelRoot>
        <PanelRoot data-testid="standard" width="standard">
          Standard
        </PanelRoot>
        <PanelRoot data-testid="wide" width="wide">
          Wide
        </PanelRoot>
      </>,
    );

    expect(screen.getByTestId("full")).toHaveClass("snui-root--full");
    expect(screen.getByTestId("standard")).toHaveClass("snui-root--standard");
    expect(screen.getByTestId("wide")).toHaveClass("snui-root--wide");
  });

  it("mounts one head style per nonce and reference-counts panel roots", () => {
    const { container, unmount } = render(
      <>
        <PanelRoot styleNonce="fixture-nonce">
          <p>First panel</p>
        </PanelRoot>
        <PanelRoot styleNonce="fixture-nonce">
          <p>Second panel</p>
        </PanelRoot>
      </>,
    );

    const root = container.querySelector("[data-snui-version]");
    const styles = document.head.querySelectorAll("style[data-snui-styles]");
    const style = styles[0];

    expect(root).toHaveAttribute("data-snui-version", "0.1.0");
    expect(root).toHaveAttribute("data-snui-root");
    expect(root?.querySelector("style")).toBeNull();
    expect(styles).toHaveLength(1);
    expect(style).toHaveAttribute("nonce", "fixture-nonce");
    expect(style?.textContent).toContain(
      '.snui-root[data-snui-version="0.1.0"]',
    );
    expect(style?.textContent).not.toMatch(/(^|[\s,{]):root([\s,{]|$)/m);

    unmount();
    expect(document.querySelector("style[data-snui-styles]")).toBeNull();
  });

  it("preserves the installed style when a forwarded ref changes", () => {
    const firstRef = vi.fn();
    const secondRef = vi.fn();
    const { rerender, unmount } = render(
      <PanelRoot ref={firstRef}>Embedded panel</PanelRoot>,
    );
    const installedStyle = document.head.querySelector(
      "style[data-snui-styles]",
    );

    rerender(<PanelRoot ref={secondRef}>Embedded panel</PanelRoot>);

    expect(firstRef).toHaveBeenLastCalledWith(null);
    expect(secondRef).toHaveBeenLastCalledWith(
      screen.getByText("Embedded panel"),
    );
    expect(document.head.querySelector("style[data-snui-styles]")).toBe(
      installedStyle,
    );

    unmount();
    expect(document.head.querySelector("style[data-snui-styles]")).toBeNull();
  });

  it("removes styles when a forwarded ref throws during attachment", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() =>
      render(
        <PanelRoot
          ref={() => {
            throw new Error("Consumer ref failed.");
          }}
        >
          Embedded panel
        </PanelRoot>,
      ),
    ).toThrow("Consumer ref failed.");
    expect(document.head.querySelector("style[data-snui-styles]")).toBeNull();
    consoleError.mockRestore();
  });

  it("keeps separately nonced style elements isolated", () => {
    const { unmount } = render(
      <>
        <PanelRoot styleNonce="first">First</PanelRoot>
        <PanelRoot styleNonce="second">Second</PanelRoot>
      </>,
    );

    expect(
      document.head.querySelectorAll("style[data-snui-styles]"),
    ).toHaveLength(2);
    unmount();
    expect(
      document.head.querySelectorAll("style[data-snui-styles]"),
    ).toHaveLength(0);
  });

  it("installs styles in the rendered root's owner document", () => {
    const ownerDocument = document.implementation.createHTMLDocument(
      "Embedded Signal K panel",
    );
    const container = ownerDocument.createElement("div");
    ownerDocument.body.append(container);

    const { unmount } = render(<PanelRoot>Embedded panel</PanelRoot>, {
      container,
    });

    expect(
      ownerDocument.head.querySelectorAll("style[data-snui-styles]"),
    ).toHaveLength(1);
    expect(
      document.head.querySelectorAll("style[data-snui-styles]"),
    ).toHaveLength(0);

    unmount();
    expect(
      ownerDocument.head.querySelectorAll("style[data-snui-styles]"),
    ).toHaveLength(0);
  });

  it("deduplicates styles across independently loaded package bundles", async () => {
    const firstBundle = await import("../../src/styles/install.js");
    vi.resetModules();
    const secondBundle = await import("../../src/styles/install.js");

    const removeFirst = firstBundle.installPanelStyles(
      document,
      "fixture-version",
      ".fixture { color: red; }",
      undefined,
    );
    const removeSecond = secondBundle.installPanelStyles(
      document,
      "fixture-version",
      ".fixture { color: red; }",
      undefined,
    );

    expect(
      document.head.querySelectorAll(
        'style[data-snui-styles="fixture-version"]',
      ),
    ).toHaveLength(1);
    removeFirst();
    expect(
      document.head.querySelectorAll(
        'style[data-snui-styles="fixture-version"]',
      ),
    ).toHaveLength(1);
    removeSecond();
    expect(
      document.head.querySelectorAll(
        'style[data-snui-styles="fixture-version"]',
      ),
    ).toHaveLength(0);
  });

  it("rejects conflicting styles that claim the same version", async () => {
    const { installPanelStyles } = await import("../../src/styles/install.js");
    const remove = installPanelStyles(
      document,
      "conflicting-version",
      ".fixture { color: red; }",
      undefined,
    );

    expect(() =>
      installPanelStyles(
        document,
        "conflicting-version",
        ".fixture { color: blue; }",
        undefined,
      ),
    ).toThrow(/Conflicting signalk-nearlcrews-ui styles/);
    remove();
  });

  it("rejects same-version style conflicts across different nonces", async () => {
    const { installPanelStyles } = await import("../../src/styles/install.js");
    const remove = installPanelStyles(
      document,
      "cross-nonce-conflict",
      ".fixture { color: red; }",
      "first-nonce",
    );

    expect(() =>
      installPanelStyles(
        document,
        "cross-nonce-conflict",
        ".fixture { color: blue; }",
        "second-nonce",
      ),
    ).toThrow(/Conflicting signalk-nearlcrews-ui styles/);
    expect(
      document.head.querySelectorAll(
        'style[data-snui-styles="cross-nonce-conflict"]',
      ),
    ).toHaveLength(1);
    remove();
  });

  it("rejects browser engines with an undefined CSS scope constructor", async () => {
    const { installPanelStyles } = await import("../../src/styles/install.js");
    const unsupportedDocument = {
      defaultView: {
        CSSScopeRule: undefined,
        navigator: { userAgent: "unsupported-browser" },
      },
    } as unknown as Document;

    expect(() =>
      installPanelStyles(
        unsupportedDocument,
        "unsupported-version",
        ".fixture { color: red; }",
        undefined,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui requires a browser with native CSS @scope support.",
    );
  });

  it("persists a shared theme and synchronizes mounted panel roots", async () => {
    const user = userEvent.setup();

    render(
      <>
        <PanelRoot data-testid="first-panel">
          <ThemeToggle legend="First panel theme" />
        </PanelRoot>
        <PanelRoot data-testid="second-panel">
          <ThemeToggle legend="Second panel theme" />
        </PanelRoot>
      </>,
    );

    const firstGroup = screen.getByRole("radiogroup", {
      name: "First panel theme",
    });
    await user.click(within(firstGroup).getByRole("radio", { name: "Dark" }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await waitFor(() => {
      expect(screen.getByTestId("first-panel")).toHaveAttribute(
        "data-snui-theme",
        "dark",
      );
      expect(screen.getByTestId("second-panel")).toHaveAttribute(
        "data-snui-theme",
        "dark",
      );
    });
  });

  it("migrates a valid plugin-specific legacy key once", async () => {
    window.localStorage.setItem("cl-theme", "night");

    render(
      <PanelRoot data-testid="panel" legacyThemeStorageKeys={["cl-theme"]}>
        <ThemeToggle />
      </PanelRoot>,
    );

    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("night");
    });
  });

  it("reconciles competing legacy preferences across simultaneous roots", async () => {
    window.localStorage.setItem("first-theme", "night");
    window.localStorage.setItem("second-theme", "dark");

    render(
      <>
        <PanelRoot
          data-testid="first-panel"
          legacyThemeStorageKeys={["first-theme"]}
        >
          First
        </PanelRoot>
        <PanelRoot
          data-testid="second-panel"
          legacyThemeStorageKeys={["second-theme"]}
        >
          Second
        </PanelRoot>
      </>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("night");
      expect(screen.getByTestId("first-panel")).toHaveAttribute(
        "data-snui-theme",
        "night",
      );
      expect(screen.getByTestId("second-panel")).toHaveAttribute(
        "data-snui-theme",
        "night",
      );
    });
  });

  it("ignores invalid persisted values", async () => {
    window.localStorage.setItem("legacy-theme", "blue");

    render(
      <PanelRoot data-testid="panel" legacyThemeStorageKeys={["legacy-theme"]}>
        <ThemeToggle />
      </PanelRoot>,
    );

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("auto");
    });
  });

  it("keeps the selected theme when browser storage is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable.", "SecurityError");
    });

    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "dark",
    );
  });

  it("synchronizes a theme change delivered by the browser storage event", () => {
    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle />
      </PanelRoot>,
    );
    window.localStorage.setItem(THEME_STORAGE_KEY, "night");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
      );
    });

    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
  });

  it("returns to Auto when another tab clears local storage", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    window.localStorage.clear();
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: null,
          storageArea: window.localStorage,
        }),
      );
    });

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
  });

  it("uses Auto when browser storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable.", "SecurityError");
    });

    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle />
      </PanelRoot>,
    );

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
  });

  it("requires ThemeToggle to be inside PanelRoot", () => {
    expect(() => render(<ThemeToggle />)).toThrow(
      "ThemeToggle must be rendered inside PanelRoot.",
    );
  });
});

describe("SegmentedControl", () => {
  function ControlledControl(): React.JSX.Element {
    const [value, setValue] = useState<ThemeChoice>("auto");

    return (
      <SegmentedControl
        legend="Display mode"
        value={value}
        onChange={setValue}
        options={[
          { label: "Auto", value: "auto" },
          { label: "Light", value: "light", disabled: true },
          { label: "Dark", value: "dark" },
          { label: "Night", value: "night" },
        ]}
      />
    );
  }

  it("uses radio semantics and supports roving arrow-key selection", async () => {
    const user = userEvent.setup();
    render(<ControlledControl />);

    const auto = screen.getByRole("radio", { name: "Auto" });
    auto.focus();
    await user.keyboard("{ArrowRight}");

    const dark = screen.getByRole("radio", { name: "Dark" });
    expect(dark).toHaveAttribute("aria-checked", "true");
    expect(dark).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{Home}");
    expect(auto).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Light" })).toBeDisabled();
  });

  it("moves backward from a disabled selected option", async () => {
    const user = userEvent.setup();

    function DisabledSelection(): React.JSX.Element {
      const [value, setValue] = useState<ThemeChoice>("light");
      return (
        <SegmentedControl
          legend="Display mode"
          value={value}
          onChange={setValue}
          options={[
            { label: "Auto", value: "auto" },
            { label: "Light", value: "light", disabled: true },
            { label: "Dark", value: "dark" },
            { label: "Night", value: "night" },
          ]}
        />
      );
    }

    render(<DisabledSelection />);
    const auto = screen.getByRole("radio", { name: "Auto" });
    expect(auto).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    auto.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
