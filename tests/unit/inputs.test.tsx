import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox, NumberInput, Select, Textarea } from "../../src/index.js";
import { formOf, renderInPanel } from "../helpers.js";

describe("Checkbox activation area", () => {
  it("places both messages outside the label that toggles the box", () => {
    const { container } = renderInPanel(
      <Checkbox
        label="Emit computed values"
        description="Publishes onto the vessel bus."
        error="Choose a source first."
        defaultChecked={false}
      />,
    );

    // The test below proves behaviorally that pressing a message does not
    // toggle; this one pins where the two messages sit, which is what makes
    // that true and what a restructuring could quietly undo.
    const control = container.querySelector("label.snui-checkbox__control");
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

  it("marks a required box and keeps the mark out of its name", () => {
    const { container } = renderInPanel(
      <Checkbox required label="Accept the provider agreement" />,
    );

    const box = screen.getByRole("checkbox", {
      name: "Accept the provider agreement",
    });
    expect(box).toBeRequired();
    const marks = container.querySelectorAll(".snui-required-mark");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("takes markers of its own for the required and optional cases", () => {
    const { container } = renderInPanel(
      <>
        <Checkbox required requiredLabel="(required)" label="Accept terms" />
        <Checkbox optionalLabel="(optional)" label="Send diagnostics" />
        <Checkbox label="Publish depth" />
      </>,
    );

    const labels = container.querySelectorAll(".snui-checkbox__label");
    expect(labels[0]?.querySelector(".snui-required-mark")).toHaveTextContent(
      "(required)",
    );
    // The optional marker stays in the name, so what is heard matches what is
    // drawn; a box with neither marker gains no trailing space.
    expect(
      screen.getByRole("checkbox", { name: "Send diagnostics (optional)" }),
    ).toBeTruthy();
    expect(labels[2]?.textContent).toBe("Publish depth");
  });

  it("reports an aria-label the rendered label overrides", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      renderInPanel(
        <Checkbox
          aria-label="Wind"
          label="Publish wind alerts to the vessel bus"
        />,
      );
      expect(warn.mock.calls[0]?.[0]).toContain("aria-label");
      // The rendered label is what names the box, whatever was passed.
      expect(
        screen.getByRole("checkbox", {
          name: "Publish wind alerts to the vessel bus",
        }),
      ).toBeTruthy();
    } finally {
      warn.mockRestore();
    }
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

describe("Monospace and row-count options", () => {
  it("renders numeric and select identifiers in the monospace stack", () => {
    renderInPanel(
      <>
        <NumberInput monospace aria-label="PGN" defaultValue={130306} />
        <Select monospace aria-label="Source">
          <option value="a">A</option>
        </Select>
      </>,
    );

    // PGN numbers, MMSI values, and port numbers are exactly the digits the
    // tabular stack is for.
    expect(screen.getByRole("spinbutton", { name: "PGN" })).toHaveClass(
      "snui-input--monospace",
    );
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveClass(
      "snui-input--monospace",
    );
  });

  it("releases the textarea height floor for either row count", () => {
    renderInPanel(
      <>
        <Textarea rows={2} aria-label="Notes" />
        <Textarea minRows={2} aria-label="Remarks" />
        <Textarea aria-label="Comments" />
      </>,
    );

    // A row count states the height whichever prop carried it, so a small
    // count is not swallowed by the module's own minimum.
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveClass(
      "snui-textarea--rows",
    );
    expect(screen.getByRole("textbox", { name: "Remarks" })).toHaveClass(
      "snui-textarea--rows",
    );
    expect(screen.getByRole("textbox", { name: "Comments" })).not.toHaveClass(
      "snui-textarea--rows",
    );
  });
});
