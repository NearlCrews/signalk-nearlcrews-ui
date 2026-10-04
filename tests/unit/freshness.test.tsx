import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FreshnessNote } from "../../src/components/FreshnessNote.js";
import { usePollFreshness } from "../../src/hooks/use-poll-freshness.js";
import {
  type PanelAnnounce,
  PanelAnnouncerProvider,
} from "../../src/utils/announcer.js";
import { formatRelativeAgeSince } from "../../src/utils/format-relative-age.js";
import { resolveFreshness } from "../../src/utils/freshness.js";

/** The instant every clock-driven spec measures from. */
const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);

describe("resolveFreshness clock skew", () => {
  it("reads a sample a little ahead of the browser as fresh", () => {
    for (const aheadMs of [1, 30_000, 60_000]) {
      expect(resolveFreshness(NOW + aheadMs, NOW, 10_000)).toEqual({
        ageMs: 0,
        stale: false,
      });
    }
  });

  it("states no age for a sample far ahead, and does not trust it", () => {
    // A server running ten minutes fast stamps every sample in the browser's
    // future. Read as fresh, it could not go stale until the browser's clock
    // caught up, which is the failure a freshness flag exists to catch.
    expect(resolveFreshness(NOW + 600_000, NOW, 10_000)).toEqual({
      ageMs: undefined,
      stale: true,
    });
    expect(resolveFreshness(NOW + 60_001, NOW, 10_000).stale).toBe(true);
  });

  it("agrees with the relative age beside it", () => {
    for (const aheadMs of [30_000, 600_000]) {
      const { ageMs } = resolveFreshness(NOW + aheadMs, NOW, 10_000);
      const words = formatRelativeAgeSince(NOW + aheadMs, NOW, {
        locale: "en",
      });
      expect(ageMs === undefined).toBe(words === "Unknown");
    }
  });

  it("keeps a far future sample fresh only where no threshold is set", () => {
    expect(resolveFreshness(NOW + 600_000, NOW, 0)).toEqual({
      ageMs: undefined,
      stale: false,
    });
  });
});

function FreshnessProbe({
  lastUpdated,
  staleAfterMs,
  tickMs,
}: {
  readonly lastUpdated: number | null;
  readonly staleAfterMs: number;
  readonly tickMs?: number;
}): React.JSX.Element {
  const { stale } = usePollFreshness(lastUpdated, { staleAfterMs, tickMs });
  return <span data-testid="freshness">{stale ? "stale" : "current"}</span>;
}

function reading(): string | null {
  return screen.getByTestId("freshness").textContent;
}

describe("usePollFreshness stale timing", () => {
  it("flips stale the moment the threshold passes, not on the next tick", () => {
    vi.useFakeTimers({ now: NOW });
    // The default clock ticks every ten seconds, well after the threshold.
    render(<FreshnessProbe lastUpdated={NOW} staleAfterMs={3_000} />);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    // Exactly at the threshold the sample is still inside it.
    expect(reading()).toBe("current");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reading()).toBe("stale");
  });

  it("measures the threshold from the newest sample", () => {
    vi.useFakeTimers({ now: NOW });
    const { rerender } = render(
      <FreshnessProbe lastUpdated={NOW} staleAfterMs={3_000} />,
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender(<FreshnessProbe lastUpdated={NOW + 2_000} staleAfterMs={3_000} />);

    // The first sample's deadline has passed; the second one's has not.
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(reading()).toBe("current");

    act(() => {
      vi.advanceTimersByTime(1_001);
    });
    expect(reading()).toBe("stale");
  });

  it("schedules nothing once stale, without a sample, or with the clock stopped", () => {
    vi.useFakeTimers({ now: NOW });
    const { rerender } = render(
      <FreshnessProbe
        lastUpdated={NOW - 5_000}
        staleAfterMs={3_000}
        tickMs={0}
      />,
    );
    expect(reading()).toBe("stale");
    expect(vi.getTimerCount()).toBe(0);

    rerender(
      <FreshnessProbe lastUpdated={null} staleAfterMs={3_000} tickMs={0} />,
    );
    expect(vi.getTimerCount()).toBe(0);

    // A stopped clock stops the flag too: the caller asked for no re-reads.
    rerender(
      <FreshnessProbe lastUpdated={NOW} staleAfterMs={3_000} tickMs={0} />,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reads a cadence longer than one timer can hold as a stopped clock", () => {
    vi.useFakeTimers({ now: NOW });
    // One millisecond past the longest delay a timer holds, written out so the
    // case states the number it means.
    render(
      <FreshnessProbe
        lastUpdated={NOW}
        staleAfterMs={3_000}
        tickMs={2_147_483_648}
      />,
    );

    // Handed to a timer, the cadence would wrap to zero and tick as fast as
    // the engine allows. No interval runs, and the stale wake stops with it,
    // as it does for a cadence of 0.
    expect(reading()).toBe("current");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reads a zero or negative threshold as none: aged on the tick, never stale", () => {
    vi.useFakeTimers({ now: NOW });
    function AgeProbe({
      staleAfterMs,
    }: {
      readonly staleAfterMs: number;
    }): React.JSX.Element {
      const { ageMs, stale } = usePollFreshness(NOW, {
        staleAfterMs,
        tickMs: 60_000,
      });
      return (
        <span data-testid="freshness">
          {`${String(ageMs)} ${stale ? "stale" : "current"}`}
        </span>
      );
    }

    for (const staleAfterMs of [0, -1]) {
      vi.setSystemTime(NOW);
      const { unmount } = render(<AgeProbe staleAfterMs={staleAfterMs} />);
      expect(reading()).toBe("0 current");

      // No threshold means no wake to re-read the clock at, so the age moves
      // only when the clock ticks, and however old it gets it is not stale.
      act(() => {
        vi.advanceTimersByTime(59_999);
      });
      expect(reading()).toBe("0 current");
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(reading()).toBe("60000 current");
      act(() => {
        vi.advanceTimersByTime(60 * 60_000);
      });
      expect(reading()).toBe("3660000 current");
      unmount();
    }
  });

  it("waits out a threshold longer than one timer can hold", () => {
    vi.useFakeTimers({ now: NOW });
    const dayMs = 86_400_000;
    const monthMs = 30 * dayMs;
    render(
      <FreshnessProbe
        lastUpdated={NOW}
        staleAfterMs={monthMs}
        tickMs={dayMs}
      />,
    );

    // A delay past the timer ceiling would fire at once and spin; the wait is
    // capped and taken again instead.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(reading()).toBe("current");

    act(() => {
      vi.advanceTimersByTime(25 * dayMs);
    });
    expect(reading()).toBe("current");

    act(() => {
      vi.advanceTimersByTime(5 * dayMs);
    });
    expect(reading()).toBe("stale");
  });
});

describe("usePollFreshness measuring a new sample", () => {
  /** Mounts a probe, lets `elapsedMs` pass, then delivers a sample stamped now. */
  function deliverAfter(
    elapsedMs: number,
    tickMs: number | undefined,
  ): ReturnType<typeof render> {
    vi.useFakeTimers({ now: NOW });
    const probe = (lastUpdated: number): React.JSX.Element => (
      <FreshnessProbe
        lastUpdated={lastUpdated}
        staleAfterMs={300_000}
        {...(tickMs === undefined ? {} : { tickMs })}
      />
    );
    const view = render(probe(NOW));
    act(() => {
      vi.advanceTimersByTime(elapsedMs);
    });
    // A poll delivers a sample stamped from the browser's clock at receipt.
    view.rerender(probe(Date.now()));
    return view;
  }

  it("reads a new sample as current between ticks longer than a minute", () => {
    // Measured against the reading from mount, 110 seconds old, the sample
    // would sit more than a minute in the future and read stale.
    deliverAfter(110_000, 120_000);
    expect(reading()).toBe("current");
  });

  it("measures a new sample when it arrives with the clock stopped", () => {
    // tickMs 0 reads the clock at mount and at each new sample, never between.
    deliverAfter(10 * 60_000, 0);
    expect(reading()).toBe("current");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("measures a new sample that arrives while the document is hidden", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.useFakeTimers({ now: NOW });
    const probe = (lastUpdated: number): React.JSX.Element => (
      <FreshnessProbe lastUpdated={lastUpdated} staleAfterMs={300_000} />
    );
    const { rerender } = render(probe(NOW));

    // Hidden, the shared clock stops ticking.
    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    rerender(probe(Date.now()));
    expect(reading()).toBe("current");
    hidden.mockRestore();
  });

  it("never lets a paired note announce a turn for a sample that was current", () => {
    vi.useFakeTimers({ now: NOW });
    const announce = vi.fn<PanelAnnounce>();
    function Panel({
      lastUpdated,
    }: {
      readonly lastUpdated: number;
    }): React.JSX.Element {
      const { stale } = usePollFreshness(lastUpdated, {
        staleAfterMs: 300_000,
        tickMs: 120_000,
      });
      return (
        <PanelAnnouncerProvider value={announce}>
          <FreshnessNote since={lastUpdated} stale={stale} />
        </PanelAnnouncerProvider>
      );
    }
    const { rerender } = render(<Panel lastUpdated={NOW} />);
    act(() => {
      vi.advanceTimersByTime(110_000);
    });
    rerender(<Panel lastUpdated={Date.now()} />);

    // Not even an intermediate commit may read stale: the note announces
    // from an effect, which would say "out of date" and then "current again".
    expect(announce).not.toHaveBeenCalled();
  });
});
