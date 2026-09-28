import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Radio, RadioGroup } from "../../src/forms.js";
import { formOf, panel, renderInPanel } from "../helpers.js";

describe("RadioGroup", () => {
  it("requires a non-empty label", () => {
    expect(() =>
      render(
        <RadioGroup label="  ">
          <Radio value="a">Alpha</Radio>
        </RadioGroup>,
      ),
    ).toThrow("signalk-nearlcrews-ui: RadioGroup requires a non-empty label.");
  });

  it("requires every Radio to have a non-empty label", () => {
    expect(() =>
      render(
        <RadioGroup label="Mode">
          <Radio value="a"> </Radio>
        </RadioGroup>,
      ),
    ).toThrow("signalk-nearlcrews-ui: Radio requires a non-empty label.");
  });

  it("selects radios uncontrolled from defaultValue", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <RadioGroup label="Mode" defaultValue="sail">
        <Radio value="sail">Sail</Radio>
        <Radio value="motor">Motor</Radio>
      </RadioGroup>,
    );

    const sail = screen.getByRole("radio", { name: "Sail" });
    const motor = screen.getByRole("radio", { name: "Motor" });
    expect(sail).toBeChecked();
    expect(motor).not.toBeChecked();

    await user.click(motor);
    expect(motor).toBeChecked();
    expect(sail).not.toBeChecked();
  });

  it("keeps controlled selection and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <RadioGroup label="Mode" value="sail" onValueChange={onChange}>
        <Radio value="sail">Sail</Radio>
        <Radio value="motor">Motor</Radio>
      </RadioGroup>,
    );

    const motor = screen.getByRole("radio", { name: "Motor" });
    await user.click(motor);
    expect(onChange).toHaveBeenCalledWith("motor");
    // The value prop stays authoritative until the consumer updates it.
    expect(motor).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Sail" })).toBeChecked();
  });

  it("names a Radio from the label prop and prefers it over children", () => {
    renderInPanel(
      <RadioGroup label="Mode">
        <Radio value="sail" label="Sail" />
        <Radio value="motor" label="Motor">
          Ignored children
        </Radio>
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "Sail" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Motor" })).toBeInTheDocument();
    expect(screen.queryByText("Ignored children")).not.toBeInTheDocument();
  });

  it("carries name=value through native form submission", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form>
        <RadioGroup label="Mode" name="mode" defaultValue="sail">
          <Radio value="sail">Sail</Radio>
          <Radio value="motor">Motor</Radio>
        </RadioGroup>
      </form>,
    );

    const motor = screen.getByRole("radio", { name: "Motor" });
    const form = formOf(motor);
    expect(new FormData(form).get("mode")).toBe("sail");

    await user.click(motor);
    expect(new FormData(form).get("mode")).toBe("motor");
  });

  it("restores defaultValue after a native form reset", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form>
        <RadioGroup label="Mode" name="mode" defaultValue="sail">
          <Radio value="sail">Sail</Radio>
          <Radio value="motor">Motor</Radio>
        </RadioGroup>
      </form>,
    );

    const sail = screen.getByRole("radio", { name: "Sail" });
    const motor = screen.getByRole("radio", { name: "Motor" });
    await user.click(motor);
    expect(motor).toBeChecked();

    formOf(motor).reset();
    expect(sail).toBeChecked();
    expect(motor).not.toBeChecked();
    expect(new FormData(formOf(motor)).get("mode")).toBe("sail");
  });

  it("associates description and error with the group and defaults errorLive to off", () => {
    renderInPanel(
      <RadioGroup
        label="Mode"
        description="Propulsion choice"
        error="Pick a mode"
        defaultValue="sail"
      >
        <Radio value="sail">Sail</Radio>
      </RadioGroup>,
    );

    const group = screen.getByRole("radiogroup", { name: "Mode" });
    const describedBy = group.getAttribute("aria-describedby") ?? "";
    const description = screen.getByText("Propulsion choice");
    const error = screen.getByText("Pick a mode").closest("[id]");
    if (!(error instanceof HTMLElement)) {
      throw new Error("The error message sits in no region with an id.");
    }
    expect(error).toHaveClass("snui-radio-group__error");
    expect(describedBy.split(" ")).toEqual(
      expect.arrayContaining([description.id, error.id]),
    );
    expect(group).toHaveAttribute("aria-errormessage", error.id);
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(error).toHaveAttribute("aria-live", "off");
    expect(error).not.toHaveAttribute("role");
  });

  it("mounts an announcing error region before content arrives", () => {
    const { rerender } = renderInPanel(
      <RadioGroup label="Mode" errorLive="polite">
        <Radio value="sail">Sail</Radio>
      </RadioGroup>,
    );

    const region = document.querySelector(".snui-radio-group__error");
    expect(region).not.toBeNull();
    // A roled live region does not also carry aria-live.
    expect(region).toHaveAttribute("role", "status");
    expect(region).not.toHaveAttribute("aria-live");
    expect(region?.textContent).toBe("");
    // The region is not referenced until it carries a message.
    expect(
      screen.getByRole("radiogroup", { name: "Mode" }),
    ).not.toHaveAttribute("aria-describedby");

    rerender(
      panel(
        <RadioGroup label="Mode" errorLive="polite" error="Pick a mode">
          <Radio value="sail">Sail</Radio>
        </RadioGroup>,
      ),
    );
    // The danger mark leads every field error, so the tone is carried by the
    // shape and the announced word as well as by the color.
    expect(region?.textContent).toBe("×Error. Pick a mode");
    expect(
      screen
        .getByRole("radiogroup", { name: "Mode" })
        .getAttribute("aria-describedby"),
    ).toContain(region?.id);
  });

  it("reflects orientation on the group", () => {
    renderInPanel(
      <>
        <RadioGroup label="Horizontal mode" orientation="horizontal">
          <Radio value="a">Alpha</Radio>
        </RadioGroup>
        <RadioGroup label="Vertical mode">
          <Radio value="b">Beta</Radio>
        </RadioGroup>
      </>,
    );

    expect(
      screen.getByRole("radiogroup", { name: "Horizontal mode" }),
    ).toHaveAttribute("data-orientation", "horizontal");
    expect(
      screen.getByRole("radiogroup", { name: "Vertical mode" }),
    ).toHaveAttribute("data-orientation", "vertical");
  });

  it("disables every radio when the group is disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInPanel(
      <RadioGroup label="Mode" disabled onValueChange={onChange}>
        <Radio value="sail">Sail</Radio>
      </RadioGroup>,
    );

    const sail = screen.getByRole("radio", { name: "Sail" });
    expect(sail).toBeDisabled();
    await user.click(sail);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables a single radio", () => {
    renderInPanel(
      <RadioGroup label="Mode">
        <Radio value="sail">Sail</Radio>
        <Radio value="motor" disabled>
          Motor
        </Radio>
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "Motor" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Sail" })).toBeEnabled();
  });

  it("forwards the group ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <RadioGroup label="Mode" ref={ref}>
        <Radio value="sail">Sail</Radio>
      </RadioGroup>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-radio-group");
  });

  it("forwards the radio ref to its root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <RadioGroup label="Mode">
        <Radio value="sail" ref={ref}>
          Sail
        </Radio>
      </RadioGroup>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-radio");
  });

  it("blocks a read-only selection while every radio stays reachable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <RadioGroup
        label="Source"
        readOnly
        value="gps"
        onValueChange={onValueChange}
      >
        <Radio value="gps" label="GPS" />
        <Radio value="ais" label="AIS" />
      </RadioGroup>,
    );

    const selected = screen.getByRole("radio", { name: "GPS" });
    const other = screen.getByRole("radio", { name: "AIS" });
    // Not natively disabled, so focus can rest here without being destroyed.
    expect(selected).toBeEnabled();
    expect(other).toBeEnabled();
    selected.focus();
    expect(selected).toHaveFocus();

    await user.click(other);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(selected).toBeChecked();
    expect(other).not.toBeChecked();
  });

  it("takes a disabled group out of the tab order, as before", () => {
    renderInPanel(
      <RadioGroup label="Source" disabled value="gps">
        <Radio value="gps" label="GPS" />
      </RadioGroup>,
    );

    // The two are different requests: disabled says unavailable and gives up
    // the tab stop, read-only says unchangeable and keeps it.
    expect(screen.getByRole("radio", { name: "GPS" })).toBeDisabled();
  });
});
