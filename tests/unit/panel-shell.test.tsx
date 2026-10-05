import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  CollapsibleSection,
  PanelShell,
  Section,
  usePanelAnnouncer,
} from "../../src/index.js";
import { Dialog } from "../../src/overlays.js";
import type * as ReactVersion from "../../src/utils/react-version.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { advanceTimers, follows, renderInPanel } from "../helpers.js";
import { Bomb, failure } from "./lib/failing-content.js";

/** Whether the shell should read the host's React as below the floor. */
let reactTooOld = false;

vi.mock("../../src/utils/react-version.js", async (importOriginal) => {
  const original = await importOriginal<typeof ReactVersion>();
  return {
    ...original,
    reactBelowFloor: (reactVersion: string) =>
      reactTooOld || original.reactBelowFloor(reactVersion),
  };
});

/** The shell's theme selector, found by the group name it always carries. */
function themeGroup(): HTMLElement {
  return screen.getByRole("radiogroup", { name: "Panel theme" });
}

afterEach(() => {
  reactTooOld = false;
});

interface AnnounceProps {
  readonly assertive?: boolean | undefined;
  /** Name of the button, default "Announce". */
  readonly label?: string | undefined;
  readonly message: string;
}

/** A panel child that speaks through the shell's own regions. */
function Announce({
  assertive = false,
  label = "Announce",
  message,
}: AnnounceProps): React.JSX.Element {
  const announce = usePanelAnnouncer();
  return (
    <button type="button" onClick={() => announce(message, { assertive })}>
      {label}
    </button>
  );
}

/** A panel child that speaks as soon as it mounts. */
function AnnounceOnMount({ message }: AnnounceProps): React.JSX.Element {
  const announce = usePanelAnnouncer();
  useEffect(() => {
    announce(message);
  }, [announce, message]);
  return <p>Mounted</p>;
}

/**
 * Whether assistive technology can reach an element: neither it nor any
 * ancestor is inert or hidden with aria-hidden, which is how React Aria takes
 * the rest of the page away while a modal overlay is open.
 */
function isExposed(element: Element): boolean {
  for (
    let node: Element | null = element;
    node !== null;
    node = node.parentElement
  ) {
    if (node.getAttribute("aria-hidden") === "true") return false;
    if (node instanceof HTMLElement && node.inert) return false;
  }
  return true;
}

/** The text of each message node inside a region, in order. */
function regionMessages(region: HTMLElement): string[] {
  return [...region.children].map((node) => node.textContent);
}

/** Waits out the beat the shell's regions exist empty before speaking. */
function settleRegions(): void {
  advanceTimers(LIVE_REGION_BLANK_MS);
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
    const toggle = themeGroup();
    expect(follows(body, toggle)).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("places the theme toggle between title and content or omits it", () => {
    const { rerender } = render(
      <PanelShell title="Sources" themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    const toggle = themeGroup();
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
    expect(
      container.querySelector(".snui-panel-shell__theme-toggle"),
    ).toContainElement(themeGroup());

    rerender(
      <PanelShell themeToggle="end">
        <p>Body</p>
      </PanelShell>,
    );
    expect(
      container.querySelector(".snui-panel-shell__theme-toggle"),
    ).toContainElement(themeGroup());
  });

  it("resolves a between placement with no title to the trailing edge", () => {
    render(
      <PanelShell themeToggle="between">
        <p>Body</p>
      </PanelShell>,
    );

    // Without a title there is nothing to sit between, and leading the panel
    // would hand the theme selector the panel's first tab stop.
    const toggle = themeGroup();
    expect(follows(screen.getByText("Body"), toggle)).toBe(true);
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

  describe("announcer", () => {
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
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Provider offline.",
        ),
      );
      expect(screen.getByRole("status").textContent).toBe("");
    });

    it("keeps both regions exposed while a modal dialog is open", async () => {
      const user = userEvent.setup();
      render(
        <PanelShell themeToggle="none">
          <p>Body</p>
          <Dialog title="First run" defaultOpen>
            <Announce message="Two sources found." />
          </Dialog>
        </PanelShell>,
      );

      // React Aria hides everything outside the open dialog, and the regions
      // sit beside the panel content it hides. They carry the marker React
      // Aria spares, as its own announcer does, so a message spoken while the
      // dialog is open is not lost in an inert region.
      const polite = screen.getByRole("status", { hidden: true });
      const assertive = screen.getByRole("alert", { hidden: true });
      await waitFor(() =>
        expect(isExposed(screen.getByText("Body"))).toBe(false),
      );
      expect(polite).toHaveAttribute("data-live-announcer", "true");
      expect(assertive).toHaveAttribute("data-live-announcer", "true");
      expect(isExposed(polite)).toBe(true);
      expect(isExposed(assertive)).toBe(true);

      await user.click(screen.getByRole("button", { name: "Announce" }));
      await waitFor(() =>
        expect(polite).toHaveTextContent("Two sources found."),
      );
      expect(isExposed(polite)).toBe(true);
    });

    it("speaks every message of one handler rather than the last alone", async () => {
      const user = userEvent.setup();
      function AnnounceTwice(): React.JSX.Element {
        const announce = usePanelAnnouncer();
        return (
          <button
            type="button"
            onClick={() => {
              announce("Scan finished.");
              announce("Three paths detected.");
            }}
          >
            Scan
          </button>
        );
      }
      render(
        <PanelShell themeToggle="none">
          <AnnounceTwice />
        </PanelShell>,
      );

      await user.click(screen.getByRole("button", { name: "Scan" }));
      const polite = screen.getByRole("status");
      await waitFor(() =>
        expect(regionMessages(polite)).toEqual([
          "Scan finished.",
          "Three paths detected.",
        ]),
      );
    });

    it("reads only the message just added, not the ones still queued", async () => {
      const user = userEvent.setup();
      render(
        <PanelShell themeToggle="none">
          <Announce label="Loading" message="Loading conversions." />
          <Announce label="Loaded" message="Conversions loaded." />
        </PanelShell>,
      );

      // Both regions are marked before anything is said, since a message
      // added later is read according to how the region was marked.
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-atomic",
        "false",
      );
      expect(screen.getByRole("alert")).toHaveAttribute("aria-atomic", "false");

      // The second message arrives while the first is still in the region, its
      // seven seconds not yet up. The region is not atomic, so the reader says
      // only the node just added rather than both messages again.
      await user.click(screen.getByRole("button", { name: "Loading" }));
      await user.click(screen.getByRole("button", { name: "Loaded" }));
      const polite = screen.getByRole("status");
      await waitFor(() =>
        expect(regionMessages(polite)).toEqual([
          "Loading conversions.",
          "Conversions loaded.",
        ]),
      );
      expect(polite).toHaveAttribute("aria-atomic", "false");
    });

    it("adds the same words again as a message of their own", async () => {
      const user = userEvent.setup();
      render(
        <PanelShell themeToggle="none">
          <Announce message="Saved." />
        </PanelShell>,
      );

      const button = screen.getByRole("button", { name: "Announce" });
      await user.click(button);
      await user.click(button);

      // A region whose text did not change says nothing, so a repeat is a new
      // node rather than the old one left in place.
      const polite = screen.getByRole("status");
      await waitFor(() =>
        expect(regionMessages(polite)).toEqual(["Saved.", "Saved."]),
      );
    });

    it("clears each message once it has been spoken", () => {
      vi.useFakeTimers();
      render(
        <PanelShell themeToggle="none">
          <Announce label="Loading" message="Loading conversions." />
          <Announce label="Failure" assertive message="Provider offline." />
        </PanelShell>,
      );
      settleRegions();

      fireEvent.click(screen.getByRole("button", { name: "Loading" }));
      advanceTimers(3_000);
      fireEvent.click(screen.getByRole("button", { name: "Failure" }));
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading conversions.",
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Provider offline.");

      // Outdated status left in a hidden region is the first thing a reader
      // meets at the top of the panel in browse mode, so each message leaves
      // on its own clock, the way React Aria's announcer retires its own.
      advanceTimers(4_000);
      expect(screen.getByRole("status").textContent).toBe("");
      expect(screen.getByRole("alert")).toHaveTextContent("Provider offline.");

      advanceTimers(3_000);
      expect(screen.getByRole("alert").textContent).toBe("");
    });

    it("holds a message spoken in the regions' first beat until they settle", () => {
      vi.useFakeTimers();
      render(
        <PanelShell themeToggle="none">
          <AnnounceOnMount message="Status unavailable." />
        </PanelShell>,
      );

      // The regions mounted in the same commit as the message, which is the
      // arrangement a reader misses, so they stay empty for one beat first.
      const polite = screen.getByRole("status");
      expect(polite.textContent).toBe("");
      advanceTimers(LIVE_REGION_BLANK_MS - 1);
      expect(polite.textContent).toBe("");
      settleRegions();
      expect(polite).toHaveTextContent("Status unavailable.");
    });

    it("ignores a blank message", () => {
      vi.useFakeTimers();
      render(
        <PanelShell themeToggle="none">
          <Announce message="   " />
        </PanelShell>,
      );
      settleRegions();

      fireEvent.click(screen.getByRole("button", { name: "Announce" }));
      settleRegions();
      expect(screen.getByRole("status").children).toHaveLength(0);
    });

    it("warns once when a message has no shell to speak through", async () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const user = userEvent.setup();
      renderInPanel(
        <>
          <Announce label="First" message="Saved." />
          <Announce label="Second" message="Saved again." />
        </>,
      );

      await user.click(screen.getByRole("button", { name: "First" }));
      await user.click(screen.getByRole("button", { name: "Second" }));

      // PanelRoot alone mounts no regions, so the message is dropped, and the
      // developer hears why instead of wondering where it went.
      expect(warn).toHaveBeenCalledOnce();
      // The package's own announcing components speak through the same hook,
      // so the warning names every caller rather than only the hook.
      expect(warn.mock.calls[0]?.[0]).toMatch(
        /^A panel announcement from usePanelAnnouncer, FreshnessNote, or the PanelErrorBoundary fallback found no PanelShell/,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
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
    beforeEach(() => {
      vi.stubGlobal("CSSScopeRule", undefined);
    });

    it("renders the compatibility notice instead of a panel root", () => {
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
      render(
        <PanelShell
          id="chart-locker"
          className="host-panel"
          data-testid="shell"
          labels={{
            unsupportedBrowser: {
              description: "Open Signal K Admin in a newer browser.",
              title: "Update the vessel browser",
            },
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

    it("keeps the English notice for blank bundle text", () => {
      render(
        <PanelShell
          labels={{ unsupportedBrowser: { description: " ", title: "" } }}
        >
          <p>Body</p>
        </PanelShell>,
      );

      expect(
        screen.getByRole("region", { name: "Browser update required" }),
      ).toBeVisible();
      expect(
        screen.getByText(/^This panel needs a newer browser\./),
      ).toBeVisible();
    });

    it("renders a consumer notice when one is supplied", () => {
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

describe("PanelShell below the React floor", () => {
  it("names both versions rather than the translated browser advice", () => {
    reactTooOld = true;
    render(
      <PanelShell
        labels={{
          unsupportedBrowser: {
            description: "Werk de browser bij.",
            title: "Update vereist",
          },
        }}
      >
        <p>Body</p>
      </PanelShell>,
    );

    // The browser advice, translated or not, cannot help when the host's
    // React is the reason, so the notice names what actually has to change.
    expect(
      screen.getByRole("region", { name: "Signal K update required" }),
    ).toBeVisible();
    expect(screen.queryByText("Update vereist")).toBeNull();
    expect(screen.getByText(/^This panel needs React /)).toBeVisible();
    expect(screen.queryByText("Werk de browser bij.")).toBeNull();
    expect(screen.queryByText("Body")).toBeNull();
  });
});

describe("PanelShell error boundary", () => {
  let consoleError: MockInstance<typeof console.error>;

  // React reports every caught render error on the console, and so does the
  // boundary itself; only one spec reads what they wrote.
  beforeEach(() => {
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  it("hands the boundary props to the boundary around the content", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onReload = vi.fn();
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
    expect(themeGroup()).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Reload Admin" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("keeps the default fallback and recovery when no fallback is given", async () => {
    const user = userEvent.setup();
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

    failure.armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered content")).toBeVisible();
  });

  it("offers a page reload by default and drops it when asked", () => {
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
  });

  it("records the failure on the console with no error handler wired", () => {
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
    failure.armed = false;
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

    failure.armed = true;
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
});
