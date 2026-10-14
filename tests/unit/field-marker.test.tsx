import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldMarker } from "../../src/components/FieldMarker.js";

/** A labeled text box whose label ends in the marker under test. */
function field(marker: React.JSX.Element): React.JSX.Element {
  return (
    <label>
      Depth offset
      {marker}
      <input type="text" />
    </label>
  );
}

describe("FieldMarker", () => {
  it("marks a required control with an asterisk kept out of the name", () => {
    const { container } = render(field(<FieldMarker required />));

    const mark = container.querySelector(".snui-required-mark");
    expect(mark).toHaveTextContent("*");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    // The native required attribute already carries the state, so the mark
    // adds nothing to what is heard.
    expect(
      screen.getByRole("textbox", { name: "Depth offset" }),
    ).toBeInTheDocument();
  });

  it("draws a required mark the field supplies in place of the asterisk", () => {
    const { container } = render(
      field(<FieldMarker required requiredLabel="required" />),
    );

    expect(container.querySelector(".snui-required-mark")).toHaveTextContent(
      "required",
    );
  });

  it("keeps the optional marker in the name, so what is heard matches what is drawn", () => {
    const { container } = render(
      field(<FieldMarker required={false} optionalLabel="(optional)" />),
    );

    const mark = container.querySelector(".snui-optional-mark");
    expect(mark).toHaveTextContent("(optional)");
    expect(mark).not.toHaveAttribute("aria-hidden");
    expect(
      screen.getByRole("textbox", { name: "Depth offset (optional)" }),
    ).toBeInTheDocument();
  });

  it("puts the separating space in the marker, so a bare label ends cleanly", () => {
    const { container } = render(
      <span data-testid="label">
        Depth offset
        <FieldMarker required={false} optionalLabel="(optional)" />
      </span>,
    );

    expect(screen.getByTestId("label").textContent).toBe(
      "Depth offset (optional)",
    );
    expect(container.querySelector(".snui-optional-mark")?.textContent).toBe(
      "(optional)",
    );
  });

  it("draws nothing, space included, when there is no marker to show", () => {
    const { container } = render(
      <>
        <span data-testid="plain">
          Depth
          <FieldMarker required={false} />
        </span>
        <span data-testid="blank-optional">
          Depth
          <FieldMarker required={false} optionalLabel=" " />
        </span>
        <span data-testid="blank-required">
          Depth
          <FieldMarker required requiredLabel="" />
        </span>
      </>,
    );

    for (const id of ["plain", "blank-optional", "blank-required"]) {
      expect(screen.getByTestId(id).textContent).toBe("Depth");
    }
    expect(container.querySelector(".snui-required-mark")).toBeNull();
    expect(container.querySelector(".snui-optional-mark")).toBeNull();
  });

  it("shows the required mark alone when a control is both required and given optional text", () => {
    const { container } = render(
      field(<FieldMarker required optionalLabel="(optional)" />),
    );

    expect(container.querySelector(".snui-required-mark")).not.toBeNull();
    expect(container.querySelector(".snui-optional-mark")).toBeNull();
  });
});
