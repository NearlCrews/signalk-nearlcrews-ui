import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Banner,
  Card,
  Cluster,
  InputGroup,
  type LayoutJustification,
  Metric,
  MetricGrid,
  Stack,
  StatusIndicator,
} from "../../src/index.js";
import { LAYOUT_STYLES } from "../../src/styles/layout.js";
import {
  hasUnitContent,
  isNamedUnit,
  unitSpokenText,
} from "../../src/utils/unit.js";
import { SPACE_SCALE } from "../../src/utils/variants.js";
import { ruleBody } from "../css-helpers.js";
import { expectNoAxeViolations, renderInPanel } from "../helpers.js";
import { announcementOf } from "./lib/announcements.js";

/** The card element itself, which carries the block class. */
function cardOf(container: HTMLElement): HTMLElement {
  const card = container.querySelector(".snui-card");
  if (!(card instanceof HTMLElement)) throw new Error("expected a card");
  return card;
}

describe("Card tone mark placement", () => {
  it("keeps a headerless tone glyph with the content it marks", () => {
    const { container } = renderInPanel(
      <Card tone="warning">Configuration is out of date.</Card>,
    );

    const card = cardOf(container);
    const body = card.querySelector(".snui-card__body");
    expect(card.firstElementChild).toBe(body);
    expect(card.querySelector(".snui-card__header")).toBeNull();
    // As a grid child the glyph took a row of its own above the body.
    expect(card.querySelector(":scope > .snui-card__tone-glyph")).toBeNull();
    expect(body?.firstElementChild).toHaveClass("snui-card__tone-glyph");
    expect(body).toHaveTextContent("Configuration is out of date.");
    expect(screen.getByText("Warning.")).toBeInTheDocument();
  });

  it("leaves an untoned card's children as direct children", () => {
    const { container } = renderInPanel(<Card>Plain body</Card>);

    const card = cardOf(container);
    expect(card.querySelector(".snui-card__body")).toBeNull();
    expect(card).toHaveTextContent("Plain body");
  });

  it("keeps the glyph in the header when the card has one", () => {
    const { container } = renderInPanel(
      <Card tone="danger" header="Engine" footer="Updated just now">
        Oil pressure lost.
      </Card>,
    );

    const card = cardOf(container);
    expect(card.querySelector(".snui-card__body")).toBeNull();
    expect(
      card.querySelector(".snui-card__header .snui-card__tone-glyph"),
    ).not.toBeNull();
    expect(card.querySelector(".snui-card__footer")).toHaveTextContent(
      "Updated just now",
    );
  });
});

describe("Card naming", () => {
  // Built at runtime, as a computed name would be: a literal blank is what
  // the lint rule already refuses.
  const BLANK = " ".repeat(2);

  it("groups and names a card from a label", () => {
    renderInPanel(<Card label="Speed over ground">Row body</Card>);

    expect(
      screen.getByRole("group", { name: "Speed over ground" }),
    ).toHaveTextContent("Row body");
  });

  it("groups and names a card from the native aria-label", () => {
    renderInPanel(<Card aria-label="Speed over ground">Row body</Card>);

    // A name on a plain div reaches nobody, so the name brings the role with
    // it, whichever spelling the consumer reached for.
    expect(
      screen.getByRole("group", { name: "Speed over ground" }),
    ).toHaveTextContent("Row body");
  });

  it("names a card by something already on screen", () => {
    const { container } = renderInPanel(
      <>
        <span id="row-name">navigation.speedOverGround</span>
        <Card aria-labelledby="row-name">Row body</Card>
      </>,
    );

    const card = cardOf(container);
    expect(card).toHaveAttribute("role", "group");
    expect(card).toHaveAttribute("aria-labelledby", "row-name");
    expect(card).not.toHaveAttribute("aria-label");
    expect(
      screen.getByRole("group", { name: "navigation.speedOverGround" }),
    ).toBe(card);
  });

  it("gives a blank native name no group role", () => {
    const { container } = renderInPanel(
      <Card aria-label={BLANK} aria-labelledby={BLANK}>
        Row body
      </Card>,
    );

    const card = cardOf(container);
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("aria-label");
    expect(card).not.toHaveAttribute("aria-labelledby");
  });

  it("keeps a named nav or section card the landmark its element is", async () => {
    const { container } = renderInPanel(
      <>
        <Card as="nav" aria-label="Sections">
          Nav body
        </Card>
        <Card as="section" aria-label="Details">
          Section body
        </Card>
        <Card as="nav" label="Charts">
          Nav body
        </Card>
        <Card as="section" label="Routes">
          Section body
        </Card>
      </>,
    );

    // The name completes the element's own landmark; a group role would
    // replace it, and ARIA does not allow group on nav at all.
    expect(screen.queryByRole("group")).toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Sections" }),
    ).toHaveTextContent("Nav body");
    expect(screen.getByRole("navigation", { name: "Charts" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Details" })).toHaveTextContent(
      "Section body",
    );
    expect(screen.getByRole("region", { name: "Routes" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("names a card by its label when the native name is blank", () => {
    renderInPanel(
      <Card aria-label={BLANK} label="Speed over ground">
        Row body
      </Card>,
    );

    expect(
      screen.getByRole("group", { name: "Speed over ground" }),
    ).toHaveAttribute("aria-label", "Speed over ground");
  });

  it("lets the native name win over the label", () => {
    renderInPanel(
      <Card aria-label="Course over ground" label="Speed over ground">
        Row body
      </Card>,
    );

    expect(
      screen.getByRole("group", { name: "Course over ground" }),
    ).toHaveTextContent("Row body");
    expect(
      screen.queryByRole("group", { name: "Speed over ground" }),
    ).toBeNull();
  });

  it("leaves an unnamed card, and a card with its own role, alone", () => {
    const { container } = renderInPanel(
      <>
        <Card>Plain body</Card>
        <Card as="section" role="region" label="Sources">
          Named body
        </Card>
      </>,
    );

    const [plain, section] = container.querySelectorAll(".snui-card");
    expect(plain).not.toHaveAttribute("role");
    expect(section).toHaveAttribute("role", "region");
    expect(section).toHaveAttribute("aria-label", "Sources");
  });
});

/** The item selector the divided stack's rule uses, read from the sheet. */
function dividedItemSelector(): string {
  const match = /\.snui-stack--divided > (.+) \{/.exec(LAYOUT_STYLES);
  if (match?.[1] === undefined) throw new Error("no divided stack rule");
  return match[1];
}

describe("divided stacks", () => {
  it("draws no rule above the first shown row after an empty announcing shell", () => {
    const { container } = renderInPanel(
      <>
        <Stack divided data-testid="banner-first">
          <Banner live="polite">{null}</Banner>
          <div>Row 1</div>
          <div>Row 2</div>
        </Stack>
        <Stack divided data-testid="status-first">
          <StatusIndicator live="polite">{null}</StatusIndicator>
          <div>Row 1</div>
          <div>Row 2</div>
        </Stack>
        <Stack divided data-testid="settling-first">
          <StatusIndicator live="polite" settleMs={500}>
            {null}
          </StatusIndicator>
          <div>Row 1</div>
          <div>Row 2</div>
        </Stack>
      </>,
    );

    const selector = dividedItemSelector();
    for (const stack of container.querySelectorAll(".snui-stack--divided")) {
      const [shell, first, second] = [...stack.children];
      // The shell leaves the flow while it waits, so it is not the item a
      // rule follows, and it draws none itself.
      expect(shell?.matches(selector)).toBe(false);
      expect(first?.matches(selector)).toBe(false);
      expect(second?.matches(selector)).toBe(true);
    }
  });

  it("marks a divided stack for the rule between its items", () => {
    const { container } = renderInPanel(
      <>
        <Stack divided gap={3}>
          <span>First</span>
          <span>Second</span>
        </Stack>
        <Stack>
          <span>Plain</span>
        </Stack>
      </>,
    );

    const [divided, plain] = container.querySelectorAll(".snui-stack");
    expect(divided).toHaveClass("snui-stack--divided", "snui-stack--gap-3");
    expect(plain).not.toHaveClass("snui-stack--divided");
  });

  it("keeps the shell exclusions weightless, so the rule stays easy to override", () => {
    // :not() takes the weight of its heaviest argument, so the shell
    // selectors sit inside :where() and the rule keeps the weight of its
    // three classes, as before they were added.
    expect(dividedItemSelector()).toBe(
      ":not([hidden], .snui-visually-hidden):not(:where(.snui-banner:empty, .snui-status:empty, .snui-status:has(> .snui-status__region:only-child))) ~ :not([hidden], .snui-visually-hidden):not(:where(.snui-banner:empty, .snui-status:empty, .snui-status:has(> .snui-status__region:only-child)))",
    );
  });

  it("draws the rule on every shown item after the first, splitting the gap", () => {
    const rule = ruleBody(
      LAYOUT_STYLES,
      `.snui-stack--divided > ${dividedItemSelector()}`,
    );
    // A divider is decorative, so it takes the subtle border.
    expect(rule).toContain(
      "border-block-start: 1px solid var(--snui-color-border-subtle);",
    );
    expect(rule).toContain(
      "padding-block-start: var(--snui-stack-divider-space);",
    );
    // Half the step above the rule and half below it, so a divided stack
    // keeps the rhythm of an undivided one.
    expect(
      ruleBody(LAYOUT_STYLES, ".snui-stack.snui-stack--divided"),
    ).toContain("row-gap: var(--snui-stack-divider-space);");
    for (const space of SPACE_SCALE) {
      expect(
        ruleBody(
          LAYOUT_STYLES,
          `.snui-stack--divided.snui-stack--gap-${String(space)}`,
        ),
      ).toContain(
        `--snui-stack-divider-space: calc(var(--snui-space-${String(space)}) / 2);`,
      );
    }
  });

  it("keeps list semantics when divided", () => {
    const { container } = renderInPanel(
      <Stack as="ul" divided>
        <span>Alpha</span>
        <span>Beta</span>
      </Stack>,
    );

    expect(
      container.querySelectorAll(".snui-stack--divided > li"),
    ).toHaveLength(2);
  });
});

describe("container outlines", () => {
  it("draws card rules and metric tiles with the subtle border", () => {
    for (const selector of [
      ".snui-card__header",
      ".snui-card__footer",
      ".snui-metric",
    ]) {
      expect(ruleBody(LAYOUT_STYLES, selector), selector).toContain(
        "var(--snui-color-border-subtle)",
      );
    }
  });

  it("draws the card footer rule across the card and limits only its text", () => {
    // The measure on the ruled box cut the rule off at 70ch while the header
    // rule spanned the card. Percentage padding that kept the text to the
    // measure counts as zero when a card sizes to its content, so a long
    // footnote widened a card in a Cluster. The ruled box stays full width,
    // and an inner box takes the measure, which also caps what the footer
    // asks of a content-sized card.
    const footer = ruleBody(LAYOUT_STYLES, ".snui-card__footer");
    expect(footer).not.toContain("max-width");
    expect(footer).not.toContain("padding-inline-end");
    expect(footer).toContain(
      "border-block-start: 1px solid var(--snui-color-border-subtle);",
    );
    expect(ruleBody(LAYOUT_STYLES, ".snui-card__footer-content")).toContain(
      "max-width: 70ch;",
    );

    const { container } = renderInPanel(
      <Card footer="Updated just now">Revolution content</Card>,
    );
    const content = container.querySelector(
      ".snui-card__footer > .snui-card__footer-content",
    );
    expect(content).toHaveTextContent("Updated just now");
  });

  it("keeps the full border on the code block, a keyboard scroll stop", () => {
    expect(ruleBody(LAYOUT_STYLES, ".snui-code--block")).toContain(
      "border: 1px solid var(--snui-color-border);",
    );
  });
});

describe("metric units", () => {
  it("shows a symbol and speaks its name", () => {
    const { container } = renderInPanel(
      <Metric
        label="Speed through water"
        value="6.2"
        unit={{ symbol: "kn", name: "knots" }}
      />,
    );

    const unit = container.querySelector(".snui-metric__unit");
    const [symbol, name] = unit?.children ?? [];
    expect(symbol).toHaveTextContent("kn");
    expect(symbol).toHaveAttribute("aria-hidden", "true");
    expect(name).toHaveClass("snui-visually-hidden");
    // The leading space keeps the reading and its unit one spoken phrase.
    expect(name?.textContent).toBe(" knots");
    // The group is named by its label alone: the unit describes the value.
    expect(
      screen.getByRole("group", { name: "Speed through water" }),
    ).toBeInTheDocument();
  });

  it("keeps a plain unit exactly as before", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" unit="m" />,
    );

    // The unit is a suffix inside the value, so it is read through it.
    const value = container.querySelector(".snui-metric__value");
    expect(value?.querySelector(".snui-metric__unit")?.innerHTML).toBe("m");
    expect(value).toHaveTextContent("12.4 m");
  });

  it("falls back to the symbol when the name is blank", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" unit={{ symbol: "ft", name: " " }} />,
    );

    expect(container.querySelector(".snui-metric__unit")?.innerHTML).toBe("ft");
  });

  it("renders no unit for an empty pair", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" unit={{ symbol: "", name: "" }} />,
    );

    expect(container.querySelector(".snui-metric__unit")).toBeNull();
  });

  it("announces a named unit through a live value", () => {
    renderInPanel(
      <Metric
        label="Speed through water"
        value="6.2"
        unit={{ symbol: "kn", name: "knots" }}
        live="polite"
        deferFirstMessage={false}
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("6.2 kn knots");
  });
});

describe("unit labels", () => {
  it("tells a symbol and name pair from plain content", () => {
    expect(isNamedUnit({ symbol: "kn", name: "knots" })).toBe(true);
    for (const plain of ["kn", 3, null, undefined, <span key="u">kn</span>]) {
      expect(isNamedUnit(plain)).toBe(false);
    }
  });

  it("counts a unit present when either half carries text", () => {
    expect(hasUnitContent({ symbol: "", name: "knots" })).toBe(true);
    expect(hasUnitContent({ symbol: "kn", name: "" })).toBe(true);
    expect(hasUnitContent({ symbol: " ", name: " " })).toBe(false);
    expect(hasUnitContent("m")).toBe(true);
    expect(hasUnitContent("")).toBe(false);
  });

  it("speaks the name, else the text the unit shows", () => {
    // What a range control appends to its value text, "6 knots".
    expect(unitSpokenText({ symbol: "kn", name: " knots " })).toBe("knots");
    expect(unitSpokenText({ symbol: <abbr>kn</abbr>, name: "" })).toBe("kn");
    expect(unitSpokenText(<span>hPa</span>)).toBe("hPa");
    expect(unitSpokenText(undefined)).toBeUndefined();
  });
});

describe("layout primitives", () => {
  it("carries the gap step and the alignment a caller asked for", () => {
    const { container } = renderInPanel(
      <>
        <Stack gap={3} align="center">
          Row
        </Stack>
        <Cluster gap={1} justify="between">
          Chip
        </Cluster>
      </>,
    );

    expect(container.querySelector(".snui-stack")).toHaveClass(
      "snui-stack--gap-3",
      "snui-layout--align-center",
    );
    expect(container.querySelector(".snui-cluster")).toHaveClass(
      "snui-cluster--gap-1",
      "snui-layout--justify-between",
    );
  });

  it("names the justification a wrapper forwards", () => {
    // A consumer wrapper names the union rather than restating it, the way it
    // already can for the alignment axis.
    const justify: LayoutJustification = "evenly";
    const { container } = renderInPanel(
      <Cluster justify={justify}>Chip</Cluster>,
    );

    expect(container.querySelector(".snui-cluster")).toHaveClass(
      "snui-layout--justify-evenly",
    );
  });

  it("wraps only the children a list actually renders", () => {
    // Derived rather than written as a literal, because the spec is about a
    // child a condition decided against rendering, not about a constant.
    const pendingPaths: readonly string[] = [];
    const pending = pendingPaths.length > 0;
    const { container } = renderInPanel(
      <Stack as="ul">
        {null}
        {pending && <span>Pending</span>}
        <span>Alpha</span>
        {undefined}
        <span>Beta</span>
      </Stack>,
    );

    // A conditional child that rendered nothing must not leave a list item a
    // reader counts and the row gap paints a blank row for.
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Alpha");
    expect(items[1]).toHaveTextContent("Beta");
  });

  it("wraps list items for clusters and metric grids too", () => {
    const { container } = renderInPanel(
      <>
        <Cluster as="ol">
          <span>One</span>
          {null}
        </Cluster>
        <MetricGrid as="ul">
          {null}
          <span>Two</span>
        </MetricGrid>
      </>,
    );

    expect(container.querySelectorAll(".snui-cluster > li")).toHaveLength(1);
    expect(container.querySelectorAll(".snui-metric-grid > li")).toHaveLength(
      1,
    );
  });
});

describe("layout primitives on semantic elements", () => {
  it("renders layout primitives on semantic elements with list items wrapped", () => {
    renderInPanel(
      <>
        <Stack as="ul" data-testid="stack-list">
          <span>First</span>
          <span>Second</span>
        </Stack>
        <Cluster as="ol" data-testid="cluster-list">
          <span>One</span>
        </Cluster>
        <Card as="section" data-testid="card-section">
          Body
        </Card>
        <MetricGrid as="ul" data-testid="metric-list">
          <Metric label="Depth" value="12" />
          <Metric label="Wind" value="8" />
        </MetricGrid>
      </>,
    );

    const stack = screen.getByTestId("stack-list");
    expect(stack.tagName).toBe("UL");
    expect(stack).toHaveClass("snui-stack");
    expect(stack.querySelectorAll(":scope > li")).toHaveLength(2);

    const cluster = screen.getByTestId("cluster-list");
    expect(cluster.tagName).toBe("OL");
    expect(cluster.querySelectorAll(":scope > li")).toHaveLength(1);

    expect(screen.getByTestId("card-section").tagName).toBe("SECTION");

    const grid = screen.getByTestId("metric-list");
    expect(grid.tagName).toBe("UL");
    expect(grid.querySelectorAll(":scope > li")).toHaveLength(2);
    expect(grid.querySelectorAll(".snui-metric")).toHaveLength(2);
  });

  it("defaults layout primitives to div and supports form stacks", () => {
    renderInPanel(
      <>
        <Stack data-testid="plain-stack">Plain</Stack>
        <Stack as="form" data-testid="form-stack" aria-label="Settings">
          Fields
        </Stack>
      </>,
    );

    expect(screen.getByTestId("plain-stack").tagName).toBe("DIV");
    expect(screen.getByTestId("form-stack").tagName).toBe("FORM");
  });

  it("supports space distribution justify options on clusters", () => {
    renderInPanel(
      <>
        <Cluster justify="around" data-testid="around">
          A
        </Cluster>
        <Cluster justify="evenly" data-testid="evenly">
          B
        </Cluster>
      </>,
    );

    expect(screen.getByTestId("around")).toHaveClass(
      "snui-layout--justify-around",
    );
    expect(screen.getByTestId("evenly")).toHaveClass(
      "snui-layout--justify-evenly",
    );
  });

  it("supports compact density and header plus footer slots on cards", () => {
    const { container } = renderInPanel(
      <Card density="compact" header="Engine" footer="Updated just now">
        Revolution content
      </Card>,
    );

    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--compact");
    expect(card.querySelector(".snui-card__header")).toHaveTextContent(
      "Engine",
    );
    expect(card.querySelector(".snui-card__footer")).toHaveTextContent(
      "Updated just now",
    );
  });

  it("renders default card density without slot wrappers for empty slots", () => {
    const { container } = renderInPanel(
      <Card header={null} footer="">
        Body
      </Card>,
    );

    const card = cardOf(container);
    expect(card.className).not.toMatch(/snui-card--/);
    expect(card.querySelector(".snui-card__header")).toBeNull();
    expect(card.querySelector(".snui-card__footer")).toBeNull();
  });

  it("announces metric values through a polite live region", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" live="polite" />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveClass("snui-metric__value");
    expect(status).not.toHaveAttribute("aria-live");
    expect(container.querySelector(".snui-metric")).toHaveAttribute(
      "role",
      "group",
    );
  });

  it("keeps metric values inert without a live mode", () => {
    const { container } = renderInPanel(
      <>
        <Metric label="Depth" value="12.4" />
        <Metric label="Wind" value="8" live="off" />
      </>,
    );

    const values = container.querySelectorAll(".snui-metric__value");
    expect(values[0]).not.toHaveAttribute("role");
    expect(values[0]).not.toHaveAttribute("aria-live");
    expect(values[1]).not.toHaveAttribute("role");
    expect(values[1]).toHaveAttribute("aria-live", "off");
  });
});

describe("layout rhythm and metric presentation", () => {
  it("renders shared rhythm and metric presentation primitives", () => {
    const { container } = renderInPanel(
      <Stack gap={3}>
        <Cluster justify="between">
          <Badge tone="success">Ready</Badge>
        </Cluster>
        <Card>
          <MetricGrid>
            <Metric
              label="Updates"
              value="12"
              detail="Since startup"
              tone="info"
            />
          </MetricGrid>
        </Card>
      </Stack>,
    );

    expect(container.querySelector(".snui-stack--gap-3")).not.toBeNull();
    expect(
      container.querySelector(".snui-layout--justify-between"),
    ).not.toBeNull();
    expect(screen.getByText("Ready")).toBeVisible();
    expect(screen.getByText("Updates")).toBeVisible();
    expect(screen.getByText("Since startup")).toBeVisible();
    expect(screen.getByRole("group", { name: "Updates" })).toHaveTextContent(
      "12",
    );
  });
});

describe("Card variants", () => {
  it("paints a decorative accent bar without a glyph or announcement", () => {
    const { container } = renderInPanel(
      <Card accent="success" density="flush">
        Body
      </Card>,
    );
    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--accent-success");
    expect(card.className).not.toMatch(/snui-card--success/);
    // No glyph to keep beside the content, so no body wrapper either.
    expect(card.querySelector(".snui-card__body")).toBeNull();
    expect(container.querySelector(".snui-card__tone-glyph")).toBeNull();
    expect(container.querySelector(".snui-visually-hidden")).toBeNull();
  });

  it("lets a semantic tone win over a decorative accent", () => {
    const { container } = renderInPanel(
      <Card tone="danger" accent="success">
        Body
      </Card>,
    );
    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--danger");
    expect(card.className).not.toMatch(/snui-card--accent-/);
  });

  it("supports flush density and a toned accent with its glyph in the header", () => {
    const { container } = renderInPanel(
      <Card density="flush" tone="warning" header="Priority">
        Body
      </Card>,
    );

    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--flush", "snui-card--warning");
    const header = card.querySelector(".snui-card__header");
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

    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--compact");
    expect(card.className).not.toMatch(/snui-card--neutral/);
    expect(card.querySelector(".snui-tone-glyph")).toBeNull();
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

describe("attribute passthrough", () => {
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
