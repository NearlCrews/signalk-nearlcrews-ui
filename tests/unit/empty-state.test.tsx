import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../../src/composites.js";
import { renderInPanel } from "../helpers.js";

describe("EmptyState", () => {
  it("requires a non-empty title", () => {
    expect(() => render(<EmptyState title="  " />)).toThrow(
      "signalk-nearlcrews-ui: EmptyState requires a non-empty title.",
    );
  });

  it("renders icon, description, and action", () => {
    renderInPanel(
      <EmptyState
        icon={<span data-testid="icon">*</span>}
        title="No waypoints"
        description="Create a waypoint to see it here."
        action={<button type="button">New waypoint</button>}
      />,
    );

    expect(screen.getByText("No waypoints")).toBeInTheDocument();
    expect(
      screen.getByText("Create a waypoint to see it here."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New waypoint" }),
    ).toBeInTheDocument();

    const icon = screen.getByTestId("icon");
    const iconWrapper = icon.parentElement;
    expect(iconWrapper).toHaveAttribute("aria-hidden", "true");
    // The title is not a heading: consumers own the document outline.
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("omits icon, description, and action when absent", () => {
    const { container } = renderInPanel(<EmptyState title="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(
      container.querySelector(".snui-empty-state__icon"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".snui-empty-state__description"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".snui-empty-state__action"),
    ).not.toBeInTheDocument();
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(<EmptyState title="Nothing here" ref={ref} />);

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-empty-state");
  });
});
