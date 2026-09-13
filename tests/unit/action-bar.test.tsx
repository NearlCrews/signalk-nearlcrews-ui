import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActionBar, Button, PanelRoot, Stack } from "../../src/index.js";
import { installVisualViewport, renderInPanel } from "../helpers.js";

describe("ActionBar contract", () => {
  it("hands its bar element to a consumer ref and releases it on unmount", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = renderInPanel(
      <ActionBar ref={ref} actions={<Button>Save</Button>} />,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-action-bar");
    expect(ref.current?.isConnected).toBe(true);

    unmount();
    expect(ref.current).toBeNull();
  });

  it("hands the docked bar element to a consumer ref as well", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = renderInPanel(
      <ActionBar
        ref={ref}
        sticky="viewport-bottom"
        actions={<Button>Save</Button>}
      />,
    );

    expect(ref.current).toHaveClass("snui-action-bar--sticky-viewport-bottom");

    unmount();
    expect(ref.current).toBeNull();
  });

  it("marks the bar and its status for a browser test to find", () => {
    const { container } = renderInPanel(
      <ActionBar status="Nothing to save" actions={<Button>Save</Button>} />,
    );

    const bar = container.querySelector("[data-snui-action-bar]");
    expect(bar).toHaveClass("snui-action-bar");
    expect(
      bar?.querySelector("[data-snui-action-bar-status]"),
    ).toHaveTextContent("Nothing to save");
  });

  it("renders a toolbar band with a free content slot", () => {
    const { container } = renderInPanel(
      <ActionBar
        variant="toolbar"
        role="region"
        aria-label="Panel controls"
        status="12 conversions"
        actions={<Button>Add</Button>}
      >
        <input aria-label="Search conversions" type="search" />
      </ActionBar>,
    );

    expect(screen.getByRole("region", { name: "Panel controls" })).toHaveClass(
      "snui-action-bar--toolbar",
    );
    expect(
      container.querySelector(".snui-action-bar__content"),
    ).toContainElement(screen.getByLabelText("Search conversions"));
  });

  it("reports a docking bar rendered outside a panel root", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <ActionBar sticky="viewport-bottom" actions={<Button>Save</Button>} />,
    );

    // Without a root the bar cannot measure anything, so it renders as
    // ordinary flow content and would otherwise say nothing about it.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("found no PanelRoot ancestor"),
    );
  });

  it("rejects a bar with no action", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderInPanel(<ActionBar actions={null} />)).toThrow(
      "ActionBar requires at least one action.",
    );
  });

  it("scrolls an ancestor that implements no scrollBy", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { container, unmount } = render(
      <PanelRoot data-testid="focus-panel">
        <Stack>
          <div data-testid="nested-scroll" style={{ overflowY: "auto" }}>
            <Button data-testid="covered-target">Earlier action</Button>
          </div>
          <ActionBar
            sticky="viewport-bottom"
            data-testid="focus-bar"
            actions={<Button>Save</Button>}
          />
        </Stack>
      </PanelRoot>,
    );
    const panel = screen.getByTestId("focus-panel");
    const nestedScroller = screen.getByTestId("nested-scroll");
    const target = screen.getByTestId("covered-target");
    const bar = screen.getByTestId("focus-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, 0, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 900, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          bar.classList.contains("snui-action-bar--viewport-docked")
            ? 440
            : 900,
          560,
          60,
        ),
    );
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(140, 450, 200, 40),
    );
    // An embedded browser whose scrollable elements implement no scrollBy is
    // the case the scrollTop fallback exists for, and jsdom is one.
    expect(typeof (nestedScroller as { scrollBy?: unknown }).scrollBy).not.toBe(
      "function",
    );
    Object.defineProperties(nestedScroller, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 90, writable: true },
    });
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));
    target.focus();

    // The same ten pixels the scrollBy path reports, applied by hand, and the
    // rest still propagates to the window.
    expect(nestedScroller.scrollTop).toBe(100);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 40 });

    unmount();
    restore();
  });
});
