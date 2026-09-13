import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveRegion } from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

describe("LiveRegion first message", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces a message it mounted with by default", () => {
    renderInPanel(<LiveRegion message="3 paths detected" />);

    expect(screen.getByRole("status")).toHaveTextContent("3 paths detected");
  });

  it("holds the first message for a beat when asked", () => {
    vi.useFakeTimers();
    renderInPanel(
      <LiveRegion announceOnMount={false} message="3 paths detected" />,
    );

    const region = screen.getByRole("status");
    // The region existed before its text arrived, which is what makes the
    // update observable to a screen reader.
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("3 paths detected");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a silent region's text, which nothing is waiting to hear", () => {
    vi.useFakeTimers();
    renderInPanel(
      <LiveRegion announceOnMount={false} live="off" message="Muted" />,
    );

    expect(screen.getByText("Muted")).toBeInTheDocument();
  });
});

describe("LiveRegion announcement mode", () => {
  it("keeps a requested mode beside a role that announces nothing itself", () => {
    const { container } = renderInPanel(
      <LiveRegion role="note" live="polite" message="Scan started" />,
    );

    const region = container.querySelector(".snui-visually-hidden");
    expect(region).toHaveAttribute("role", "note");
    expect(region).toHaveAttribute("aria-live", "polite");
  });
});

describe("LiveRegion repeat announcements under pressure", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces once at the end of a burst instead of staying blank", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <LiveRegion message="Scanned 1 path" announceKey="scan-1" />,
    );

    const region = screen.getByRole("status");
    for (const [index, message] of [
      "Scanned 2 paths",
      "Scanned 3 paths",
      "Scanned 4 paths",
    ].entries()) {
      rerender(
        panel(
          <LiveRegion
            message={message}
            announceKey={`scan-${String(index)}`}
          />,
        ),
      );
      act(() => {
        vi.advanceTimersByTime(40);
      });
    }

    // A source updating faster than the beat still finishes the beat it
    // started, and the words that arrive are the latest ones.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(region).toHaveTextContent("Scanned 4 paths");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs no beat for a region that announces nothing", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <LiveRegion live="off" message="Muted" announceKey={1} />,
    );

    rerender(panel(<LiveRegion live="off" message="Muted" announceKey={2} />));
    expect(screen.getByText("Muted")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
