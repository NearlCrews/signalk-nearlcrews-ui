import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// The justification type is imported from the module that owns it: the root
// barrel entry lands with the rest of this release's export changes.
import type { LayoutJustification } from "../../src/components/Layout.js";
import { Card, Cluster, MetricGrid, Stack } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

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

  it("adds no wrapper for a decorative accent, which renders no glyph", () => {
    const { container } = renderInPanel(
      <Card accent="info">Accented body</Card>,
    );

    const card = cardOf(container);
    expect(card).toHaveClass("snui-card--accent-info");
    expect(card.querySelector(".snui-card__body")).toBeNull();
    expect(card.querySelector(".snui-card__tone-glyph")).toBeNull();
  });
});

describe("Card naming", () => {
  it("groups and names a card from a label", () => {
    renderInPanel(<Card label="Speed over ground">Row body</Card>);

    expect(
      screen.getByRole("group", { name: "Speed over ground" }),
    ).toHaveTextContent("Row body");
  });

  it("names a card by something already on screen", () => {
    const { container } = renderInPanel(
      <>
        <span id="row-name">navigation.speedOverGround</span>
        <Card labelledBy="row-name">Row body</Card>
      </>,
    );

    const card = cardOf(container);
    expect(card).toHaveAttribute("role", "group");
    expect(card).toHaveAttribute("aria-labelledby", "row-name");
    expect(card).not.toHaveAttribute("aria-label");
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
