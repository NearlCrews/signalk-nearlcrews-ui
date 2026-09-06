import { render, screen, within } from "@testing-library/react";
import { createRef, type ReactElement, type Ref } from "react";
import { describe, expect, it } from "vitest";

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

describe("Card variants", () => {
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

  it("places the tone mark first when a toned card has no header", () => {
    const { container } = renderInPanel(<Card tone="danger">Body</Card>);

    const card = container.querySelector(".snui-card");
    expect(card?.firstElementChild).toHaveClass("snui-card__tone-glyph");
    expect(card?.querySelector(".snui-card__header")).toBeNull();
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
  it("maps the deprecated comfortable value onto default", () => {
    const { container } = renderInPanel(
      <>
        <InputGroup data-testid="legacy" density="comfortable" />
        <InputGroup data-testid="compact" density="compact" />
        <InputGroup data-testid="plain" />
      </>,
    );

    expect(screen.getByTestId("legacy")).toHaveClass(
      "snui-input-group--default",
    );
    expect(screen.getByTestId("compact")).toHaveClass(
      "snui-input-group--compact",
    );
    expect(screen.getByTestId("plain")).toHaveClass(
      "snui-input-group--default",
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
