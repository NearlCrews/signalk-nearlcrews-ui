import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "../../src/index.js";
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
