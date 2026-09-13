import { act, render, screen, within } from "@testing-library/react";
import { createRef, type ReactElement, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";

import { Accordion } from "../../src/composites.js";
import {
  Badge,
  Banner,
  Card,
  Cluster,
  Code,
  CollapsibleSection,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  LiveRegion,
  Metric,
  MetricGrid,
  Section,
  Stack,
  StatusIndicator,
  Text,
  VisuallyHidden,
} from "../../src/index.js";
import { panel, renderInPanel } from "../helpers.js";

/** Reads the visually hidden announcement text inside an element. */
function announcementOf(element: Element | null | undefined): string | null {
  return element?.querySelector(".snui-visually-hidden")?.textContent ?? null;
}

describe("VisuallyHidden", () => {
  it("keeps content in the accessibility tree on the requested element", () => {
    const ref = createRef<HTMLParagraphElement>();
    renderInPanel(
      <>
        <VisuallyHidden data-testid="hidden-span">
          Sort ascending
        </VisuallyHidden>
        <VisuallyHidden as="p" ref={ref} data-testid="hidden-paragraph">
          Details follow.
        </VisuallyHidden>
      </>,
    );

    const span = screen.getByTestId("hidden-span");
    expect(span.tagName).toBe("SPAN");
    expect(span).toHaveClass("snui-visually-hidden");
    expect(span).toHaveTextContent("Sort ascending");
    expect(screen.getByTestId("hidden-paragraph").tagName).toBe("P");
    expect(ref.current).toBe(screen.getByTestId("hidden-paragraph"));
  });
});

describe("Text and Code", () => {
  it("applies tone and size classes on the requested element", () => {
    const ref = createRef<HTMLParagraphElement>();
    renderInPanel(
      <>
        <Text data-testid="hint" tone="muted" size="sm">
          Stored in seconds
        </Text>
        <Text as="p" ref={ref} data-testid="paragraph" tone="danger">
          Connection lost
        </Text>
      </>,
    );

    const hint = screen.getByTestId("hint");
    expect(hint.tagName).toBe("SPAN");
    expect(hint).toHaveClass(
      "snui-text",
      "snui-text--muted",
      "snui-text--size-sm",
    );
    const paragraph = screen.getByTestId("paragraph");
    expect(paragraph.tagName).toBe("P");
    expect(paragraph).toHaveClass("snui-text--danger", "snui-text--size-base");
    expect(ref.current).toBe(paragraph);
  });

  it("names only the wrapping behavior that changes something", () => {
    renderInPanel(
      <>
        <Text data-testid="stamp" wrap="nowrap">
          4 minutes ago
        </Text>
        <Text data-testid="report" wrap="preserve">
          {"line one\nline two"}
        </Text>
        <Text data-testid="plain">Ordinary copy</Text>
      </>,
    );

    expect(screen.getByTestId("stamp")).toHaveClass("snui-text--wrap-nowrap");
    expect(screen.getByTestId("report")).toHaveClass(
      "snui-text--wrap-preserve",
    );
    expect(screen.getByTestId("plain").className).not.toMatch(/wrap-/);
  });

  it("renders inline code by default and a pre block when asked", () => {
    renderInPanel(
      <>
        <Code data-testid="inline">navigation.position</Code>
        <Code block data-testid="block">
          {"line one\nline two"}
        </Code>
        <Code as="kbd" data-testid="key">
          Escape
        </Code>
      </>,
    );

    const inline = screen.getByTestId("inline");
    expect(inline.tagName).toBe("CODE");
    expect(inline).toHaveClass("snui-code", "snui-code--inline");
    const block = screen.getByTestId("block");
    expect(block.tagName).toBe("PRE");
    expect(block).toHaveClass("snui-code--block");
    expect(screen.getByTestId("key").tagName).toBe("KBD");
  });

  it("puts a scrollable block in the tab order and leaves inline code out", () => {
    // A block scrolls horizontally past the panel edge, so a keyboard user
    // needs to reach it. jsdom has no layout, so the axe rule that caught
    // this cannot fire here; the attribute is what the browser pass checks.
    renderInPanel(
      <>
        <Code data-testid="inline">navigation.position</Code>
        <Code block data-testid="block">
          {"line one\nline two"}
        </Code>
        <Code block tabIndex={-1} data-testid="opted-out">
          {"line one\nline two"}
        </Code>
      </>,
    );

    expect(screen.getByTestId("block")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("inline")).not.toHaveAttribute("tabindex");
    // A consumer that manages focus itself still wins.
    expect(screen.getByTestId("opted-out")).toHaveAttribute("tabindex", "-1");
  });

  it("treats an explicit pre as the block it renders", () => {
    // The element decides: a pre scrolls and keeps its line breaks whether the
    // caller asked for it through `block` or through `as`.
    renderInPanel(
      <Code as="pre" data-testid="pre">
        {"line one\nline two"}
      </Code>,
    );

    const block = screen.getByTestId("pre");
    expect(block).toHaveClass("snui-code--block");
    expect(block).toHaveAttribute("tabindex", "0");
  });

  it("names a code block so its tab stop announces something", () => {
    renderInPanel(
      <>
        <Code block data-testid="block">
          {"line one"}
        </Code>
        <Code block aria-label="Delta payload" data-testid="named">
          {"line one"}
        </Code>
      </>,
    );

    expect(screen.getByRole("region", { name: "Code" })).toBe(
      screen.getByTestId("block"),
    );
    expect(screen.getByTestId("named")).toHaveAttribute(
      "aria-label",
      "Delta payload",
    );
  });

  it("breaks a path at its segments when asked", () => {
    const { container } = renderInPanel(
      <Code break="segments" data-testid="path">
        navigation.speedOverGround
      </Code>,
    );

    const path = screen.getByTestId("path");
    expect(path).toHaveTextContent("navigation.speedOverGround");
    // One opportunity after the dot, none inside either segment.
    expect(container.querySelectorAll("wbr")).toHaveLength(1);
    expect(path.firstElementChild?.tagName).toBe("WBR");
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
  it("empties and refills the region when the announce key changes", () => {
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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

describe("repeat announcements on visible regions", () => {
  it("re-announces an unchanged status when the key changes", () => {
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <StatusIndicator live="polite" announceKey={1}>
        Preset applied
      </StatusIndicator>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Preset applied");

    rerender(
      panel(
        <StatusIndicator live="polite" announceKey={2}>
          Preset applied
        </StatusIndicator>,
      ),
    );
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
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <Banner
        data-testid="banner"
        live="polite"
        announceKey={1}
        onDismiss={() => undefined}
      >
        Retry failed
      </Banner>,
    );

    rerender(
      panel(
        <Banner
          data-testid="banner"
          live="polite"
          announceKey={2}
          onDismiss={() => undefined}
        >
          Retry failed
        </Banner>,
      ),
    );

    const banner = screen.getByTestId("banner");
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
    vi.useFakeTimers();
    const { rerender } = renderInPanel(
      <StatusIndicator live="polite" announceKey={1}>
        {null}
      </StatusIndicator>,
    );

    // A key that changes during a quiet spell is taken as read, so the first
    // real status is not held back for a beat nobody needed.
    rerender(
      panel(
        <StatusIndicator live="polite" announceKey={2}>
          {null}
        </StatusIndicator>,
      ),
    );
    expect(vi.getTimerCount()).toBe(0);

    rerender(
      panel(
        <StatusIndicator live="polite" announceKey={2}>
          Provider reachable
        </StatusIndicator>,
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Provider reachable");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("tone marks", () => {
  it("renders the shared glyph and announcement for semantic badges", () => {
    const { container } = renderInPanel(<Badge tone="info">Beta</Badge>);

    const badge = container.querySelector(".snui-badge");
    const glyph = badge?.querySelector(".snui-tone-glyph");
    expect(glyph).toHaveClass("snui-badge__tone-glyph");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(glyph).toHaveTextContent("i");
    expect(announcementOf(badge)).toBe("Information. ");
  });

  it("ignores a tone label on neutral surfaces everywhere", () => {
    const { container } = renderInPanel(
      <>
        <Badge toneLabel="Idle">Idle</Badge>
        <StatusIndicator toneLabel="Idle">Idle</StatusIndicator>
        <Metric label="Depth" value="12" toneLabel="Idle" />
      </>,
    );

    expect(container.querySelector(".snui-tone-glyph")).toBeNull();
    expect(container.querySelector(".snui-visually-hidden")).toBeNull();
  });

  it("falls back to the default tone name for a blank status label", () => {
    renderInPanel(
      <StatusIndicator tone="success" toneLabel="  " live="polite">
        Connected
      </StatusIndicator>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Success. Connected");
  });

  it("does not double the stop on a tone label that carries one", () => {
    const { container } = renderInPanel(
      <>
        <Badge tone="warning" toneLabel="Caution!">
          Drifting
        </Badge>
        <Badge tone="danger" toneLabel="Stop">
          Lost
        </Badge>
      </>,
    );

    const [caution, stop] = container.querySelectorAll(".snui-badge");
    expect(announcementOf(caution)).toBe("Caution! ");
    expect(announcementOf(stop)).toBe("Stop. ");
  });

  it("shows the glyph beside the status dot so info and neutral differ", () => {
    const { container } = renderInPanel(
      <>
        <StatusIndicator tone="info">Pending</StatusIndicator>
        <StatusIndicator>Idle</StatusIndicator>
      </>,
    );

    const [info, neutral] = container.querySelectorAll(".snui-status");
    expect(info?.querySelector(".snui-status__dot")).not.toBeNull();
    expect(info?.querySelector(".snui-tone-glyph")).toHaveTextContent("i");
    expect(neutral?.querySelector(".snui-status__dot")).not.toBeNull();
    expect(neutral?.querySelector(".snui-tone-glyph")).toBeNull();
  });

  it("keeps the compact status text accessible while hiding it visually", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = renderInPanel(
      <StatusIndicator ref={ref} size="compact" tone="danger" live="polite">
        Offline
      </StatusIndicator>,
    );

    const status = container.querySelector(".snui-status");
    expect(status).toHaveClass("snui-status--size-compact");
    expect(screen.getByText("Offline")).toHaveClass("snui-visually-hidden");
    expect(status?.querySelector(".snui-status__text")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Error. Offline");
    expect(ref.current).toBe(status);
  });

  it("keeps the banner glyph class alongside the shared mark", () => {
    const { container } = renderInPanel(
      <Banner tone="warning" title="Check the sensor">
        Depth stopped updating.
      </Banner>,
    );

    const icon = container.querySelector(".snui-banner__tone-icon");
    expect(icon).toHaveClass("snui-tone-glyph");
    expect(icon).toHaveTextContent("!");
    expect(
      announcementOf(container.querySelector(".snui-banner__content")),
    ).toBe("Warning. ");
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

describe("Card variants", () => {
  it("paints a decorative accent bar without a glyph or announcement", () => {
    const { container } = renderInPanel(
      <Card accent="success" density="flush">
        Body
      </Card>,
    );
    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--accent-success");
    expect(card?.className).not.toMatch(/snui-card--success/);
    expect(container.querySelector(".snui-card__tone-glyph")).toBeNull();
    expect(container.querySelector(".snui-visually-hidden")).toBeNull();
  });

  it("lets a semantic tone win over a decorative accent", () => {
    const { container } = renderInPanel(
      <Card tone="danger" accent="success">
        Body
      </Card>,
    );
    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--danger");
    expect(card?.className).not.toMatch(/snui-card--accent-/);
  });

  it("supports flush density and a toned accent with its glyph in the header", () => {
    const { container } = renderInPanel(
      <Card density="flush" tone="warning" header="Priority">
        Body
      </Card>,
    );

    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--flush", "snui-card--warning");
    const header = card?.querySelector(".snui-card__header");
    expect(header?.querySelector(".snui-card__tone-glyph")).toHaveTextContent(
      "!",
    );
    expect(announcementOf(header)).toBe("Warning. ");
  });

  it("accepts the shared density values without a tone class for neutral", () => {
    const { container } = renderInPanel(
      <Card density="compact" tone="neutral">
        Body
      </Card>,
    );

    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--compact");
    expect(card?.className).not.toMatch(/snui-card--neutral/);
    expect(card?.querySelector(".snui-tone-glyph")).toBeNull();
  });
});

describe("InputGroup density", () => {
  it("names the compact step only, since the default is the block itself", () => {
    const { container } = renderInPanel(
      <>
        <InputGroup data-testid="compact" density="compact" />
        <InputGroup data-testid="plain" />
      </>,
    );

    expect(screen.getByTestId("compact")).toHaveClass(
      "snui-input-group--compact",
    );
    expect(screen.getByTestId("plain")).toHaveClass("snui-input-group");
    expect(screen.getByTestId("plain").className).not.toMatch(
      /snui-input-group--/,
    );
    expect(
      container.querySelector(".snui-input-group--comfortable"),
    ).toBeNull();
  });
});

describe("CollapsibleSection additions", () => {
  it("drops the region landmark when asked and keeps the heading", () => {
    renderInPanel(
      <CollapsibleSection title="Advanced" landmark={false}>
        Content
      </CollapsibleSection>,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders the leading slot before the heading outside the toggle", () => {
    const { container } = renderInPanel(
      <CollapsibleSection
        title="Chart source"
        leading={<input type="checkbox" aria-label="Enable chart source" />}
      >
        Content
      </CollapsibleSection>,
    );

    const header = container.querySelector(".snui-collapsible__header");
    const leading = header?.querySelector(".snui-collapsible__leading");
    const heading = header?.querySelector(".snui-collapsible__heading");
    expect(leading).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(
      leading !== null &&
        leading !== undefined &&
        heading !== null &&
        heading !== undefined &&
        Boolean(
          leading.compareDocumentPosition(heading) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    ).toBe(true);
    const checkbox = screen.getByRole("checkbox", {
      name: "Enable chart source",
    });
    expect(
      screen.getByRole("button", { name: "Chart source" }).contains(checkbox),
    ).toBe(false);
  });

  it("marks the embedded variant and the heading level", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderInPanel(
      <CollapsibleSection
        ref={ref}
        title="Nested"
        variant="embedded"
        headingLevel={3}
      >
        Content
      </CollapsibleSection>,
    );

    const section = container.querySelector(".snui-collapsible");
    expect(section).toHaveClass("snui-collapsible--embedded");
    expect(section?.querySelector(".snui-collapsible__heading")).toHaveClass(
      "snui-collapsible__heading--level-3",
    );
    expect(ref.current).toBe(section);
  });
});

describe("Accordion landmarks", () => {
  it("defaults its sections to no landmark and lets one opt back in", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <Accordion ref={ref} data-testid="accordion">
        <CollapsibleSection title="First">First content</CollapsibleSection>
        <CollapsibleSection title="Second" landmark>
          Second content
        </CollapsibleSection>
      </Accordion>,
    );

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAccessibleName("Second");
    expect(ref.current).toBe(screen.getByTestId("accordion"));
  });
});

/** Every component that gained a ref, with the element it must resolve to. */
const REF_CASES: readonly {
  readonly name: string;
  readonly tagName: string;
  readonly render: (ref: Ref<never>) => ReactElement;
}[] = [
  {
    name: "Stack",
    tagName: "DIV",
    render: (ref) => <Stack ref={ref} data-testid="target" />,
  },
  {
    name: "Stack as form",
    tagName: "FORM",
    render: (ref) => (
      <Stack as="form" ref={ref} action="/save" data-testid="target" />
    ),
  },
  {
    name: "Cluster",
    tagName: "UL",
    render: (ref) => <Cluster as="ul" ref={ref} data-testid="target" />,
  },
  {
    name: "Card",
    tagName: "SECTION",
    render: (ref) => (
      <Card as="section" ref={ref} data-testid="target">
        Body
      </Card>
    ),
  },
  {
    name: "MetricGrid",
    tagName: "DIV",
    render: (ref) => <MetricGrid ref={ref} data-testid="target" />,
  },
  {
    name: "Metric",
    tagName: "DIV",
    render: (ref) => (
      <Metric ref={ref} data-testid="target" label="Depth" value="12" />
    ),
  },
  {
    name: "Badge",
    tagName: "SPAN",
    render: (ref) => (
      <Badge ref={ref} data-testid="target">
        Beta
      </Badge>
    ),
  },
  {
    name: "StatusIndicator",
    tagName: "SPAN",
    render: (ref) => (
      <StatusIndicator ref={ref} data-testid="target">
        Idle
      </StatusIndicator>
    ),
  },
  {
    name: "Section",
    tagName: "SECTION",
    render: (ref) => (
      <Section ref={ref} data-testid="target" title="Connection">
        Body
      </Section>
    ),
  },
  {
    name: "InputGroup",
    tagName: "DIV",
    render: (ref) => <InputGroup ref={ref} data-testid="target" />,
  },
  {
    name: "InputGroupControl",
    tagName: "DIV",
    render: (ref) => <InputGroupControl ref={ref} data-testid="target" />,
  },
  {
    name: "InputGroupAddon",
    tagName: "SPAN",
    render: (ref) => <InputGroupAddon ref={ref} data-testid="target" />,
  },
];

describe("refs and attribute passthrough", () => {
  it.each(REF_CASES)(
    "resolves the $name ref to its root element",
    ({ render: renderCase, tagName }) => {
      const ref = createRef<never>();
      const { unmount } = render(panel(renderCase(ref)));

      const target = screen.getByTestId("target");
      expect(target.tagName).toBe(tagName);
      expect(ref.current).toBe(target);
      unmount();
    },
  );

  it("passes form attributes through a form stack", () => {
    renderInPanel(
      <Stack as="form" action="/save" noValidate aria-label="Settings">
        <Badge>Ready</Badge>
      </Stack>,
    );

    const form = screen.getByRole("form", { name: "Settings" });
    expect(form).toHaveAttribute("action", "/save");
    expect(form).toHaveAttribute("novalidate");
    expect(within(form).getByText("Ready")).toBeVisible();
  });
});
