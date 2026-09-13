import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CollapsibleSection,
  PanelErrorBoundary,
  type PanelErrorBoundaryFallbackProps,
  PanelShell,
  Section,
  UnsupportedBrowserNotice,
  useUnsavedChangesGuard,
} from "../../src/index.js";
import { usePanelAnnouncer } from "../../src/utils/announcer.js";
import { renderInPanel } from "../helpers.js";

function follows(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

interface AnnounceProps {
  readonly assertive?: boolean | undefined;
  readonly message: string;
}

/** A panel child that speaks through the shell's own regions. */
function Announce({
  assertive = false,
  message,
}: AnnounceProps): React.JSX.Element {
  const announce = usePanelAnnouncer();
  return (
    <button type="button" onClick={() => announce(message, { assertive })}>
      Announce
    </button>
  );
}

describe("PanelShell", () => {
  it("frames the panel with a root, a level-2 title, and a trailing theme toggle", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelShell
        ref={ref}
        data-testid="shell"
        title="Chart locker"
        description="Manage cached charts."
        width="standard"
      >
        <p>Body</p>
      </PanelShell>,
    );

    const root = screen.getByTestId("shell");
    expect(root).toHaveAttribute("data-snui-root");
    expect(root).toHaveClass("snui-root--standard");
    expect(ref.current).toBe(root);
    expect(
      screen.getByRole("heading", { level: 2, name: "Chart locker" }),
    ).toBeVisible();
    expect(screen.getByText("Manage cached charts.")).toBeVisible();
    const body = screen.getByText("Body");
    const toggle = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(follows(body, toggle)).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("places the theme toggle between title and content or omits it", () => {
    const { rerender } = render(
      <PanelShell title="Sources" themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    const toggle = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(
      follows(screen.getByRole("heading", { name: "Sources" }), toggle),
    ).toBe(true);
    expect(follows(toggle, screen.getByText("Body"))).toBe(true);

    rerender(
      <PanelShell themeToggle="none" headingLevel={3} title="Sources">
        <p>Body</p>
      </PanelShell>,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 3, name: "Sources" }),
    ).toBeVisible();
  });

  it("keeps the theme toggle on the trailing edge in either placement", () => {
    const { container, rerender } = render(
      <PanelShell title="Sources" themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    // The stack lays its children out in one column, so the shell's own
    // wrapper is what holds the selector at the trailing edge; without it a
    // consumer has to re-align the toggle with its own stylesheet.
    const wrapper = container.querySelector(".snui-panel-shell__theme-toggle");
    expect(wrapper).not.toBeNull();
    expect(
      wrapper?.contains(
        screen.getByRole("radiogroup", { name: "Panel theme" }),
      ),
    ).toBe(true);

    rerender(
      <PanelShell themeToggle="end">
        <p>Body</p>
      </PanelShell>,
    );
    expect(
      container
        .querySelector(".snui-panel-shell__theme-toggle")
        ?.contains(screen.getByRole("radiogroup", { name: "Panel theme" })),
    ).toBe(true);
  });

  it("forwards theme toggle props and omits the title block without a title", () => {
    render(
      <PanelShell themeToggleProps={{ choices: ["light", "dark"] }}>
        <p>Body</p>
      </PanelShell>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("radio", { name: "Light" })).toBeVisible();
    expect(screen.queryByRole("radio", { name: "Night" })).toBeNull();
  });

  it("shows a description even when the panel has no title", () => {
    render(
      <PanelShell description="Values stay in SI units." themeToggle="none">
        <p>Body</p>
      </PanelShell>,
    );

    // Panels are titleless by convention, so a description that rendered only
    // beside a title would be dropped on almost every panel that passes one.
    expect(screen.getByText("Values stay in SI units.")).toBeVisible();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("mounts both announcer regions empty and speaks politely on request", async () => {
    const user = userEvent.setup();
    render(
      <PanelShell themeToggle="none">
        <Announce message="Three paths detected." />
      </PanelShell>,
    );

    // The regions exist before the first message, which is the whole reason
    // the shell owns them rather than each panel mounting its own.
    const polite = screen.getByRole("status");
    const assertive = screen.getByRole("alert");
    expect(polite.textContent).toBe("");
    expect(assertive.textContent).toBe("");

    await user.click(screen.getByRole("button", { name: "Announce" }));
    await waitFor(() =>
      expect(polite).toHaveTextContent("Three paths detected."),
    );
    expect(assertive.textContent).toBe("");
  });

  it("interrupts through the assertive region when asked", async () => {
    const user = userEvent.setup();
    render(
      <PanelShell themeToggle="none">
        <Announce assertive message="Provider offline." />
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "Announce" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Provider offline."),
    );
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("resolves a between placement with no title to the trailing edge", () => {
    render(
      <PanelShell themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    // Without a title there is nothing to sit between, and leading the panel
    // would hand the theme selector the panel's first tab stop.
    const toggle = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(follows(screen.getByText("Body"), toggle)).toBe(true);
  });

  describe("heading levels", () => {
    it("nests the sections inside a titled panel under its title", () => {
      render(
        <PanelShell title="Chart locker">
          <Section title="Storage">Cached charts</Section>
          <CollapsibleSection title="Advanced">Tile cache</CollapsibleSection>
        </PanelShell>,
      );

      expect(
        screen.getByRole("heading", { level: 2, name: "Chart locker" }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { level: 3, name: "Storage" }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { level: 3, name: "Advanced" }),
      ).toBeVisible();
    });

    it("follows the panel title's own level, and stops at six", () => {
      const { rerender } = render(
        <PanelShell title="Chart locker" headingLevel={3}>
          <Section title="Storage">Cached charts</Section>
        </PanelShell>,
      );

      expect(
        screen.getByRole("heading", { level: 4, name: "Storage" }),
      ).toBeVisible();

      rerender(
        <PanelShell title="Chart locker" headingLevel={6}>
          <Section title="Storage">Cached charts</Section>
        </PanelShell>,
      );

      // Six is the last level the outline can name, so a deeper section
      // repeats it rather than inventing a level no element carries.
      expect(
        screen.getByRole("heading", { level: 6, name: "Storage" }),
      ).toBeVisible();
    });

    it("leaves the sections where they are when the panel has no title", () => {
      render(
        <PanelShell>
          <Section title="Storage">Cached charts</Section>
        </PanelShell>,
      );

      expect(
        screen.getByRole("heading", { level: 2, name: "Storage" }),
      ).toBeVisible();
    });

    it("keeps an explicit section level whatever the panel offers", () => {
      render(
        <PanelShell title="Chart locker">
          <Section title="Storage" headingLevel={5}>
            Cached charts
          </Section>
        </PanelShell>,
      );

      expect(
        screen.getByRole("heading", { level: 5, name: "Storage" }),
      ).toBeVisible();
    });

    it("leaves a section outside any shell at level 2", () => {
      renderInPanel(
        <>
          <Section title="Storage">Cached charts</Section>
          <CollapsibleSection title="Advanced">Tile cache</CollapsibleSection>
        </>,
      );

      expect(
        screen.getByRole("heading", { level: 2, name: "Storage" }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { level: 2, name: "Advanced" }),
      ).toBeVisible();
    });
  });

  describe("without native CSS scope", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "CSSScopeRule");

    afterEach(() => {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, "CSSScopeRule");
      } else {
        Object.defineProperty(window, "CSSScopeRule", descriptor);
      }
    });

    it("renders the compatibility notice instead of a panel root", () => {
      Object.defineProperty(window, "CSSScopeRule", {
        configurable: true,
        value: undefined,
      });
      const { container } = render(
        <PanelShell title="Chart locker" headingLevel={3}>
          <p>Body</p>
        </PanelShell>,
      );

      expect(container.querySelector("[data-snui-root]")).toBeNull();
      expect(
        screen.getByRole("region", { name: "Browser update required" }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: "Browser update required",
        }),
      ).toBeVisible();
      expect(screen.queryByText("Body")).toBeNull();
    });

    it("carries the shell's own attributes and labels into the notice", () => {
      Object.defineProperty(window, "CSSScopeRule", {
        configurable: true,
        value: undefined,
      });
      render(
        <PanelShell
          id="chart-locker"
          className="host-panel"
          data-testid="shell"
          unsupportedLabels={{
            title: "Update the vessel browser",
            children: "Open Signal K Admin in a newer browser.",
          }}
        >
          <p>Body</p>
        </PanelShell>,
      );

      // A host that finds the panel by id or a data attribute still finds
      // something on the one engine where it can least afford surprises.
      const notice = screen.getByTestId("shell");
      expect(notice).toHaveAttribute("id", "chart-locker");
      expect(notice).toHaveClass("host-panel");
      expect(
        screen.getByRole("region", { name: "Update the vessel browser" }),
      ).toBeVisible();
      expect(
        screen.getByText("Open Signal K Admin in a newer browser."),
      ).toBeVisible();
    });

    it("renders a consumer notice when one is supplied", () => {
      Object.defineProperty(window, "CSSScopeRule", {
        configurable: true,
        value: undefined,
      });
      render(
        <PanelShell unsupported={<p>Open this page in the vessel browser.</p>}>
          <p>Body</p>
        </PanelShell>,
      );

      expect(
        screen.getByText("Open this page in the vessel browser."),
      ).toBeVisible();
      expect(screen.queryByRole("region")).toBeNull();
    });
  });
});

describe("PanelShell error boundary", () => {
  let armed = true;

  function Bomb(): React.JSX.Element {
    if (armed) throw new Error("Panel content failed.");
    return <p>Recovered content</p>;
  }

  afterEach(() => {
    armed = true;
  });

  it("hands the boundary props to the boundary around the content", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <PanelShell
        title="Chart locker"
        onError={onError}
        onReload={onReload}
        errorFallback={({ error, reload }) => (
          <div>
            <p>{error instanceof Error ? error.message : "Unknown"}</p>
            <button type="button" onClick={reload}>
              Reload Admin
            </button>
          </div>
        )}
      >
        <Bomb />
      </PanelShell>,
    );

    // PanelShell replaces the root div's native onError with the boundary
    // callback, so a leak back into the root props would leave the boundary
    // without a handler and this assertion without a call.
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(screen.getByText("Panel content failed.")).toBeVisible();
    // Only the content is replaced; the frame still surrounds the fallback.
    expect(
      screen.getByRole("heading", { level: 2, name: "Chart locker" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: "Panel theme" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Reload Admin" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("keeps the default fallback and recovery when no fallback is given", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(
      <PanelShell title="Chart locker">
        <Bomb />
      </PanelShell>,
    );

    const fallback = container.querySelector(".snui-banner--danger");
    expect(fallback).toHaveTextContent("This panel stopped working");
    // The crash unmounted whatever held focus, so the fallback takes it and
    // the reader arrives on the recovery action instead of on the body.
    expect(document.activeElement).toBe(fallback);

    armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
  });

  it("offers a page reload by default and drops it when asked", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { rerender } = render(
      <PanelShell title="Chart locker">
        <Bomb />
      </PanelShell>,
    );

    // A retry cannot clear a stale chunk, so the shell offers the page reload
    // every panel used to wire for itself, and one panel shipped without.
    expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();

    rerender(
      <PanelShell title="Chart locker" onReload={null}>
        <Bomb />
      </PanelShell>,
    );
    expect(screen.queryByRole("button", { name: "Reload page" })).toBeNull();
  });

  it("reloads the host page from the default secondary action", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    // Only the one method the fallback calls: jsdom's own Location cannot be
    // spied on, and copying it would spread a class instance.
    vi.stubGlobal("location", { href: window.location.href, reload });
    const user = userEvent.setup();
    render(
      <PanelShell title="Chart locker">
        <Bomb />
      </PanelShell>,
    );

    await user.click(screen.getByRole("button", { name: "Reload page" }));

    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("records the failure on the console with no error handler wired", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    render(
      <PanelShell title="Chart locker">
        <Bomb />
      </PanelShell>,
    );

    expect(
      consoleError.mock.calls.some(
        (call) =>
          call[0] === "PanelErrorBoundary caught a render error." &&
          call[1] instanceof Error,
      ),
    ).toBe(true);
  });

  it("announces the failure rather than taking focus that sits elsewhere", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    armed = false;
    // Built fresh per render: React skips re-rendering a subtree handed the
    // very same element, and this test needs the second render to run.
    const tree = (): React.JSX.Element => (
      <>
        <button type="button" data-testid="outside">
          Elsewhere
        </button>
        <PanelShell title="Chart locker">
          <Bomb />
        </PanelShell>
      </>
    );
    const { rerender } = render(tree());
    const outside = screen.getByTestId("outside");
    outside.focus();

    armed = true;
    rerender(tree());

    // Nothing was pulled out from under the operator, so the panel's own
    // region, mounted long before this message, says what happened.
    expect(document.activeElement).toBe(outside);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This panel stopped working",
      ),
    );
  });

  it("gives the outer stack the requested gap", () => {
    // The spacing scale reaches the DOM only as the stack's gap class.
    const { container, rerender } = render(
      <PanelShell title="Sources" themeToggle="none" gap={2}>
        <p>Body</p>
      </PanelShell>,
    );

    expect(container.querySelector(".snui-stack")).toHaveClass(
      "snui-stack--gap-2",
    );

    rerender(
      <PanelShell title="Sources" themeToggle="none">
        <p>Body</p>
      </PanelShell>,
    );
    expect(container.querySelector(".snui-stack")).toHaveClass(
      "snui-stack--gap-4",
    );
  });
});

describe("PanelErrorBoundary", () => {
  let armed = true;

  function Bomb(): React.JSX.Element {
    if (armed) throw new Error("Render failed.");
    return <p>Recovered content</p>;
  }

  afterEach(() => {
    armed = true;
  });

  it("catches a render error, reports it, and recovers on Try again", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderInPanel(
      <PanelErrorBoundary onError={onError}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(container.querySelector(".snui-banner--danger")).toHaveTextContent(
      "This panel stopped working",
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(screen.queryByRole("button", { name: "Reload page" })).toBeNull();

    armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(container.querySelector(".snui-banner--danger")).toBeNull();
  });

  it("offers the secondary reload action only when a handler is given", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderInPanel(
      <PanelErrorBoundary
        onReload={onReload}
        reloadLabel="Reload Admin"
        retryLabel="Retry"
        title="Panel error"
        description="Reload if it keeps failing."
      >
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(container.querySelector(".snui-banner--danger")).toHaveTextContent(
      "Panel error. Reload if it keeps failing.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload Admin" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("warns about discarded changes only where the reload is offered", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = renderInPanel(
      <>
        <PanelErrorBoundary>
          <Bomb />
        </PanelErrorBoundary>
        <PanelErrorBoundary onReload={() => undefined}>
          <Bomb />
        </PanelErrorBoundary>
      </>,
    );

    // The warning belongs to the action that certainly throws unsaved entries
    // away, and the retry, which only rebuilds the panel, carries none.
    const fallbacks = container.querySelectorAll(".snui-banner--danger");
    expect(fallbacks[0]).toHaveTextContent(
      "Try again rebuilds this panel's content.",
    );
    expect(fallbacks[0]).not.toHaveTextContent("Reloading the page");
    expect(fallbacks[1]).toHaveTextContent(
      "Reloading the page discards unsaved changes in every panel.",
    );
  });

  it("hands a custom fallback the error and both actions", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fallback = vi.fn(
      ({ error, reload, reset }: PanelErrorBoundaryFallbackProps) => (
        <div>
          <p>{error instanceof Error ? error.message : "Unknown"}</p>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" onClick={reload}>
            Reload
          </button>
        </div>
      ),
    );
    renderInPanel(
      <PanelErrorBoundary fallback={fallback} onReload={onReload}>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Render failed.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();
    armed = false;
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
  });

  it("renders children untouched while nothing throws", () => {
    armed = false;
    renderInPanel(
      <PanelErrorBoundary>
        <Bomb />
      </PanelErrorBoundary>,
    );

    expect(screen.getByText("Recovered content")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("UnsupportedBrowserNotice", () => {
  it("passes an accessibility audit with its defaults and with overrides", async () => {
    const { container } = render(
      <main>
        <UnsupportedBrowserNotice />
        <UnsupportedBrowserNotice
          headingLevel={3}
          title="Update the vessel browser"
        >
          Open Signal K Admin in a newer browser.
        </UnsupportedBrowserNotice>
      </main>,
    );

    const result = await axe.run(container, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
      rules: {
        // jsdom cannot compute rendered colors, so this reports incomplete
        // rather than pass; the token pairs are audited directly elsewhere.
        "color-contrast": { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  });

  it("keeps its own heading beside a consumer's label reference", () => {
    render(
      <>
        <span id="host-name">Chart locker</span>
        <UnsupportedBrowserNotice aria-labelledby="host-name" />
      </>,
    );

    // Every other titled surface joins the two references, so a consumer
    // adding context does not silently drop the words on screen.
    expect(
      screen.getByRole("region", {
        name: "Chart locker Browser update required",
      }),
    ).toBeVisible();
  });

  it("renders the heading alone when the body is suppressed", () => {
    const { container } = render(
      <UnsupportedBrowserNotice>{null}</UnsupportedBrowserNotice>,
    );

    const notice = screen.getByRole("region", {
      name: "Browser update required",
    });
    expect(notice).toHaveAttribute("data-snui-unsupported");
    expect(notice).toHaveAttribute("data-browser-compatibility-message");
    expect(container.querySelector("section > div")).toBeNull();
  });
});

describe("useUnsavedChangesGuard", () => {
  function Guard({ dirty }: { readonly dirty: boolean }): null {
    useUnsavedChangesGuard(dirty);
    return null;
  }

  function dispatchBeforeUnload(): boolean {
    const event = new Event("beforeunload", { cancelable: true });
    fireEvent(window, event);
    return event.defaultPrevented;
  }

  it("asks the browser to confirm unloading only while dirty", () => {
    const { rerender, unmount } = render(<Guard dirty />);
    expect(dispatchBeforeUnload()).toBe(true);

    rerender(<Guard dirty={false} />);
    expect(dispatchBeforeUnload()).toBe(false);

    rerender(<Guard dirty />);
    expect(dispatchBeforeUnload()).toBe(true);

    unmount();
    expect(dispatchBeforeUnload()).toBe(false);
  });
});
