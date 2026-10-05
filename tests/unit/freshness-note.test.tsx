import { type RenderResult, screen } from "@testing-library/react";
import { createRef, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FreshnessNote } from "../../src/components/FreshnessNote.js";
import type { PanelLabels } from "../../src/index.js";
import {
  type PanelAnnounce,
  PanelAnnouncerProvider,
} from "../../src/utils/announcer.js";
import { advanceTimers, panel, renderInPanel } from "../helpers.js";
import { NOW } from "./lib/clock.js";

describe("FreshnessNote", () => {
  // Every case runs on this spec's clock, so a sample stamped NOW is current
  // rather than ahead of whatever the machine's clock reads.
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  /**
   * Renders a note inside a panel whose announcer is a spy, and returns a
   * rerender bound to the same announcer and panel labels.
   */
  function renderNote(
    note: ReactElement,
    announce: PanelAnnounce = vi.fn(),
    labels?: PanelLabels,
  ): RenderResult & { readonly rerenderNote: (next: ReactElement) => void } {
    const props = labels === undefined ? undefined : { labels };
    const wrap = (child: ReactElement): ReactElement => (
      <PanelAnnouncerProvider value={announce}>{child}</PanelAnnouncerProvider>
    );
    const view = renderInPanel(wrap(note), props);
    return {
      ...view,
      rerenderNote: (next) => {
        view.rerender(panel(wrap(next), props));
      },
    };
  }

  it("reads as a muted check while current", () => {
    renderNote(
      <FreshnessNote
        data-testid="note"
        since={NOW - 120_000}
        stale={false}
        options={{ locale: "en" }}
      />,
    );

    const note = screen.getByTestId("note");
    expect(note).toHaveTextContent("Checked 2 minutes ago");
    expect(note).toHaveClass("snui-text--muted", "snui-text--size-sm");
    expect(note.querySelector(".snui-tone-glyph")).toBeNull();
    expect(note.querySelector("time")).toHaveAttribute(
      "datetime",
      new Date(NOW - 120_000).toISOString(),
    );
  });

  it("says it is out of date in its own words, with the warning mark", () => {
    renderNote(
      <FreshnessNote
        data-testid="note"
        since={NOW - 360_000}
        stale
        options={{ locale: "en" }}
      />,
    );

    const note = screen.getByTestId("note");
    // "Checked" on a stale readout would read as reassurance.
    expect(note).not.toHaveTextContent("Checked");
    expect(note).toHaveTextContent(
      "Warning. Out of date: updated 6 minutes ago",
    );
    expect(note).toHaveClass("snui-text--warning");
    const glyph = note.querySelector(".snui-tone-glyph");
    expect(glyph).toHaveClass("snui-freshness__tone-glyph");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });

  it("drops the age it cannot state for a sample far ahead of this clock", () => {
    renderNote(
      <>
        <FreshnessNote data-testid="stale" since={NOW + 600_000} stale />
        <FreshnessNote
          data-testid="fresh"
          since={NOW + 600_000}
          stale={false}
        />
      </>,
    );

    // The age reads as unknown, so the wording says so in words of its own
    // instead of splicing the capitalized fallback into a sentence.
    expect(screen.getByTestId("stale").textContent).toBe(
      "!Warning. Out of date: last update time unknown",
    );
    expect(screen.getByTestId("fresh").textContent).toBe(
      "Checked at an unknown time",
    );
    expect(screen.getByTestId("stale").querySelector("time")).toBeNull();
  });

  it("states the age again once this clock comes within the skew tolerance", () => {
    renderNote(
      <FreshnessNote
        data-testid="note"
        since={NOW + 70_000}
        stale={false}
        tickMs={5_000}
        options={{ locale: "en" }}
      />,
    );
    expect(screen.getByTestId("note")).toHaveTextContent(
      "Checked at an unknown time",
    );

    // Ten seconds on, the sample is within a minute of this clock.
    advanceTimers(10_000);
    expect(screen.getByTestId("note")).toHaveTextContent("Checked now");
  });

  it("states the age of a new sample in a panel open for minutes", () => {
    const note = (since: number | null, stale: boolean): ReactElement => (
      <FreshnessNote
        data-testid="note"
        since={since}
        stale={stale}
        options={{ locale: "en" }}
      />
    );
    const { rerenderNote } = renderNote(note(NOW, false));
    advanceTimers(5 * 60_000);
    expect(screen.getByTestId("note")).toHaveTextContent(
      "Checked 5 minutes ago",
    );

    // A poll delivers a sample stamped from the browser's clock at receipt:
    // current, however long the panel has been open.
    rerenderNote(note(Date.now(), false));
    expect(screen.getByTestId("note").textContent).toBe("Checked now");

    // Stale for three minutes, then a sample arrives and it recovers.
    rerenderNote(note(Date.now(), true));
    advanceTimers(3 * 60_000);
    expect(screen.getByTestId("note")).toHaveTextContent(
      "Out of date: updated 3 minutes ago",
    );
    // A new sample measured while the note is still stale: its age is
    // stated, not dropped as unknown.
    rerenderNote(note(Date.now(), true));
    expect(screen.getByTestId("note").textContent).toBe(
      "!Warning. Out of date: updated now",
    );
    rerenderNote(note(Date.now(), false));
    expect(screen.getByTestId("note").textContent).toBe("Checked now");
  });

  it("states the age of the first sample a pending note receives", () => {
    const note = (since: number | null): ReactElement => (
      <FreshnessNote
        data-testid="note"
        since={since}
        stale={false}
        options={{ locale: "en" }}
      />
    );
    const { rerenderNote } = renderNote(note(null));
    advanceTimers(4 * 60_000);

    rerenderNote(note(Date.now()));
    expect(screen.getByTestId("note").textContent).toBe("Checked now");
  });

  it("drops the age a caller asks never to clamp", () => {
    const options = { locale: "en", negative: "fallback" } as const;
    renderNote(
      <>
        <FreshnessNote
          data-testid="fresh"
          since={NOW + 5_000}
          stale={false}
          options={options}
        />
        <FreshnessNote
          data-testid="stale"
          since={NOW + 5_000}
          stale
          options={options}
        />
      </>,
    );

    // Under negative: "fallback" every sample ahead of this clock has no
    // stated age, so the wording without one stands in for it.
    expect(screen.getByTestId("fresh").textContent).toBe(
      "Checked at an unknown time",
    );
    expect(screen.getByTestId("stale").textContent).toBe(
      "!Warning. Out of date: last update time unknown",
    );
  });

  it("keeps a sample within the skew tolerance on the ordinary wording", () => {
    renderNote(
      <FreshnessNote
        data-testid="note"
        since={NOW + 30_000}
        stale={false}
        options={{ locale: "en" }}
      />,
    );

    expect(screen.getByTestId("note")).toHaveTextContent("Checked now");
  });

  it("says so before the first sample", () => {
    renderNote(<FreshnessNote data-testid="note" since={null} stale={false} />);

    expect(screen.getByTestId("note")).toHaveTextContent("Not checked yet");
    expect(screen.getByTestId("note").querySelector("time")).toBeNull();
  });

  it("is never a live region, because its age ticks", () => {
    renderNote(<FreshnessNote data-testid="note" since={NOW} stale={false} />);

    const note = screen.getByTestId("note");
    expect(note).not.toHaveAttribute("role");
    expect(note).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces the turn to stale and the recovery once each", () => {
    const announce = vi.fn<PanelAnnounce>();
    const note = (stale: boolean): ReactElement => (
      <FreshnessNote since={NOW} stale={stale} />
    );
    const { rerenderNote } = renderNote(note(false), announce);
    // The state it mounts in is not news.
    expect(announce).not.toHaveBeenCalled();

    rerenderNote(note(true));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith("Status is out of date.");

    // A stale note re-rendering, or its age ticking, says nothing more.
    rerenderNote(note(true));
    advanceTimers(60_000);
    expect(announce).toHaveBeenCalledTimes(1);

    rerenderNote(note(false));
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith("Status is current again.");
  });

  it("stays quiet when it mounts stale", () => {
    const announce = vi.fn<PanelAnnounce>();
    renderNote(<FreshnessNote since={NOW} stale />, announce);

    expect(announce).not.toHaveBeenCalled();
  });

  it("takes its words from the caller, then the panel, then the defaults", () => {
    const announce = vi.fn<PanelAnnounce>();
    const note = (stale: boolean): ReactElement => (
      <FreshnessNote
        data-testid="note"
        since={NOW - 60_000}
        stale={stale}
        options={{ locale: "en" }}
        labels={{ fresh: "Polled {age}", staleAnnouncement: "  " }}
      />
    );
    const { rerenderNote } = renderNote(note(false), announce, {
      freshnessNote: {
        stale: "Stale since {age}.",
        staleAnnouncement: "Weather status is out of date.",
      },
    });
    expect(screen.getByTestId("note")).toHaveTextContent("Polled 1 minute ago");

    rerenderNote(note(true));
    expect(screen.getByTestId("note")).toHaveTextContent(
      "Warning. Stale since 1 minute ago.",
    );
    // A blank caller string reads as absent, so the panel's wording speaks.
    expect(announce).toHaveBeenLastCalledWith("Weather status is out of date.");
  });

  it("shows a wording without the age marker as it is", () => {
    renderNote(
      <FreshnessNote
        data-testid="note"
        since={NOW}
        stale={false}
        labels={{ fresh: "Current" }}
      />,
    );

    expect(screen.getByTestId("note").textContent).toBe("Current");
  });

  it("passes the element props and ref through", () => {
    const ref = createRef<HTMLSpanElement>();
    renderNote(
      <FreshnessNote
        ref={ref}
        id="status-age"
        className="extra"
        since={null}
        stale={false}
      />,
    );

    expect(ref.current).toHaveAttribute("id", "status-age");
    expect(ref.current).toHaveClass("snui-text", "extra");
  });
});
