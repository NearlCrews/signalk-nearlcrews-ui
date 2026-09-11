import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "../../src/index.js";
import { formOf, renderInPanel } from "../helpers.js";

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

describe("Checkbox held focusable while blocked", () => {
  it("blocks every route to the state while staying operable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <Checkbox
        ariaDisabled
        label="Include primary provider"
        checked
        onChange={onChange}
      />,
    );

    const box = screen.getByRole("checkbox", {
      name: "Include primary provider",
    });
    expect(box).toHaveAttribute("aria-disabled", "true");
    // Focusable, and still reporting its real state: this is the last
    // remaining selection, not a control that has gone away.
    expect(box).toBeEnabled();
    expect(box).toBeChecked();
    box.focus();
    expect(box).toHaveFocus();

    await user.click(box);
    expect(onChange).not.toHaveBeenCalled();
    expect(box).toBeChecked();

    // The label is part of the activation area, so pressing it has to be
    // blocked as well, and Space is the box's own activation key.
    await user.click(screen.getByText("Include primary provider"));
    await user.keyboard(" ");
    expect(onChange).not.toHaveBeenCalled();
    expect(box).toBeChecked();
    expect(box).toHaveFocus();
  });

  it("keeps submitting with its form and lets Enter through", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.SyntheticEvent) => {
      event.preventDefault();
    });
    renderInPanel(
      <form onSubmit={onSubmit}>
        <Checkbox
          ariaDisabled
          name="providers"
          value="primary"
          label="Include primary provider"
          defaultChecked
        />
        <button type="submit">Save</button>
      </form>,
    );

    const box = screen.getByRole("checkbox", {
      name: "Include primary provider",
    });
    // A blocked box is not an absent one: its value still belongs to the form.
    expect(new FormData(formOf(box)).getAll("providers")).toEqual(["primary"]);

    box.focus();
    await user.keyboard("{Enter}");
    // Enter belongs to the form, not to the box, so it is not an activation
    // key to block.
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(box).toBeChecked();
  });

  it("reads a native aria-disabled attribute only while the prop is absent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <>
        <Checkbox
          aria-disabled="true"
          label="From the attribute"
          onChange={onChange}
        />
        <Checkbox
          ariaDisabled={false}
          aria-disabled="true"
          label="Prop wins"
          onChange={onChange}
        />
      </>,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "From the attribute" }),
    );
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "Prop wins" }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("does not describe a natively disabled box twice", () => {
    renderInPanel(
      <Checkbox disabled ariaDisabled label="Unavailable entirely" />,
    );

    const box = screen.getByRole("checkbox", { name: "Unavailable entirely" });
    expect(box).toBeDisabled();
    expect(box).not.toHaveAttribute("aria-disabled");
  });
});

describe("Checkbox mixed state while blocked", () => {
  it("keeps the mixed state when a blocked box is pressed", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Checkbox
        ariaDisabled
        indeterminate
        checked={false}
        label="Some layers selected"
        onChange={vi.fn()}
      />,
    );

    const box = screen.getByRole<HTMLInputElement>("checkbox", {
      name: "Some layers selected",
    });
    expect(box.indeterminate).toBe(true);

    // Toggling clears the mixed state as well as the checkedness, and no
    // render follows a blocked press to re-assert it.
    await user.click(box);
    expect(box.indeterminate).toBe(true);
    expect(box).not.toBeChecked();
  });
});
