import {
  act,
  type RenderResult,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CollapsibleSection,
  PanelRoot,
  supportsNativeCssScope,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  type ThemeChoice,
  ThemeToggle,
  usePanelTheme,
} from "../../src/index.js";
import { usePanelLocale } from "../../src/utils/locale.js";
import { PACKAGE_VERSION } from "../../src/version.js";
import { headSheets, ROOT_SHEET } from "../helpers.js";

/** A panel holding nothing but the theme selector, the shape most specs need. */
function renderThemePanel(): RenderResult {
  return render(
    <PanelRoot data-testid="panel">
      <ThemeToggle />
    </PanelRoot>,
  );
}

/** Makes one storage operation throw, as private browsing or a sandbox does. */
function refuseStorage(operation: "getItem" | "setItem"): void {
  vi.spyOn(Storage.prototype, operation).mockImplementation(() => {
    throw new DOMException("Storage is unavailable.", "SecurityError");
  });
}

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
    const styles = headSheets(ROOT_SHEET);
    const style = styles[0];

    expect(root).toHaveAttribute("data-snui-version", PACKAGE_VERSION);
    expect(root).toHaveAttribute("data-snui-root");
    expect(root?.querySelector("style")).toBeNull();
    expect(styles).toHaveLength(1);
    expect(style).toHaveAttribute("nonce", "fixture-nonce");
    expect(style?.textContent).toContain(
      `.snui-root[data-snui-version="${PACKAGE_VERSION}"]`,
    );
    expect(style?.textContent).not.toMatch(/(^|[\s,{]):root([\s,{]|$)/m);

    unmount();
    expect(document.querySelector(ROOT_SHEET)).toBeNull();
  });

  it("preserves the installed style when a forwarded ref changes", () => {
    const firstRef = vi.fn();
    const secondRef = vi.fn();
    const { rerender, unmount } = render(
      <PanelRoot ref={firstRef}>Embedded panel</PanelRoot>,
    );
    const [installedStyle] = headSheets(ROOT_SHEET);

    rerender(<PanelRoot ref={secondRef}>Embedded panel</PanelRoot>);

    expect(firstRef).toHaveBeenLastCalledWith(null);
    expect(secondRef).toHaveBeenLastCalledWith(
      screen.getByText("Embedded panel").closest("[data-snui-root]"),
    );
    expect(headSheets(ROOT_SHEET)[0]).toBe(installedStyle);

    unmount();
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("removes styles when a forwarded ref throws during attachment", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

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
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("keeps separately nonced style elements isolated", () => {
    const { unmount } = render(
      <>
        <PanelRoot styleNonce="first">First</PanelRoot>
        <PanelRoot styleNonce="second">Second</PanelRoot>
      </>,
    );

    expect(headSheets(ROOT_SHEET)).toHaveLength(2);
    unmount();
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
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

    expect(headSheets(ROOT_SHEET, ownerDocument)).toHaveLength(1);
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);

    unmount();
    expect(headSheets(ROOT_SHEET, ownerDocument)).toHaveLength(0);
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
      headSheets('style[data-snui-styles="fixture-version"]'),
    ).toHaveLength(1);
    removeFirst();
    expect(
      headSheets('style[data-snui-styles="fixture-version"]'),
    ).toHaveLength(1);
    removeSecond();
    expect(
      headSheets('style[data-snui-styles="fixture-version"]'),
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
    ).toThrow(/^signalk-nearlcrews-ui: Conflicting styles were loaded/);
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
    ).toThrow(/^signalk-nearlcrews-ui: Conflicting styles were loaded/);
    expect(
      headSheets('style[data-snui-styles="cross-nonce-conflict"]'),
    ).toHaveLength(1);
    remove();
  });

  it("rejects browser engines with an undefined CSS scope constructor", async () => {
    const {
      installPanelStyles,
      UnsupportedBrowserError: LocalUnsupportedBrowserError,
    } = await import("../../src/styles/install.js");
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
    ).toThrow(LocalUnsupportedBrowserError);
    expect(supportsNativeCssScope(unsupportedDocument.defaultView)).toBe(false);
    expect(supportsNativeCssScope(window)).toBe(true);
  });

  it("uses Auto by default without persisting an implicit preference", () => {
    renderThemePanel();

    // Auto leaves data-snui-theme off the root, which lets explicit host theme
    // rules apply while the base token block remains the light fallback.
    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("preserves a valid shared Auto preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "auto");

    renderThemePanel();

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("auto");
  });

  it("persists a shared theme and synchronizes mounted panel roots", async () => {
    const user = userEvent.setup();

    render(
      <>
        <PanelRoot data-testid="first-panel">
          <ThemeToggle label="First panel theme" />
        </PanelRoot>
        <PanelRoot data-testid="second-panel">
          <ThemeToggle label="Second panel theme" />
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

  it("uses Auto when the shared value is not a recognized theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "blue");

    renderThemePanel();

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("blue");
  });

  it("persists an explicit Light selection", async () => {
    const user = userEvent.setup();

    renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("synchronizes same-document panels through the theme-change event", async () => {
    const user = userEvent.setup();
    // The storage write fails, so the second panel can only learn the choice
    // from the same-document broadcast.
    refuseStorage("setItem");

    render(
      <>
        <PanelRoot data-testid="first-panel">
          <ThemeToggle label="First panel theme" />
        </PanelRoot>
        <PanelRoot data-testid="second-panel">
          <ThemeToggle label="Second panel theme" />
        </PanelRoot>
      </>,
    );

    const firstGroup = screen.getByRole("radiogroup", {
      name: "First panel theme",
    });
    await user.click(within(firstGroup).getByRole("radio", { name: "Dark" }));

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
    expect(
      within(
        screen.getByRole("radiogroup", { name: "Second panel theme" }),
      ).getByRole("radio", { name: "Dark" }),
    ).toBeChecked();
  });

  it("prefers changed shared storage after every root unmounts", async () => {
    const user = userEvent.setup();
    const firstRoot = renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    firstRoot.unmount();
    window.localStorage.setItem(THEME_STORAGE_KEY, "night");

    renderThemePanel();

    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
  });

  it("uses Auto after storage is cleared while every root is unmounted", async () => {
    const user = userEvent.setup();
    const firstRoot = renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    firstRoot.unmount();
    window.localStorage.removeItem(THEME_STORAGE_KEY);

    const secondRoot = renderThemePanel();

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();

    secondRoot.unmount();
    refuseStorage("getItem");
    renderThemePanel();

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
  });

  it("retains an explicit theme in the mounted panel when a storage write fails", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    refuseStorage("setItem");

    renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "dark",
    );
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("stores System as an explicit operating-system-following theme", async () => {
    const user = userEvent.setup();
    renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Match device" }));

    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "system",
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    const [styles] = headSheets(ROOT_SHEET);
    expect(styles?.textContent).toContain('[data-snui-theme="system"]');
  });

  it("synchronizes a theme change delivered by the browser storage event", () => {
    renderThemePanel();
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

  it("ignores an unrecognized shared value delivered by the storage event", async () => {
    const user = userEvent.setup();
    renderThemePanel();

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    // Another library version sharing the key writes a value this version
    // does not recognize; the mounted panel keeps its explicit theme. The
    // event carries no newValue, so the handler re-reads storage and finds
    // the unrecognized value there.
    window.localStorage.setItem(THEME_STORAGE_KEY, "blue");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
      );
    });

    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "dark",
    );
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("returns to Auto when another tab clears local storage", async () => {
    const user = userEvent.setup();
    renderThemePanel();

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
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
  });

  it("re-reads the shared theme when a retained section reveals a panel", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Provider settings" defaultOpen>
        <PanelRoot data-testid="retained-panel">
          <ThemeToggle />
        </PanelRoot>
      </CollapsibleSection>,
    );
    const panel = screen.getByTestId("retained-panel");
    const toggle = screen.getByRole("button", { name: "Provider settings" });
    expect(panel).not.toHaveAttribute("data-snui-theme");

    // The retained subtree keeps its state while hidden and its listeners are
    // gone for that whole period, so a theme another panel writes meanwhile is
    // only visible to the effects the reveal runs again.
    await user.click(toggle);
    window.localStorage.setItem(THEME_STORAGE_KEY, "night");
    await user.click(toggle);

    await waitFor(() =>
      expect(panel).toHaveAttribute("data-snui-theme", "night"),
    );
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
  });

  it("uses Auto without persisting when browser storage cannot be read", () => {
    refuseStorage("getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    renderThemePanel();

    expect(screen.getByTestId("panel")).not.toHaveAttribute("data-snui-theme");
    expect(screen.getByRole("radio", { name: "Match Admin" })).toBeChecked();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("requires the theme context for ThemeToggle and usePanelTheme", () => {
    expect(() => render(<ThemeToggle />)).toThrow(
      "signalk-nearlcrews-ui: usePanelTheme must be called inside PanelRoot",
    );
  });

  it("supports per-instance theme labels with safe fallbacks", () => {
    render(
      <PanelRoot>
        <ThemeToggle
          label="Thème du panneau"
          choiceLabels={{ auto: "Automatique", dark: "Sombre", light: "  " }}
        />
      </PanelRoot>,
    );

    const group = screen.getByRole("radiogroup", {
      name: "Thème du panneau",
    });
    expect(
      within(group).getByRole("radio", { name: "Automatique" }),
    ).toBeVisible();
    expect(within(group).getByRole("radio", { name: "Light" })).toBeVisible();
    expect(within(group).getByRole("radio", { name: "Sombre" })).toBeVisible();
  });

  it("explains Match Admin in the operator's words", () => {
    render(
      <PanelRoot>
        <ThemeToggle />
      </PanelRoot>,
    );

    // The one package sentence every operator sees on every panel, so it
    // names the product rather than the host's internals.
    expect(
      screen.getByRole("radiogroup", { name: /Panel theme/ }),
    ).toHaveAccessibleDescription(
      "Match Admin uses the Signal K Admin theme when Admin shares one, and Light until then.",
    );
  });

  it("marks each theme radio with its choice, whatever its label says", () => {
    render(
      <PanelRoot>
        <ThemeToggle choiceLabels={{ night: "Nacht" }} />
      </PanelRoot>,
    );

    // A consumer test finds a theme by this hook rather than by the package's
    // wording, so a label change or a translation does not break it.
    for (const choice of THEME_CHOICES) {
      expect(
        document.querySelector(`[data-snui-theme-choice="${choice}"]`),
      ).toHaveAttribute("role", "radio");
    }
    expect(
      document.querySelector('[data-snui-theme-choice="night"]'),
    ).toHaveAccessibleName("Nacht");
  });

  it("starts at the theme a consumer seeds and writes nothing", () => {
    render(
      <PanelRoot data-testid="panel" defaultTheme="night">
        <ThemeToggle />
      </PanelRoot>,
    );

    // A nav station that opens after dark can start dark-adapted instead of
    // painting a white panel until someone reaches the selector.
    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
    // A seed is a starting point, not a choice the operator made, so the
    // shared key stays clear until someone picks a theme.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("keeps a stored preference, and the first seed, ahead of a later one", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const stored = render(
      <PanelRoot data-testid="stored" defaultTheme="night">
        Body
      </PanelRoot>,
    );

    expect(screen.getByTestId("stored")).toHaveAttribute(
      "data-snui-theme",
      "light",
    );
    stored.unmount();
    window.localStorage.clear();

    render(
      <>
        <PanelRoot data-testid="first" defaultTheme="night">
          Body
        </PanelRoot>
        <PanelRoot data-testid="second" defaultTheme="dark">
          Body
        </PanelRoot>
      </>,
    );

    // The preference is one document-wide value, so a second panel seeding
    // another theme would otherwise trade the theme back and forth.
    expect(screen.getByTestId("first")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    expect(screen.getByTestId("second")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
  });

  it("keeps a seeded theme when React replays the store subscription", () => {
    render(
      <StrictMode>
        <PanelRoot data-testid="panel" defaultTheme="night">
          <ThemeToggle />
        </PanelRoot>
      </StrictMode>,
    );

    // StrictMode unsubscribes and subscribes again with no render in between.
    // The unsubscribe gives the seed back, so the subscription itself has to
    // restore it or the panel falls to Auto on its first paint.
    expect(screen.getByTestId("panel")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("keeps a seeded theme when a retained section hides and reveals its panel", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Provider settings" defaultOpen>
        <PanelRoot data-testid="retained-panel" defaultTheme="night">
          <ThemeToggle />
        </PanelRoot>
      </CollapsibleSection>,
    );
    const panel = screen.getByTestId("retained-panel");
    const toggle = screen.getByRole("button", { name: "Provider settings" });
    expect(panel).toHaveAttribute("data-snui-theme", "night");

    // The reveal subscribes again without rendering the panel, which is the
    // same replay: a nav station seeded to Night must not turn white because
    // someone collapsed and reopened the section around it.
    await user.click(toggle);
    await user.click(toggle);

    expect(panel).toHaveAttribute("data-snui-theme", "night");
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
  });

  it("keeps the theme a panel shows when its seed changes", () => {
    const seeded = render(
      <PanelRoot data-testid="seeded" defaultTheme="night">
        Body
      </PanelRoot>,
    );
    seeded.rerender(
      <PanelRoot data-testid="seeded" defaultTheme="dark">
        Body
      </PanelRoot>,
    );

    // A seed is a starting point for a document showing no theme yet, so a
    // later value never moves a panel that is already on screen.
    expect(screen.getByTestId("seeded")).toHaveAttribute(
      "data-snui-theme",
      "night",
    );
    seeded.unmount();

    const unseeded = render(<PanelRoot data-testid="unseeded">Body</PanelRoot>);
    unseeded.rerender(
      <PanelRoot data-testid="unseeded" defaultTheme="dark">
        Body
      </PanelRoot>,
    );

    expect(screen.getByTestId("unseeded")).not.toHaveAttribute(
      "data-snui-theme",
    );
  });

  it("tolerates a theme set with no window and with no event target", () => {
    let setTheme: ((theme: ThemeChoice) => void) | undefined;
    function Capture(): null {
      setTheme = usePanelTheme().setTheme;
      return null;
    }
    render(
      <PanelRoot>
        <Capture />
      </PanelRoot>,
    );
    // Setting the theme the panel already has leaves nothing to re-render, so
    // this exercises the storage and event guards on their own.
    const sandbox = { localStorage: window.localStorage };

    let withoutWindow: unknown;
    vi.stubGlobal("window", undefined);
    try {
      setTheme?.("auto");
    } catch (error) {
      withoutWindow = error;
    } finally {
      vi.unstubAllGlobals();
    }

    expect(withoutWindow).toBeUndefined();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    // A static render sandbox supplies a window carrying storage but no event
    // target: the choice is stored and simply not shared any further.
    let withoutEvents: unknown;
    vi.stubGlobal("window", sandbox);
    try {
      setTheme?.("auto");
    } catch (error) {
      withoutEvents = error;
    } finally {
      vi.unstubAllGlobals();
    }

    expect(withoutEvents).toBeUndefined();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("auto");
  });

  it("publishes the panel's locale to everything it formats", () => {
    function Locale(): React.JSX.Element {
      const locale = usePanelLocale();
      return <p>{typeof locale === "string" ? locale : "runtime default"}</p>;
    }

    render(
      <>
        <PanelRoot locale="en-GB">
          <Locale />
        </PanelRoot>
        <PanelRoot>
          <Locale />
        </PanelRoot>
      </>,
    );

    // One pinned locale for the package's own formatters and for the numbers
    // a panel formats itself, so a grouping separator cannot disagree with
    // the sentence around it.
    expect(screen.getByText("en-GB")).toBeVisible();
    expect(screen.getByText("runtime default")).toBeVisible();
  });
});
