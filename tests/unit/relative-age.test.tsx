import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatRelativeAge,
  formatRelativeAgeSince,
  RELATIVE_AGE_NARROW,
  RelativeAge,
} from "../../src/index.js";

const EN = { locale: "en" } as const;
const NARROW_EN = { ...RELATIVE_AGE_NARROW, ...EN } as const;
const DAY_MS = 86_400_000;

describe("formatRelativeAge defaults", () => {
  it("reads as words with the auto numeric form", () => {
    expect(formatRelativeAge(0, EN)).toBe("now");
    expect(formatRelativeAge(1_000, EN)).toBe("1 second ago");
    expect(formatRelativeAge(120_000, EN)).toBe("2 minutes ago");
    expect(formatRelativeAge(DAY_MS, EN)).toBe("yesterday");
    expect(formatRelativeAge(7 * DAY_MS, EN)).toBe("last week");
  });

  it("keeps the fallback for missing and non-finite ages", () => {
    expect(formatRelativeAge(null, { fallback: "never" })).toBe("never");
    expect(formatRelativeAge(undefined)).toBe("unknown");
    expect(formatRelativeAge(Number.NaN)).toBe("unknown");
    expect(formatRelativeAge(Number.POSITIVE_INFINITY)).toBe("unknown");
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
      "last year",
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
    expect(formatRelativeAge(-60_001, EN)).toBe("unknown");
    expect(formatRelativeAge(-1, { ...EN, negative: "fallback" })).toBe(
      "unknown",
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
      "yesterday",
    );
  });

  it("falls back for missing or unreadable timestamps", () => {
    expect(formatRelativeAgeSince(null, now)).toBe("unknown");
    expect(formatRelativeAgeSince(undefined, now)).toBe("unknown");
    expect(formatRelativeAgeSince("not a timestamp", now)).toBe("unknown");
  });

  it("treats a timestamp slightly ahead of now as now", () => {
    expect(formatRelativeAgeSince(now + 30_000, now, EN)).toBe("now");
    expect(formatRelativeAgeSince(now + 120_000, now, EN)).toBe("unknown");
  });
});

describe("RelativeAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("falls back for an unreadable timestamp", () => {
    render(<RelativeAge since="garbage" options={{ fallback: "never" }} />);

    const time = screen.getByText("never");
    expect(time.tagName).toBe("TIME");
    expect(time).not.toHaveAttribute("datetime");
  });
});
