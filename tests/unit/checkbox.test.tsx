import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "../../src/index.js";
import { formOf, loggedMessages, panel, renderInPanel } from "../helpers.js";

describe("Checkbox", () => {
  it("renders a self-labeled checkbox with a description", () => {
    renderInPanel(
      <Checkbox
        label="Enable provider"
        description="Starts the optional data provider."
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the optional data provider.",
    );
  });

  it("reflects and updates the indeterminate checkbox state", () => {
    const checkboxRef = createRef<HTMLInputElement>();
    const { rerender } = renderInPanel(
      <Checkbox ref={checkboxRef} label="Enable provider" indeterminate />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toBePartiallyChecked();
    expect(checkboxRef.current).toBe(checkbox);

    rerender(
      panel(
        <Checkbox
          ref={checkboxRef}
          label="Enable provider"
          indeterminate={false}
        />,
      ),
    );
    expect(checkbox).not.toBePartiallyChecked();
  });

  it("re-asserts a held indeterminate state after user interaction", async () => {
    const user = userEvent.setup();

    function Harness(): React.JSX.Element {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          label="Partially enabled"
          indeterminate
          checked={checked}
          onChange={(event) => setChecked(event.currentTarget.checked)}
        />
      );
    }

    renderInPanel(<Harness />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Partially enabled",
    });
    expect(checkbox).toBePartiallyChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toBePartiallyChecked();
  });

  it("associates checkbox errors without announcing persistent validation", () => {
    renderInPanel(
      <Checkbox
        label="Enable provider"
        description="Starts the optional data provider."
        error="Accept the provider terms first."
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable provider" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAttribute("aria-errormessage");
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the optional data provider. Error.Accept the provider terms first.",
    );
    expect(
      screen
        .getByText("Accept the provider terms first.")
        .closest(".snui-checkbox__error"),
    ).toHaveAttribute("aria-live", "off");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("merges checkbox label and description references supplied by callers", () => {
    renderInPanel(
      <>
        <span id="external-label">Provider state</span>
        <span id="external-description">Required by this plugin.</span>
        <Checkbox
          label="Enable provider"
          description="Starts the provider."
          aria-labelledby="external-label"
          aria-describedby="external-description"
        />
      </>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Provider state Enable provider",
    });
    // The box reads its own words before the ones the caller points at.
    expect(checkbox).toHaveAccessibleDescription(
      "Starts the provider. Required by this plugin.",
    );
  });

  it("reads its description, reason, and error before the ids the caller adds", () => {
    renderInPanel(
      <>
        <span id="provider-note">Applies to every vessel.</span>
        <Checkbox
          ariaDisabled
          label="Primary provider"
          description="Answers first."
          disabledReason="At least one provider stays selected."
          error="Check the key."
          aria-describedby="provider-note"
          checked
          onChange={() => undefined}
        />
      </>,
    );

    expect(
      screen.getByRole("checkbox", { name: "Primary provider" }),
    ).toHaveAccessibleDescription(
      "Answers first. At least one provider stays selected. Error.Check the key. Applies to every vessel.",
    );
  });
});

describe("Checkbox label visibility", () => {
  it("keeps a hidden label in the accessible name", () => {
    const { container } = renderInPanel(
      <Checkbox label="Select all rows" labelVisibility="hidden" />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Select all rows" }),
    ).toBeInTheDocument();
    // The modifier sits on the block that owns the layout, around the control.
    const block = container.querySelector(".snui-checkbox");
    expect(block).toHaveClass("snui-checkbox--label-hidden");
    expect(block?.querySelector(".snui-checkbox__control")).not.toBeNull();
    expect(container.querySelector(".snui-checkbox__label")).toHaveClass(
      "snui-visually-hidden",
    );
  });

  it("still requires label content when it is hidden", () => {
    expect(() =>
      render(<Checkbox label="  " labelVisibility="hidden" />),
    ).toThrow("signalk-nearlcrews-ui: Checkbox requires a non-empty label.");
  });
});

describe("Checkbox form reset", () => {
  it("restores defaultChecked and re-asserts indeterminate after a reset", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form>
        <Checkbox label="Enable sonar" defaultChecked indeterminate />
      </form>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Enable sonar" });
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveProperty("indeterminate", true);

    // A native click clears the indeterminate state and toggles checkedness.
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveProperty("indeterminate", false);

    formOf(checkbox).reset();
    await waitFor(() => {
      expect(checkbox).toBeChecked();
      expect(checkbox).toHaveProperty("indeterminate", true);
    });
  });

  it("clears indeterminate after a reset when the prop is unset", async () => {
    renderInPanel(
      <>
        <form>
          <Checkbox label="Enable radar" defaultChecked indeterminate />
        </form>
        <form>
          <Checkbox label="Enable pilot" defaultChecked />
        </form>
      </>,
    );

    const radar = screen.getByRole("checkbox", { name: "Enable radar" });
    const pilot = screen.getByRole("checkbox", { name: "Enable pilot" });
    expect(radar).toHaveProperty("indeterminate", true);
    expect(pilot).toHaveProperty("indeterminate", false);

    formOf(radar).reset();
    formOf(pilot).reset();
    await waitFor(() => {
      expect(radar).toHaveProperty("indeterminate", true);
      expect(pilot).toHaveProperty("indeterminate", false);
    });
  });

  it("re-asserts the controlled checked prop after a reset", async () => {
    renderInPanel(
      <form>
        <Checkbox label="Lock route" checked onChange={() => undefined} />
      </form>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Lock route" });
    expect(checkbox).toBeChecked();

    // The native reset restores defaultChecked (unset, so false); the
    // controlled prop must win once the reset lands.
    formOf(checkbox).reset();
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("resets from the latest controlled props", async () => {
    const tree = (checked: boolean, indeterminate: boolean) => (
      <form>
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          label="Enable provider"
          readOnly
        />
      </form>
    );
    const { rerender } = renderInPanel(tree(false, false));
    const checkbox = screen.getByRole<HTMLInputElement>("checkbox", {
      name: "Enable provider",
    });

    rerender(panel(tree(true, true)));
    checkbox.checked = false;
    checkbox.indeterminate = false;
    formOf(checkbox).reset();

    await Promise.resolve();
    expect(checkbox).toBeChecked();
    expect(checkbox).toBePartiallyChecked();
  });
});

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

describe("Checkbox blocked reason", () => {
  it("describes a blocked box with its reason and drops it once live", () => {
    const { rerender } = renderInPanel(
      <Checkbox
        ariaDisabled
        label="Primary provider"
        description="Answers first."
        disabledReason="At least one provider stays selected."
        error="Check the key."
        checked
        onChange={() => undefined}
      />,
    );

    const box = screen.getByRole("checkbox", { name: "Primary provider" });
    // Read after the description and before the error, and never drawn.
    expect(box).toHaveAccessibleDescription(
      "Answers first. At least one provider stays selected. Error.Check the key.",
    );
    expect(
      screen.getByText("At least one provider stays selected."),
    ).toHaveClass("snui-visually-hidden");

    rerender(
      panel(
        <Checkbox
          label="Primary provider"
          disabledReason="At least one provider stays selected."
          checked
          onChange={() => undefined}
        />,
      ),
    );
    expect(box).not.toHaveAccessibleDescription();
  });

  it("draws the reason under the label when asked", () => {
    renderInPanel(
      <Checkbox
        ariaDisabled
        label="Primary provider"
        disabledReason="At least one provider stays selected."
        disabledReasonVisibility="visible"
        checked
        onChange={() => undefined}
      />,
    );

    const reason = screen.getByText("At least one provider stays selected.");
    expect(reason).toHaveClass("snui-checkbox__reason");
    expect(reason).not.toHaveAttribute("aria-hidden");
    // Outside the label, so pressing the reason cannot reach the box.
    expect(reason.closest("label")).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Primary provider" }),
    ).toHaveAccessibleDescription("At least one provider stays selected.");
  });

  it("asks a blocked box that says nothing to say why, and a disabled one to use ariaDisabled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderInPanel(
      <>
        <Checkbox ariaDisabled label="Unexplained box" />
        <Checkbox
          ariaDisabled
          label="Described box"
          aria-describedby="elsewhere"
        />
        <Checkbox disabled disabledReason="Gone." label="Disabled box" />
      </>,
    );

    expect(loggedMessages(warn)).toEqual([
      'Checkbox "Unexplained box" is blocked with ariaDisabled but says nothing about why. Pass disabledReason, or point aria-describedby at the text that explains it.',
      'Checkbox "Disabled box" has a disabledReason beside native disabled, which takes it out of the tab order, so no one reaches the reason. Use ariaDisabled instead: the box stays focusable and reads the reason.',
    ]);
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
