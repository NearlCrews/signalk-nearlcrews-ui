import { act, render, screen } from "@testing-library/react";
import { Activity, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  formatRelativeAge,
  formatRelativeAgeSince,
  RELATIVE_AGE_NARROW,
  RelativeAge,
} from "../../src/index.js";
import { subscribeToClock } from "../../src/utils/shared-clock.js";

const EN = { locale: "en" } as const;
const NARROW_EN = { ...RELATIVE_AGE_NARROW, ...EN } as const;
const DAY_MS = 86_400_000;

describe("formatRelativeAge defaults", () => {
  it("reads as words below a day and counts in numbers above one", () => {
    expect(formatRelativeAge(0, EN)).toBe("now");
    expect(formatRelativeAge(1_000, EN)).toBe("1 second ago");
    expect(formatRelativeAge(120_000, EN)).toBe("2 minutes ago");
    // "Yesterday" is a calendar claim, and nothing here reads a calendar: a
    // sample thirty-four hours old rounds to one day.
    expect(formatRelativeAge(DAY_MS, EN)).toBe("1 day ago");
    expect(formatRelativeAge(34 * 3_600_000, EN)).toBe("1 day ago");
    expect(formatRelativeAge(7 * DAY_MS, EN)).toBe("1 week ago");
  });

  it("gives the calendar wording to a caller that asks for it", () => {
    expect(formatRelativeAge(DAY_MS, { ...EN, numeric: "auto" })).toBe(
      "yesterday",
    );
    expect(formatRelativeAge(7 * DAY_MS, { ...EN, numeric: "auto" })).toBe(
      "last week",
    );
  });

  it("keeps the fallback for missing and non-finite ages", () => {
    expect(formatRelativeAge(null, { fallback: "never" })).toBe("never");
    expect(formatRelativeAge(undefined)).toBe("Unknown");
    expect(formatRelativeAge(Number.NaN)).toBe("Unknown");
    expect(formatRelativeAge(Number.POSITIVE_INFINITY)).toBe("Unknown");
  });
});

describe("formatRelativeAge rounding", () => {
  it.each([
    [0, "0s ago"],
    [59_499, "59s ago"],
    [59_500, "1m ago"],
    [89_999, "1m ago"],
    [90_000, "2m ago"],
    [3_569_999, "59m ago"],
    [3_570_000, "1h ago"],
    [86_399_999, "1d ago"],
    [6 * DAY_MS, "6d ago"],
    [6.5 * DAY_MS, "1w ago"],
    [30 * DAY_MS, "4w ago"],
    [31 * DAY_MS, "1mo ago"],
    [345 * DAY_MS, "11mo ago"],
    [352 * DAY_MS, "1y ago"],
    [730 * DAY_MS, "2y ago"],
  ])("renders %i ms as %s in the narrow preset", (ageMs, expected) => {
    expect(formatRelativeAge(ageMs, NARROW_EN)).toBe(expected);
  });

  it("promotes a value that rounds up to the next unit", () => {
    // Twelve rounded months become one year rather than "12 months ago".
    expect(formatRelativeAge(352 * DAY_MS, { ...EN, style: "long" })).toBe(
      "1 year ago",
    );
    expect(
      formatRelativeAge(59_500, { ...EN, numeric: "always", style: "long" }),
    ).toBe("1 minute ago");
  });
});

describe("formatRelativeAge negative ages", () => {
  it("clamps skew inside one minute to now by default", () => {
    expect(formatRelativeAge(-1, EN)).toBe("now");
    expect(formatRelativeAge(-59_999, EN)).toBe("now");
    expect(formatRelativeAge(-500, NARROW_EN)).toBe("0s ago");
  });

  it("falls back beyond the tolerance or when asked to", () => {
    expect(formatRelativeAge(-60_001, EN)).toBe("Unknown");
    expect(formatRelativeAge(-1, { ...EN, negative: "fallback" })).toBe(
      "Unknown",
    );
  });
});

describe("formatRelativeAge locales", () => {
  it("retries with the default locale instead of throwing on a bad tag", () => {
    expect(() =>
      formatRelativeAge(1_000, { locale: "not a locale!!" }),
    ).not.toThrow();
    expect(formatRelativeAge(1_000, { locale: "not a locale!!" })).toBe(
      formatRelativeAge(1_000),
    );
  });

  it("accepts a locale list and honors the first supported entry", () => {
    expect(formatRelativeAge(60_000, { locale: ["de", "en"] })).toBe(
      "vor 1 Minute",
    );
  });

  it("builds one formatter per locale and option set", () => {
    const Original = Intl.RelativeTimeFormat;
    const constructed = vi.fn();
    vi.spyOn(Intl, "RelativeTimeFormat").mockImplementation(function (
      this: unknown,
      ...args: ConstructorParameters<typeof Intl.RelativeTimeFormat>
    ) {
      constructed();
      return new Original(...args);
    });
    const options = {
      locale: "en-GB",
      numeric: "always",
      style: "short",
    } as const;

    formatRelativeAge(1_000, options);
    formatRelativeAge(2_000, options);
    formatRelativeAge(3_000, options);

    expect(constructed).toHaveBeenCalledTimes(1);
  });
});

describe("formatRelativeAgeSince", () => {
  const now = Date.UTC(2026, 8, 5, 12, 0, 0);

  it("accepts epoch milliseconds, ISO strings, and dates", () => {
    expect(formatRelativeAgeSince(now - 60_000, now, EN)).toBe("1 minute ago");
    expect(
      formatRelativeAgeSince(new Date(now - 3_600_000).toISOString(), now, EN),
    ).toBe("1 hour ago");
    expect(formatRelativeAgeSince(new Date(now - DAY_MS), now, EN)).toBe(
      "1 day ago",
    );
  });

  it("falls back for missing or unreadable timestamps", () => {
    expect(formatRelativeAgeSince(null, now)).toBe("Unknown");
    expect(formatRelativeAgeSince(undefined, now)).toBe("Unknown");
    expect(formatRelativeAgeSince("not a timestamp", now)).toBe("Unknown");
  });

  it("treats a timestamp slightly ahead of now as now", () => {
    expect(formatRelativeAgeSince(now + 30_000, now, EN)).toBe("now");
    expect(formatRelativeAgeSince(now + 120_000, now, EN)).toBe("Unknown");
  });
});

describe("RelativeAge", () => {
  it("renders a precomputed age in a span without a machine timestamp", () => {
    const ref = createRef<HTMLElement>();
    render(
      <RelativeAge ref={ref} ageMs={120_000} options={EN} data-testid="age" />,
    );

    const age = screen.getByTestId("age");
    expect(age.tagName).toBe("SPAN");
    expect(age).toHaveTextContent("2 minutes ago");
    expect(age).not.toHaveAttribute("datetime");
    expect(age).toHaveClass("snui-relative-age");
    expect(ref.current).toBe(age);
  });

  it("owns the clock for a timestamp and stamps the time element", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    const since = now - 5_000;
    const { unmount } = render(
      <RelativeAge since={since} tickMs={1_000} options={EN} />,
    );

    const time = screen.getByText("5 seconds ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", new Date(since).toISOString());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(time).toHaveTextContent("1 minute ago");

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs one timer per cadence however many ages read it", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    const since = now - 5_000;
    const { unmount } = render(
      <>
        <RelativeAge since={since} tickMs={1_000} options={EN} />
        <RelativeAge since={since} tickMs={1_000} options={EN} />
        <RelativeAge since={since} tickMs={2_000} options={EN} />
      </>,
    );

    expect(screen.getAllByText("5 seconds ago")).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(2);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getAllByText("1 minute ago")).toHaveLength(3);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not tick for a precomputed age or when ticking is disabled", () => {
    vi.useFakeTimers();
    render(
      <>
        <RelativeAge ageMs={1_000} options={EN} />
        <RelativeAge since={Date.now()} tickMs={0} options={EN} />
      </>,
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts an ISO timestamp and an explicit span element", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    render(
      <RelativeAge
        as="span"
        since={new Date(now - 3_600_000).toISOString()}
        options={EN}
        data-testid="age"
      />,
    );

    const age = screen.getByTestId("age");
    expect(age.tagName).toBe("SPAN");
    expect(age).toHaveTextContent("1 hour ago");
    expect(age).not.toHaveAttribute("datetime");
  });

  it("re-reads the clock when a paused age resumes", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    const since = now - 60_000;

    function Section({
      visible,
    }: {
      readonly visible: boolean;
    }): React.JSX.Element {
      return (
        <Activity mode={visible ? "visible" : "hidden"}>
          <RelativeAge since={since} options={EN} />
        </Activity>
      );
    }

    const { rerender } = render(<Section visible />);
    expect(screen.getByText("1 minute ago")).toBeInTheDocument();

    // A hidden Activity tears the subscription down while keeping the state,
    // which is what a collapsed section does to the ages inside it.
    rerender(<Section visible={false} />);
    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    rerender(<Section visible />);

    expect(screen.getByText("1 hour ago")).toBeInTheDocument();
  });

  it("moves to a new cadence and stops once the age is precomputed", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    const since = now - 5_000;
    const { rerender } = render(
      <RelativeAge since={since} tickMs={1_000} options={EN} />,
    );
    expect(vi.getTimerCount()).toBe(1);

    rerender(<RelativeAge since={since} tickMs={60_000} options={EN} />);
    expect(vi.getTimerCount()).toBe(1);

    // The old cadence would have ticked 59 times by now.
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByText("5 seconds ago")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("1 minute ago")).toBeInTheDocument();

    rerender(<RelativeAge ageMs={120_000} options={EN} />);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
  });

  it("falls back for an unreadable timestamp", () => {
    render(<RelativeAge since="garbage" options={{ fallback: "never" }} />);

    // No moment to stamp, so no time element: a time with neither a datetime
    // attribute nor machine-readable text is not a time at all.
    const stamp = screen.getByText("never");
    expect(stamp.tagName).toBe("SPAN");
    expect(stamp).not.toHaveAttribute("datetime");
  });

  it("declines an explicit time element it cannot stamp", () => {
    render(
      <RelativeAge as="time" ageMs={180_000} options={EN} data-testid="age" />,
    );

    const age = screen.getByTestId("age");
    expect(age.tagName).toBe("SPAN");
    expect(age).toHaveTextContent("3 minutes ago");
  });

  it("re-renders only when the words change", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    let renders = 0;

    function Counted(): React.JSX.Element {
      renders += 1;
      return (
        <RelativeAge since={now - 3 * 3_600_000} tickMs={1_000} options={EN} />
      );
    }

    render(<Counted />);
    expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    const initial = renders;

    // A settled age formats the same tick after tick, so the stamp stays put
    // rather than committing a render that changes no text.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(renders).toBe(initial);
    expect(screen.getByText("3 hours ago")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    expect(screen.getByText("4 hours ago")).toBeInTheDocument();
  });

  it("runs no timer for a cadence that is not a number", () => {
    vi.useFakeTimers();
    render(<RelativeAge since={Date.now()} tickMs={Number.NaN} options={EN} />);

    // setInterval treats NaN as zero and clamps it to about four
    // milliseconds, which would re-render every age hundreds of times a
    // second.
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("shared clock", () => {
  it("tells a new subscriber the current instant", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0);
    vi.useFakeTimers({ now });
    const onTick = vi.fn();

    const stop = subscribeToClock(10_000, onTick);

    expect(onTick).toHaveBeenCalledWith(now);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops while the document is hidden and catches up on the way back", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);

    const stop = subscribeToClock(1_000, onTick);
    onTick.mockClear();

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onTick).not.toHaveBeenCalled();

    // Back on screen, the reader is told the instant at once rather than
    // showing the age from before the pause until the cadence next fires.
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    stop();
    hidden.mockRestore();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs no timer for a cadence that is not a positive number", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();

    const stop = subscribeToClock(Number.NaN, onTick);

    expect(onTick).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it("tolerates a listener unsubscribing another during a tick", () => {
    vi.useFakeTimers();
    const second = vi.fn();
    let stopSecond = (): void => undefined;
    const stopFirst = subscribeToClock(1_000, () => {
      stopSecond();
    });
    stopSecond = subscribeToClock(1_000, second);
    second.mockClear();

    expect(() => {
      vi.advanceTimersByTime(1_000);
    }).not.toThrow();
    expect(second).not.toHaveBeenCalled();

    stopFirst();
    expect(vi.getTimerCount()).toBe(0);
  });
});
