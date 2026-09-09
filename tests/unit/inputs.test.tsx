import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Checkbox } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

describe("Checkbox activation area", () => {
  it("wraps the box and its label alone, so a message is not a toggle", () => {
    const { container } = renderInPanel(
      <Checkbox
        label="Emit computed values"
        description="Publishes onto the vessel bus."
        error="Choose a source first."
        defaultChecked={false}
      />,
    );

    const control = container.querySelector("label.snui-checkbox__control");
    expect(control).not.toBeNull();
    expect(control?.querySelector(".snui-checkbox__input")).not.toBeNull();
    expect(control?.querySelector(".snui-checkbox__label")).not.toBeNull();
    // Both messages stay outside the label; aria-describedby and
    // aria-errormessage already tie them to the control.
    expect(control?.querySelector(".snui-checkbox__description")).toBeNull();
    expect(control?.querySelector(".snui-checkbox__error")).toBeNull();
    const block = container.querySelector(".snui-checkbox");
    expect(block?.tagName).toBe("DIV");
    expect(block?.querySelector(".snui-checkbox__description")).not.toBeNull();
    expect(block?.querySelector(".snui-checkbox__error")).not.toBeNull();
  });

  it("keeps the setting unchanged when the description or the error is pressed", async () => {
    const user = userEvent.setup();
    const { container } = renderInPanel(
      <Checkbox
        label="Emit computed values"
        description="Publishes onto the vessel bus."
        error="Choose a source first."
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Emit computed values",
    });
    const description = container.querySelector(".snui-checkbox__description");
    const error = container.querySelector(".snui-checkbox__error");
    expect(description).not.toBeNull();
    expect(error).not.toBeNull();

    await user.click(description as HTMLElement);
    expect(checkbox).not.toBeChecked();
    await user.click(error as HTMLElement);
    expect(checkbox).not.toBeChecked();

    // The label itself still toggles, so the control keeps its own hit area.
    await user.click(screen.getByText("Emit computed values"));
    expect(checkbox).toBeChecked();
  });

  it("puts the hidden-label modifier on the block that owns the layout", () => {
    const { container } = renderInPanel(
      <Checkbox label="Select all rows" labelVisibility="hidden" />,
    );

    const block = container.querySelector(".snui-checkbox");
    expect(block).toHaveClass("snui-checkbox--label-hidden");
    expect(block?.querySelector(".snui-checkbox__control")).not.toBeNull();
  });
});
