import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "../../src/forms.js";
import {
  expectNoAxeViolations,
  formOf,
  panel,
  renderInPanel,
} from "../helpers.js";

describe("Switch", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Switch> </Switch>)).toThrow(
      "signalk-nearlcrews-ui: Switch requires a non-empty label.",
    );
    expect(() => render(<Switch label="  " />)).toThrow(
      "signalk-nearlcrews-ui: Switch requires a non-empty label.",
    );
  });

  it("names the switch from the label prop", () => {
    renderInPanel(<Switch label="Autopilot" />);

    expect(screen.getByRole("switch", { name: "Autopilot" })).toBeVisible();
  });

  it("toggles uncontrolled from defaultChecked", async () => {
    const user = userEvent.setup();
    renderInPanel(<Switch defaultChecked>Autopilot</Switch>);

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it("keeps controlled checked and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <Switch checked onCheckedChange={onChange}>
        Autopilot
      </Switch>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(toggle).toBeChecked();
  });

  it("does not toggle while disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <Switch disabled onCheckedChange={onChange}>
        Autopilot
      </Switch>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(<Switch ref={ref}>Autopilot</Switch>);

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-switch");
  });

  it("participates in native forms and resets to defaultChecked", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form>
        <Switch name="autopilot" value="enabled" defaultChecked required>
          Autopilot
        </Switch>
      </form>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    const form = formOf(toggle);
    expect(new FormData(form).get("autopilot")).toBe("enabled");
    await user.click(toggle);
    expect(new FormData(form).has("autopilot")).toBe(false);
    form.reset();
    await waitFor(() => expect(toggle).toBeChecked());
    expect(new FormData(form).get("autopilot")).toBe("enabled");
  });

  it("supports an external form and read-only state", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <form id="external-switch-form" />
        <Switch
          form="external-switch-form"
          name="shore-power"
          value="connected"
          defaultChecked
          readOnly
        >
          Shore power
        </Switch>
      </>,
    );

    const toggle = screen.getByRole("switch", { name: "Shore power" });
    await user.click(toggle);
    expect(toggle).toBeChecked();
    const form = document.querySelector<HTMLFormElement>(
      "#external-switch-form",
    );
    if (form === null) {
      throw new Error("Expected the external switch form to exist.");
    }
    expect(new FormData(form).get("shore-power")).toBe("connected");
  });

  it("describes the switch with its description and error, and marks it invalid", async () => {
    const { container } = renderInPanel(
      <Switch
        label="Emit computed values"
        description="Publishes onto the vessel bus."
        error="Choose a source first."
        aria-describedby="section-note"
      />,
    );

    const toggle = screen.getByRole("switch", {
      name: "Emit computed values",
    });
    // The input itself carries both, the way Checkbox wires its own, so the
    // text is read on focus rather than only when browsing past it.
    const description = screen.getByText("Publishes onto the vessel bus.");
    const error = container.querySelector(".snui-switch__error");
    const describedBy = (toggle.getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    // The field's own text is read first, description then error, and the
    // caller's ids after, the order LabeledField keeps.
    expect(describedBy).toEqual([description.id, error?.id, "section-note"]);
    expect(toggle).toHaveAttribute("aria-invalid", "true");
    expect(toggle).toHaveAttribute("aria-errormessage", error?.id);
    expect(description).toHaveClass("snui-switch__description");
    expect(error).toHaveTextContent("Choose a source first.");
    expect(error).toHaveAttribute("aria-live", "off");
    // Neither message is inside the label that toggles the switch.
    expect(description.closest("label")).toBeNull();
    expect(error?.closest("label")).toBeNull();
    // The wrapper takes neither attribute; only the input is described.
    expect(container.querySelector(".snui-switch")).not.toHaveAttribute(
      "aria-errormessage",
    );
    await expectNoAxeViolations(container);
  });

  it("mounts an announcing error region before the error arrives", () => {
    const { container, rerender } = renderInPanel(
      <Switch label="Autopilot" errorLive="polite" />,
    );

    const region = container.querySelector(".snui-switch__error");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toBeEmptyDOMElement();
    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    expect(toggle).not.toHaveAttribute("aria-invalid");
    expect(toggle).not.toHaveAccessibleDescription();

    rerender(
      panel(
        <Switch
          label="Autopilot"
          errorLive="polite"
          error="Engage the pump first."
        />,
      ),
    );
    expect(region).toHaveTextContent("Engage the pump first.");
    expect(toggle).toHaveAccessibleDescription("Error.Engage the pump first.");
  });
});
