import { act, screen } from "@testing-library/react";
import { createRef, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveRegion } from "../../src/index.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { panel, renderInPanel } from "../helpers.js";

describe("LiveRegion first message", () => {
  it("renders a message it mounted with at once by default", () => {
    vi.useFakeTimers();
    renderInPanel(<LiveRegion message="3 paths detected" />);

    expect(screen.getByRole("status")).toHaveTextContent("3 paths detected");
    // Nothing is deferred, so nothing waits on a timer.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("holds the first message for a beat when asked", () => {
    vi.useFakeTimers();
    renderInPanel(<LiveRegion deferFirstMessage message="3 paths detected" />);

    const region = screen.getByRole("status");
    // The region existed before its text arrived, which is what makes the
    // update observable to a screen reader.
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS - 1);
    });
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("3 paths detected");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a silent region's text, which nothing is waiting to hear", () => {
    vi.useFakeTimers();
    renderInPanel(<LiveRegion deferFirstMessage live="off" message="Muted" />);

    expect(screen.getByText("Muted")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("LiveRegion settling", () => {
  /** A polite region that waits half a second for its text to settle. */
  function counting(message: string): ReactElement {
    return <LiveRegion settleMs={500} message={message} />;
  }

  it("exposes the text it mounts with at once", () => {
    vi.useFakeTimers();
    renderInPanel(counting("12 matches"));

    expect(screen.getByRole("status")).toHaveTextContent("12 matches");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes a changing message once, after it stops changing", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(counting("12 matches"));
    const region = screen.getByRole("status");

    // Typing a query changes the count on every key.
    for (const count of ["7 matches", "3 matches", "1 match"]) {
      rerender(panel(counting(count)));
      expect(region).toBeEmptyDOMElement();
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }
    expect(region).toBeEmptyDOMElement();

    // Each change restarted the wait, so it runs from the last key.
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(region).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(region).toHaveTextContent("1 match");
    expect(screen.getByRole("status")).toBe(region);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits again when the words return to the last ones exposed", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(counting("12 matches"));
    const region = screen.getByRole("status");

    rerender(panel(counting("3 matches")));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Back to the words the region last exposed, mid-typing: still a change,
    // so the region keeps waiting rather than refilling at once, which a
    // screen reader would hear as a fresh announcement.
    rerender(panel(counting("12 matches")));
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(region).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(region).toHaveTextContent("12 matches");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not wait on a render that leaves the words unchanged", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(counting("12 matches"));

    rerender(panel(counting("12 matches")));
    expect(screen.getByRole("status")).toHaveTextContent("12 matches");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes every change at once without a usable wait", () => {
    vi.useFakeTimers();
    for (const settleMs of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { rerender, unmount } = renderInPanel(
        <LiveRegion settleMs={settleMs} message="12 matches" />,
      );
      rerender(panel(<LiveRegion settleMs={settleMs} message="1 match" />));
      expect(screen.getByRole("status")).toHaveTextContent("1 match");
      expect(vi.getTimerCount()).toBe(0);
      unmount();
    }
  });

  it("exposes the waiting text at once when the wait is removed", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(counting("12 matches"));

    rerender(panel(counting("1 match")));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(panel(<LiveRegion message="1 match" />));
    expect(screen.getByRole("status")).toHaveTextContent("1 match");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never waits in a region that announces nothing", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <LiveRegion live="off" settleMs={500} message="12 matches" />,
    );

    rerender(panel(<LiveRegion live="off" settleMs={500} message="1 match" />));
    expect(screen.getByText("1 match")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
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
  it("announces once at the end of a burst instead of staying blank", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <LiveRegion message="Scanned 1 path" announceKey="scan-1" />,
    );

    const region = screen.getByRole("status");
    // Every scan carries its own key, so each rerender is a new announcement.
    for (const count of [2, 3, 4]) {
      rerender(
        panel(
          <LiveRegion
            message={`Scanned ${String(count)} paths`}
            announceKey={`scan-${String(count)}`}
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
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
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

describe("LiveRegion", () => {
  it("is a polite status region by default with exactly one live attribute", () => {
    const { rerender } = renderInPanel(<LiveRegion message="" />);

    const region = screen.getByRole("status");
    expect(region).toHaveClass("snui-visually-hidden");
    expect(region).not.toHaveAttribute("aria-live");
    expect(region).toBeEmptyDOMElement();

    // The region existed before its text arrived, so the update is observed.
    rerender(panel(<LiveRegion message="3 paths detected" />));
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("3 paths detected");
  });

  it("maps assertive to alert and off to a silent aria-live", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderInPanel(
      <>
        <LiveRegion live="assertive" message="Save failed" />
        <LiveRegion live="off" as="span" ref={ref} message="Muted" />
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
    const muted = container.querySelector("span.snui-visually-hidden");
    expect(muted).toHaveAttribute("aria-live", "off");
    expect(muted).not.toHaveAttribute("role");
    expect(ref.current).toBe(muted);
  });

  it("keeps a caller-supplied role without adding aria-live", () => {
    renderInPanel(<LiveRegion role="log" message="Scan started" />);

    expect(screen.getByRole("log")).not.toHaveAttribute("aria-live");
  });
});

describe("LiveRegion repeat announcements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("empties and refills the region when the announce key changes", () => {
    const { rerender } = renderInPanel(
      <LiveRegion message="All sources enabled" announceKey={1} />,
    );

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("All sources enabled");

    // The same words again: without a real change to its text the region is
    // silent, so the message is withheld for a beat and then restored.
    rerender(
      panel(<LiveRegion message="All sources enabled" announceKey={2} />),
    );
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(region).toHaveTextContent("All sources enabled");
    // One region throughout: a remount would be observed by nobody.
    expect(screen.getByRole("status")).toBe(region);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finishes the beat it started for a key that lands mid-beat", () => {
    const { rerender, unmount } = renderInPanel(
      <LiveRegion message="Two paths detected" announceKey="scan-1" />,
    );

    const region = screen.getByRole("status");
    rerender(
      panel(<LiveRegion message="Two paths detected" announceKey="scan-2" />),
    );
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender(
      panel(<LiveRegion message="Two paths detected" announceKey="scan-3" />),
    );

    // The beat is not restarted: it ends where the first key started it and
    // adopts whichever key is current then, so a source changing the key
    // faster than the beat is announced once instead of never.
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(region).toHaveTextContent("Two paths detected");
    expect(vi.getTimerCount()).toBe(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for nothing when there is nothing to re-announce", () => {
    const { rerender } = renderInPanel(
      <LiveRegion message="Scan complete" announceKey={1} />,
    );

    const region = screen.getByRole("status");
    // A message the region does not carry yet announces itself, and a cleared
    // message announces nothing at all.
    rerender(panel(<LiveRegion message="" announceKey={2} />));
    expect(region).toBeEmptyDOMElement();
    expect(vi.getTimerCount()).toBe(0);

    rerender(panel(<LiveRegion message="Scan complete" announceKey={3} />));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(region).toHaveTextContent("Scan complete");
  });

  it("leaves a region without an announce key untimed", () => {
    const { rerender } = renderInPanel(<LiveRegion message="Saved" />);

    rerender(panel(<LiveRegion message="Saved" />));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(vi.getTimerCount()).toBe(0);

    // A silenced region speaks for nobody, so a new key costs it nothing.
    rerender(panel(<LiveRegion live="off" message="Saved" announceKey={1} />));
    expect(screen.getByText("Saved")).toHaveAttribute("aria-live", "off");
    expect(vi.getTimerCount()).toBe(0);
  });
});
