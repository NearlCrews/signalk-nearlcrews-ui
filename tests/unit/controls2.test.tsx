import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  EmptyState,
  PanelRoot,
  Progress,
  Radio,
  RadioGroup,
  Switch,
} from "../../src/index.js";

function formOf(control: HTMLElement): HTMLFormElement {
  const form = control.closest("form");
  if (form === null) throw new Error("Control did not join its form.");
  return form;
}

describe("RadioGroup", () => {
  it("requires a non-empty label", () => {
    expect(() =>
      render(
        <RadioGroup label="  ">
          <Radio value="a">Alpha</Radio>
        </RadioGroup>,
      ),
    ).toThrow("RadioGroup requires a non-empty label.");
  });

  it("requires every Radio to have a non-empty label", () => {
    expect(() =>
      render(
        <RadioGroup label="Mode">
          <Radio value="a"> </Radio>
        </RadioGroup>,
      ),
    ).toThrow("Radio requires a non-empty label.");
  });

  it("selects radios uncontrolled from defaultValue", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <RadioGroup label="Mode" defaultValue="sail">
          <Radio value="sail">Sail</Radio>
          <Radio value="motor">Motor</Radio>
        </RadioGroup>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <RadioGroup label="Mode" value="sail" onChange={onChange}>
          <Radio value="sail">Sail</Radio>
          <Radio value="motor">Motor</Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    const motor = screen.getByRole("radio", { name: "Motor" });
    await user.click(motor);
    expect(onChange).toHaveBeenCalledWith("motor");
    // The value prop stays authoritative until the consumer updates it.
    expect(motor).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Sail" })).toBeChecked();
  });

  it("carries name=value through native form submission", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <form>
          <RadioGroup label="Mode" name="mode" defaultValue="sail">
            <Radio value="sail">Sail</Radio>
            <Radio value="motor">Motor</Radio>
          </RadioGroup>
        </form>
      </PanelRoot>,
    );

    const motor = screen.getByRole("radio", { name: "Motor" });
    const form = formOf(motor);
    expect(new FormData(form).get("mode")).toBe("sail");

    await user.click(motor);
    expect(new FormData(form).get("mode")).toBe("motor");
  });

  it("restores defaultValue after a native form reset", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <form>
          <RadioGroup label="Mode" name="mode" defaultValue="sail">
            <Radio value="sail">Sail</Radio>
            <Radio value="motor">Motor</Radio>
          </RadioGroup>
        </form>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <RadioGroup
          label="Mode"
          description="Propulsion choice"
          error="Pick a mode"
          defaultValue="sail"
        >
          <Radio value="sail">Sail</Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    const group = screen.getByRole("radiogroup", { name: "Mode" });
    const describedBy = group.getAttribute("aria-describedby") ?? "";
    const description = screen.getByText("Propulsion choice");
    const error = screen.getByText("Pick a mode");
    expect(describedBy.split(" ")).toEqual(
      expect.arrayContaining([description.id, error.id]),
    );
    expect(group).toHaveAttribute("aria-errormessage", error.id);
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(error).toHaveAttribute("aria-live", "off");
    expect(error).not.toHaveAttribute("role");
  });

  it("mounts an announcing error region before content arrives", () => {
    const { rerender } = render(
      <PanelRoot>
        <RadioGroup label="Mode" errorLive="polite">
          <Radio value="sail">Sail</Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    const region = document.querySelector(".snui-radio-group__error");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("role", "status");
    expect(region?.textContent).toBe("");
    // The region is not referenced until it carries a message.
    expect(
      screen.getByRole("radiogroup", { name: "Mode" }),
    ).not.toHaveAttribute("aria-describedby");

    rerender(
      <PanelRoot>
        <RadioGroup label="Mode" errorLive="polite" error="Pick a mode">
          <Radio value="sail">Sail</Radio>
        </RadioGroup>
      </PanelRoot>,
    );
    expect(region?.textContent).toBe("Pick a mode");
    expect(
      screen
        .getByRole("radiogroup", { name: "Mode" })
        .getAttribute("aria-describedby"),
    ).toContain(region?.id);
  });

  it("reflects orientation on the group", () => {
    render(
      <PanelRoot>
        <RadioGroup label="Horizontal mode" orientation="horizontal">
          <Radio value="a">Alpha</Radio>
        </RadioGroup>
        <RadioGroup label="Vertical mode">
          <Radio value="b">Beta</Radio>
        </RadioGroup>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <RadioGroup label="Mode" disabled onChange={onChange}>
          <Radio value="sail">Sail</Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    const sail = screen.getByRole("radio", { name: "Sail" });
    expect(sail).toBeDisabled();
    await user.click(sail);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables a single radio", () => {
    render(
      <PanelRoot>
        <RadioGroup label="Mode">
          <Radio value="sail">Sail</Radio>
          <Radio value="motor" disabled>
            Motor
          </Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    expect(screen.getByRole("radio", { name: "Motor" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Sail" })).toBeEnabled();
  });

  it("forwards the group ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelRoot>
        <RadioGroup label="Mode" ref={ref}>
          <Radio value="sail">Sail</Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current?.classList.contains("snui-radio-group")).toBe(true);
  });

  it("forwards the radio ref to its root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelRoot>
        <RadioGroup label="Mode">
          <Radio value="sail" ref={ref}>
            Sail
          </Radio>
        </RadioGroup>
      </PanelRoot>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current?.classList.contains("snui-radio")).toBe(true);
  });
});

describe("Switch", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Switch> </Switch>)).toThrow(
      "Switch requires a non-empty label.",
    );
  });

  it("toggles uncontrolled from defaultChecked", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <Switch defaultChecked>Autopilot</Switch>
      </PanelRoot>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it("keeps controlled checked and reports changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PanelRoot>
        <Switch checked onChange={onChange}>
          Autopilot
        </Switch>
      </PanelRoot>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(toggle).toBeChecked();
  });

  it("does not toggle while disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PanelRoot>
        <Switch disabled onChange={onChange}>
          Autopilot
        </Switch>
      </PanelRoot>,
    );

    const toggle = screen.getByRole("switch", { name: "Autopilot" });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelRoot>
        <Switch ref={ref}>Autopilot</Switch>
      </PanelRoot>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current?.classList.contains("snui-switch")).toBe(true);
  });
});

describe("Progress", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Progress label="  " value={10} />)).toThrow(
      "Progress requires a non-empty label.",
    );
  });

  it("exposes a determinate value with default bounds", () => {
    render(
      <PanelRoot>
        <Progress label="Synchronizing" value={40} />
      </PanelRoot>,
    );

    const bar = screen.getByRole("progressbar", { name: "Synchronizing" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    const fill = bar.querySelector(".snui-progress__fill");
    expect(fill).toHaveStyle({ inlineSize: "40%" });
  });

  it("honors custom bounds and passes valueText to aria-valuetext", () => {
    render(
      <PanelRoot>
        <Progress
          label="Upload"
          value={3}
          min={0}
          max={10}
          valueText="3 of 10 waypoints"
        />
      </PanelRoot>,
    );

    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
    expect(bar).toHaveAttribute("aria-valuetext", "3 of 10 waypoints");
    const fill = bar.querySelector(".snui-progress__fill");
    expect(fill).toHaveStyle({ inlineSize: "30%" });
  });

  it("clamps the fill when the value leaves the bounds", () => {
    render(
      <PanelRoot>
        <Progress label="Over" value={140} />
        <Progress label="Under" value={-5} />
        <Progress label="Flat" value={10} min={10} max={10} />
      </PanelRoot>,
    );

    const over = screen.getByRole("progressbar", { name: "Over" });
    expect(over.querySelector(".snui-progress__fill")).toHaveStyle({
      inlineSize: "100%",
    });
    const under = screen.getByRole("progressbar", { name: "Under" });
    expect(under.querySelector(".snui-progress__fill")).toHaveStyle({
      inlineSize: "0%",
    });
    const flat = screen.getByRole("progressbar", { name: "Flat" });
    expect(flat.querySelector(".snui-progress__fill")).toHaveStyle({
      inlineSize: "0%",
    });
  });

  it("omits aria-valuenow when indeterminate", () => {
    render(
      <PanelRoot>
        <Progress label="Connecting" />
      </PanelRoot>,
    );

    const bar = screen.getByRole("progressbar", { name: "Connecting" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar.classList.contains("snui-progress--indeterminate")).toBe(true);
    expect(bar.querySelector(".snui-progress__fill")).not.toHaveAttribute(
      "style",
    );
  });

  it("applies the tone class", () => {
    render(
      <PanelRoot>
        <Progress label="Depth alarm" value={80} tone="danger" />
      </PanelRoot>,
    );

    const bar = screen.getByRole("progressbar", { name: "Depth alarm" });
    expect(bar.classList.contains("snui-progress--tone-danger")).toBe(true);
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PanelRoot>
        <Progress label="Synchronizing" value={10} ref={ref} />
      </PanelRoot>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toBe(
      screen.getByRole("progressbar", { name: "Synchronizing" }),
    );
  });
});

describe("EmptyState", () => {
  it("requires a non-empty title", () => {
    expect(() => render(<EmptyState title="  " />)).toThrow(
      "EmptyState requires a non-empty title.",
    );
  });

  it("renders icon, description, and action", () => {
    render(
      <PanelRoot>
        <EmptyState
          icon={<span data-testid="icon">*</span>}
          title="No waypoints"
          description="Create a waypoint to see it here."
          action={<button type="button">New waypoint</button>}
        />
      </PanelRoot>,
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
    const { container } = render(
      <PanelRoot>
        <EmptyState title="Nothing here" />
      </PanelRoot>,
    );

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
    render(
      <PanelRoot>
        <EmptyState title="Nothing here" ref={ref} />
      </PanelRoot>,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current?.classList.contains("snui-empty-state")).toBe(true);
  });
});
