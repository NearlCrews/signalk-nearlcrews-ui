import { screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { VisuallyHidden } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

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
