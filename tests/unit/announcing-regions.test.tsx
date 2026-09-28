import { act, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Banner, Metric, StatusIndicator } from "../../src/index.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { visuallyHiddenDeclarations } from "../../src/styles/fragments.js";
import { LAYOUT_STYLES } from "../../src/styles/layout.js";
import { messageLogAttributes } from "../../src/utils/announcement.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { ruleBody } from "../css-helpers.js";
import { panel, renderInPanel } from "../helpers.js";
import { announcementOf } from "./lib/announcements.js";

describe("repeat announcements on visible regions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /** An announcing indicator carrying one announce key. */
  function indicator(announceKey: number, children: ReactNode): ReactElement {
    return (
      <StatusIndicator
        live="polite"
        announceKey={announceKey}
        deferFirstMessage={false}
      >
        {children}
      </StatusIndicator>
    );
  }

  it("re-announces an unchanged status when the key changes", () => {
    const { rerender } = renderInPanel(indicator(1, "Preset applied"));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Preset applied");

    rerender(panel(indicator(2, "Preset applied")));
    expect(status).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(status).toHaveTextContent("Preset applied");
    // One region throughout: a remount would be observed by nobody.
    expect(screen.getByRole("status")).toBe(status);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a banner's actions through the repeat beat", () => {
    const failure = (announceKey: number): ReactElement => (
      <Banner
        data-testid="banner"
        live="polite"
        announceKey={announceKey}
        deferFirstMessage={false}
        onDismiss={() => undefined}
      >
        Retry failed
      </Banner>
    );
    const { rerender } = renderInPanel(failure(1));

    // Shown from the start, so the blank below can only come from the key.
    const banner = screen.getByTestId("banner");
    expect(banner).toHaveTextContent("Retry failed");

    rerender(panel(failure(2)));
    expect(banner).not.toHaveTextContent("Retry failed");
    // Hiding a focusable control, even for a beat, would strand whoever was
    // standing on it.
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(banner).toHaveTextContent("Retry failed");
  });

  it("costs nothing while the region has nothing to announce", () => {
    const { rerender } = renderInPanel(indicator(1, null));

    // A key that changes during a quiet spell is taken as read, so the first
    // real status is not held back for a beat nobody needed.
    rerender(panel(indicator(2, null)));
    expect(vi.getTimerCount()).toBe(0);

    rerender(panel(indicator(2, "Provider reachable")));
    expect(screen.getByRole("status")).toHaveTextContent("Provider reachable");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("announcing regions mounted with their message", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("holds a polite message for a beat so the region exists first", () => {
    const { container } = renderInPanel(
      <>
        <Banner data-testid="banner" tone="danger" live="polite">
          Save request failed
        </Banner>
        <StatusIndicator data-testid="indicator" tone="warning" live="polite">
          Status unavailable
        </StatusIndicator>
        <Metric label="Depth below keel" value="3.2" unit="m" live="polite" />
      </>,
    );

    const banner = screen.getByTestId("banner");
    const indicator = screen.getByTestId("indicator");
    const value = container.querySelector(".snui-metric__value");
    // Each region is in the tree, empty, so the words that follow are a
    // change a screen reader observes rather than part of an insertion.
    for (const region of [banner, indicator, value]) {
      expect(region?.childNodes).toHaveLength(0);
      expect(region).toHaveAttribute("role", "status");
    }
    expect(screen.getByText("Depth below keel")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(screen.getByTestId("banner")).toBe(banner);
    expect(banner).toHaveTextContent("Error. Save request failed");
    expect(indicator).toHaveTextContent("Warning. Status unavailable");
    expect(value).toHaveTextContent("3.2 m");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders an assertive message at once", () => {
    renderInPanel(
      <>
        <Banner data-testid="banner" tone="danger" live="assertive">
          Save request failed
        </Banner>
        <StatusIndicator data-testid="indicator" role="alert">
          Provider lost
        </StatusIndicator>
        <Metric label="Depth below keel" value="1.1" live="assertive" />
      </>,
    );

    // An alert inserted with its content is announced on insertion, and a
    // failure it reports should not appear late.
    expect(screen.getByTestId("banner")).toHaveTextContent(
      "Save request failed",
    );
    expect(screen.getByTestId("indicator")).toHaveTextContent("Provider lost");
    expect(screen.getByText("1.1")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders at once where the mount state is not news", () => {
    renderInPanel(
      <>
        <Banner data-testid="banner" live="polite" deferFirstMessage={false}>
          Provider ready
        </Banner>
        <StatusIndicator live="polite" deferFirstMessage={false}>
          Connected
        </StatusIndicator>
        <Metric
          label="Updates"
          value="128"
          live="polite"
          deferFirstMessage={false}
        />
      </>,
    );

    expect(screen.getByTestId("banner")).toHaveTextContent("Provider ready");
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("holds an assertive message when asked", () => {
    renderInPanel(
      <StatusIndicator
        data-testid="indicator"
        live="assertive"
        deferFirstMessage
      >
        Provider lost
      </StatusIndicator>,
    );

    const indicator = screen.getByTestId("indicator");
    expect(indicator).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(indicator).toHaveTextContent("Provider lost");
  });

  it("keeps a banner's actions on screen while its message waits", () => {
    renderInPanel(
      <Banner data-testid="banner" live="polite" onDismiss={() => undefined}>
        Retry failed
      </Banner>,
    );

    const banner = screen.getByTestId("banner");
    expect(banner).not.toHaveTextContent("Retry failed");
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(banner).toHaveTextContent("Retry failed");
  });

  it("holds nothing on a component that does not announce", () => {
    renderInPanel(
      <>
        <Banner data-testid="banner" deferFirstMessage>
          Values are stored in SI.
        </Banner>
        <StatusIndicator deferFirstMessage>Idle</StatusIndicator>
        <Metric label="Updates" value="128" deferFirstMessage />
      </>,
    );

    expect(screen.getByTestId("banner")).toHaveTextContent(
      "Values are stored in SI.",
    );
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("announcing regions that wait for their words to settle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /** A search count that settles for half a second before it is spoken. */
  function matches(count: string): ReactElement {
    return (
      <StatusIndicator
        data-testid="indicator"
        tone="info"
        live="polite"
        settleMs={500}
        deferFirstMessage={false}
      >
        {count}
      </StatusIndicator>
    );
  }

  it("shows every change at once and speaks only the settled one", () => {
    const { rerender } = renderInPanel(matches("12 matches"));

    const indicator = screen.getByTestId("indicator");
    const region = screen.getByRole("status");
    // The visible status is not itself the region: the region inside it
    // echoes the words once they settle.
    expect(indicator).not.toHaveAttribute("role");
    expect(indicator).toContainElement(region);
    expect(region).toHaveTextContent("Information. 12 matches");
    expect(region).toHaveClass("snui-status__region", "snui-visually-hidden");

    rerender(panel(matches("3 matches")));
    rerender(panel(matches("1 match")));
    // The reader sees the count follow the typing.
    const shown = indicator.querySelector(".snui-status__text");
    expect(shown).toHaveTextContent("1 match");
    expect(shown).toHaveAttribute("aria-hidden", "true");
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Information. 1 match");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the visible chrome out of the spoken text", () => {
    renderInPanel(matches("12 matches"));

    const indicator = screen.getByTestId("indicator");
    // The dot, the glyph, and the text are shown once and spoken once, from
    // the region.
    for (const part of indicator.querySelectorAll(
      ".snui-status__dot, .snui-tone-glyph, .snui-status__text",
    )) {
      expect(part).toHaveAttribute("aria-hidden", "true");
    }
    expect(announcementOf(indicator)).toBe("Information. 12 matches");
  });

  it("mounts its region before the first status and fills that node", () => {
    const quiet = (children: ReactNode): ReactElement => (
      <StatusIndicator data-testid="indicator" live="polite" settleMs={500}>
        {children}
      </StatusIndicator>
    );
    const { rerender } = renderInPanel(quiet(null));

    const indicator = screen.getByTestId("indicator");
    const region = screen.getByRole("status");
    // Only the region is inside, so nothing is shown while there is nothing
    // to say.
    expect(indicator.childNodes).toHaveLength(1);
    expect(region).toBeEmptyDOMElement();

    rerender(panel(quiet("4 matches")));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("4 matches");
  });

  it("re-announces through the region without blanking the visible text", () => {
    const keyed = (announceKey: number): ReactElement => (
      <StatusIndicator
        data-testid="indicator"
        live="polite"
        settleMs={500}
        announceKey={announceKey}
        deferFirstMessage={false}
      >
        12 matches
      </StatusIndicator>
    );
    const { rerender } = renderInPanel(keyed(1));

    rerender(panel(keyed(2)));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(
      screen.getByTestId("indicator").querySelector(".snui-status__text"),
    ).toHaveTextContent("12 matches");

    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(screen.getByRole("status")).toHaveTextContent("12 matches");
  });

  it("echoes a compact status, whose text is not shown", () => {
    renderInPanel(
      <StatusIndicator
        data-testid="indicator"
        size="compact"
        tone="danger"
        live="polite"
        settleMs={500}
        deferFirstMessage={false}
      >
        Offline
      </StatusIndicator>,
    );

    const indicator = screen.getByTestId("indicator");
    expect(indicator.querySelector(".snui-status__text")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Error. Offline");
  });

  it("holds the first status of a polite settling region for a beat", () => {
    renderInPanel(
      <StatusIndicator live="polite" settleMs={500}>
        12 matches
      </StatusIndicator>,
    );

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(LIVE_REGION_BLANK_MS);
    });
    expect(screen.getByRole("status")).toHaveTextContent("12 matches");
  });

  it("speaks a settled metric reading with its unit", () => {
    const depth = (value: string): ReactElement => (
      <Metric
        label="Depth below keel"
        value={value}
        unit="m"
        tone="warning"
        live="polite"
        settleMs={500}
        deferFirstMessage={false}
      />
    );
    const { container, rerender } = renderInPanel(depth("3.2"));

    const value = container.querySelector(".snui-metric__value");
    const region = screen.getByRole("status");
    expect(value).not.toHaveAttribute("role");
    expect(value).toContainElement(region);
    expect(region).toHaveClass("snui-metric__region");
    expect(region).toHaveTextContent("Warning. 3.2 m");

    rerender(panel(depth("2.9")));
    // The reading, its unit, and its glyph are shown straight away and kept
    // out of the tree, because the region speaks them.
    const shown = [...(value?.children ?? [])].filter(
      (part) => part !== region,
    );
    expect(shown.map((part) => part.textContent)).toEqual(["!", "2.9", "m"]);
    for (const part of shown) {
      expect(part).toHaveAttribute("aria-hidden", "true");
    }
    expect(region).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(region).toHaveTextContent("Warning. 2.9 m");
  });

  it("mounts a settling metric's region before its first reading", () => {
    const { container } = renderInPanel(
      <Metric
        label="Depth below keel"
        value={null}
        live="polite"
        settleMs={500}
      />,
    );

    const value = container.querySelector(".snui-metric__value");
    expect(value?.childNodes).toHaveLength(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stays the region itself without a usable wait", () => {
    renderInPanel(
      <StatusIndicator data-testid="indicator" live="polite" settleMs={0}>
        Connected
      </StatusIndicator>,
    );

    expect(screen.getByTestId("indicator")).toHaveAttribute("role", "status");
  });
});

describe("announcing regions with nothing to say", () => {
  it("mounts an empty shell with its role instead of the usual chrome", () => {
    const { container } = renderInPanel(
      <>
        <Banner data-testid="banner" tone="danger" live="polite" />
        <StatusIndicator data-testid="indicator" tone="success" live="polite">
          {null}
        </StatusIndicator>
        <Metric
          label="Depth below keel"
          value={null}
          tone="warning"
          live="polite"
        />
      </>,
    );

    const value = container.querySelector(".snui-metric__value");
    for (const region of [
      screen.getByTestId("banner"),
      screen.getByTestId("indicator"),
      value,
    ]) {
      // Nothing inside, so the stylesheet's :empty rule takes the region out
      // of the flow while it keeps its place in the accessibility tree.
      expect(region?.childNodes).toHaveLength(0);
      expect(region).toHaveAttribute("role", "status");
      expect(region).not.toHaveAttribute("aria-live");
    }
    // Tone chrome belongs to a message, so none of it stands on its own.
    expect(container.querySelector(".snui-tone-glyph")).toBeNull();
    expect(container.querySelector(".snui-status__dot")).toBeNull();
    // The metric keeps its label: only the value region is waiting.
    expect(screen.getByText("Depth below keel")).toBeVisible();
  });

  it("writes the first message into the region it already mounted", () => {
    const { container, rerender } = renderInPanel(
      <>
        <Banner data-testid="banner" live="polite" />
        <StatusIndicator data-testid="indicator" live="polite">
          {null}
        </StatusIndicator>
        <Metric label="Depth below keel" value={null} live="polite" />
      </>,
    );

    const banner = screen.getByTestId("banner");
    const indicator = screen.getByTestId("indicator");
    const value = container.querySelector(".snui-metric__value");

    rerender(
      panel(
        <>
          <Banner data-testid="banner" live="polite">
            Provider lost.
          </Banner>
          <StatusIndicator data-testid="indicator" live="polite">
            Connected
          </StatusIndicator>
          <Metric label="Depth below keel" value="3.2" unit="m" live="polite" />
        </>,
      ),
    );

    // Same nodes, so every region was observable before its text arrived,
    // which is the whole reason a live region is mounted early.
    expect(screen.getByTestId("banner")).toBe(banner);
    expect(screen.getByTestId("indicator")).toBe(indicator);
    expect(container.querySelector(".snui-metric__value")).toBe(value);
    expect(banner).toHaveTextContent("Provider lost.");
    expect(indicator).toHaveTextContent("Connected");
    expect(value).toHaveTextContent("3.2 m");
  });

  it("leaves a metric value region empty whether or not it announces", () => {
    const { container } = renderInPanel(
      <Metric label="Depth below keel" value="" tone="warning" unit="m" />,
    );

    // A warning glyph and a unit with no number read as a measured state
    // rather than a missing one, so the region waits empty and the
    // stylesheet's :empty rule takes it out of the flow.
    const value = container.querySelector(".snui-metric__value");
    expect(value?.childNodes).toHaveLength(0);
    expect(container.querySelector(".snui-metric__unit")).toBeNull();
    expect(container.querySelector(".snui-tone-glyph")).toBeNull();
  });

  it("renders the usual chrome when the region does not announce", () => {
    const { container } = renderInPanel(
      <>
        <Banner data-testid="banner" tone="danger" />
        <StatusIndicator data-testid="indicator" tone="success" live="off">
          {null}
        </StatusIndicator>
      </>,
    );

    // Without an announcement there is no region to mount early, so an empty
    // banner or indicator keeps the shape it has always had.
    expect(
      screen.getByTestId("banner").querySelector(".snui-banner__body"),
    ).not.toBeNull();
    expect(container.querySelector(".snui-status__dot")).not.toBeNull();
  });

  it("keeps the shell whole when only the actions are set", () => {
    const onDismiss = vi.fn();
    renderInPanel(
      <Banner data-testid="banner" live="polite" onDismiss={onDismiss} />,
    );

    // A dismiss control is content of its own: hiding it would strand a
    // focusable button in a region taken out of the flow.
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();
    expect(screen.getByTestId("banner").childNodes.length).toBeGreaterThan(0);
  });

  it("mounts the shell for a caller-supplied live role too", () => {
    renderInPanel(<Banner data-testid="banner" role="alert" />);

    const banner = screen.getByTestId("banner");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner.childNodes).toHaveLength(0);
  });
});

describe("settling regions waiting empty", () => {
  it("takes an empty settling indicator or metric value out of the flow", () => {
    // The region inside keeps the element from being :empty, so each block
    // also matches a shell holding only its region.
    for (const [styles, selector] of [
      [
        COMPONENT_STYLES,
        ".snui-status:empty,\n.snui-status:has(> .snui-status__region:only-child)",
      ],
      [
        LAYOUT_STYLES,
        ".snui-metric__value:empty,\n.snui-metric__value:has(> .snui-metric__region:only-child)",
      ],
    ] as const) {
      expect(ruleBody(styles, selector), selector).toContain(
        visuallyHiddenDeclarations(),
      );
    }
  });
});

describe("message log attributes", () => {
  it("reads only the newest message in a polite or assertive log", () => {
    // Atomic by default on status and alert, which would reread every
    // message still in the log with each arrival.
    expect(messageLogAttributes("polite")).toEqual({
      "aria-atomic": "false",
      className: "snui-visually-hidden",
      role: "status",
    });
    expect(messageLogAttributes("assertive").role).toBe("alert");
  });
});
