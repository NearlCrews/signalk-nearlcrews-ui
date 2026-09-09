import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState, Progress } from "../../src/composites.js";
import { Radio, RadioGroup, SecretInput, Switch } from "../../src/forms.js";
import {
  Checkbox,
  InlineConfirm,
  Textarea,
  TextInput,
  ThemeToggle,
} from "../../src/index.js";
import { formOf, panel, renderInPanel } from "../helpers.js";

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

  it("reports the value through onValueChange beside the deprecated onChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    renderInPanel(
      <RadioGroup
        label="Mode"
        defaultValue="sail"
        onValueChange={onValueChange}
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep firing
        onChange={onChange}
      >
        <Radio value="sail" label="Sail" />
        <Radio value="motor" label="Motor" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole("radio", { name: "Motor" }));
    expect(onValueChange).toHaveBeenCalledWith("motor");
    expect(onChange).toHaveBeenCalledWith("motor");
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
    expect(region?.textContent).toBe("Pick a mode");
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
    expect(ref.current?.classList.contains("snui-radio-group")).toBe(true);
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
    expect(ref.current?.classList.contains("snui-radio")).toBe(true);
  });
});

describe("Switch", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Switch> </Switch>)).toThrow(
      "Switch requires a non-empty label.",
    );
    expect(() => render(<Switch label="  " />)).toThrow(
      "Switch requires a non-empty label.",
    );
  });

  it("names the switch from the label prop", () => {
    renderInPanel(<Switch label="Autopilot" />);

    expect(screen.getByRole("switch", { name: "Autopilot" })).toBeVisible();
  });

  it("reports the checked state through onCheckedChange beside the deprecated onChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const onChange = vi.fn();
    renderInPanel(
      <Switch
        label="Autopilot"
        onCheckedChange={onCheckedChange}
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep firing
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("switch", { name: "Autopilot" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledWith(true);
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
    expect(ref.current?.classList.contains("snui-switch")).toBe(true);
  });

  it("participates in native forms and resets to defaultChecked", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form data-testid="switch-form">
        <Switch name="autopilot" value="enabled" defaultChecked required>
          Autopilot
        </Switch>
      </form>,
    );

    const form = screen.getByTestId<HTMLFormElement>("switch-form");
    const toggle = screen.getByRole("switch", { name: "Autopilot" });
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
    expect(form).not.toBeNull();
    if (form === null) {
      throw new Error("Expected the external switch form to exist.");
    }
    expect(new FormData(form).get("shore-power")).toBe("connected");
  });
});

describe("Progress", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Progress label="  " value={10} />)).toThrow(
      "Progress requires a non-empty label.",
    );
  });

  it("exposes a determinate value with default bounds", () => {
    renderInPanel(<Progress label="Synchronizing" value={40} />);

    const bar = screen.getByRole("progressbar", { name: "Synchronizing" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    const fill = bar.querySelector(".snui-progress__fill");
    expect(fill).toHaveStyle({ inlineSize: "40%" });
  });

  it("honors custom bounds and passes valueText to aria-valuetext", () => {
    renderInPanel(
      <Progress
        label="Upload"
        value={3}
        min={0}
        max={10}
        valueText="3 of 10 waypoints"
      />,
    );

    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
    expect(bar).toHaveAttribute("aria-valuetext", "3 of 10 waypoints");
    const fill = bar.querySelector(".snui-progress__fill");
    expect(fill).toHaveStyle({ inlineSize: "30%" });
  });

  it("clamps the fill when the value leaves the bounds", () => {
    renderInPanel(
      <>
        <Progress label="Over" value={140} />
        <Progress label="Under" value={-5} />
        <Progress label="Flat" value={10} min={10} max={10} />
      </>,
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
    renderInPanel(<Progress label="Connecting" />);

    const bar = screen.getByRole("progressbar", { name: "Connecting" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar.classList.contains("snui-progress--indeterminate")).toBe(true);
    expect(bar.querySelector(".snui-progress__fill")).not.toHaveAttribute(
      "style",
    );
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative Infinity", Number.NEGATIVE_INFINITY],
  ])("treats a %s value as indeterminate", (_name, value) => {
    renderInPanel(<Progress label="Indexing" value={value} />);

    const bar = screen.getByRole("progressbar", { name: "Indexing" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveClass("snui-progress--indeterminate");
    expect(bar.querySelector(".snui-progress__fill")).not.toHaveAttribute(
      "style",
    );
  });

  it("applies the tone class", () => {
    renderInPanel(<Progress label="Depth alarm" value={80} tone="danger" />);

    const bar = screen.getByRole("progressbar", { name: "Depth alarm" });
    expect(bar.classList.contains("snui-progress--tone-danger")).toBe(true);
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(<Progress label="Synchronizing" value={10} ref={ref} />);

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toBe(
      screen.getByRole("progressbar", { name: "Synchronizing" }),
    );
  });
});

describe("SecretInput", () => {
  it("ties the reveal button to the input through aria-controls", () => {
    renderInPanel(
      <>
        <SecretInput aria-label="API token" />
        <SecretInput aria-label="Webhook secret" id="webhook-secret" />
      </>,
    );

    const token = screen.getByLabelText("API token");
    const webhook = screen.getByLabelText("Webhook secret");
    expect(token.id).not.toBe("");
    expect(webhook).toHaveAttribute("id", "webhook-secret");
    const [showToken, showWebhook] = screen.getAllByRole("button", {
      name: "Show",
    });
    expect(showToken).toHaveAttribute("aria-controls", token.id);
    expect(showWebhook).toHaveAttribute("aria-controls", "webhook-secret");
  });

  it("keeps browser capture off in both states unless overridden", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" />);

    const input = screen.getByLabelText("API token");
    const expectDefaults = (): void => {
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toHaveAttribute("spellcheck", "false");
      expect(input).toHaveAttribute("autocapitalize", "off");
      expect(input).toHaveAttribute("autocorrect", "off");
    };
    expect(input).toHaveAttribute("type", "password");
    expectDefaults();

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(input).toHaveAttribute("type", "text");
    expectDefaults();
  });

  it("lets the caller override the capture defaults", () => {
    renderInPanel(
      <SecretInput aria-label="Passphrase" autoComplete="current-password" />,
    );

    expect(screen.getByLabelText("Passphrase")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("applies the monospace modifier to the input", () => {
    renderInPanel(<SecretInput aria-label="API token" monospace />);

    expect(screen.getByLabelText("API token")).toHaveClass(
      "snui-input--monospace",
    );
  });
});

describe("monospace and sizing modifiers", () => {
  it("adds the monospace class to TextInput and Textarea", () => {
    renderInPanel(
      <>
        <TextInput aria-label="Path" monospace />
        <TextInput aria-label="Name" />
        <Textarea aria-label="Prompt" monospace />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Path" })).toHaveClass(
      "snui-input--monospace",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveClass(
      "snui-input--monospace",
    );
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveClass(
      "snui-input--monospace",
    );
  });

  it("sizes a Textarea from minRows and lets an explicit rows attribute win", () => {
    renderInPanel(
      <>
        <Textarea aria-label="Prompt" minRows={8} />
        <Textarea aria-label="Notes" minRows={8} rows={3} />
        <Textarea aria-label="Plain" />
      </>,
    );

    const prompt = screen.getByRole("textbox", { name: "Prompt" });
    expect(prompt).toHaveAttribute("rows", "8");
    expect(prompt).toHaveClass("snui-textarea--rows");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute(
      "rows",
      "3",
    );
    const plain = screen.getByRole("textbox", { name: "Plain" });
    expect(plain).not.toHaveAttribute("rows");
    expect(plain).not.toHaveClass("snui-textarea--rows");
  });
});

describe("Checkbox label visibility", () => {
  it("keeps a hidden label in the accessible name", () => {
    const { container } = renderInPanel(
      <Checkbox label="Select all rows" labelVisibility="hidden" />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select all rows" });
    expect(checkbox).toBeInTheDocument();
    const root = container.querySelector(".snui-checkbox");
    expect(root).toHaveClass("snui-checkbox--label-hidden");
    expect(container.querySelector(".snui-checkbox__label")).toHaveClass(
      "snui-visually-hidden",
    );
  });

  it("still requires label content when it is hidden", () => {
    expect(() =>
      render(<Checkbox label="  " labelVisibility="hidden" />),
    ).toThrow("Checkbox requires a non-empty label.");
  });
});

describe("InlineConfirm keyboard semantics", () => {
  it("does not advertise Escape as a shortcut that activates the region", () => {
    renderInPanel(
      <InlineConfirm
        open
        message="Remove this source?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Confirm action" }),
    ).not.toHaveAttribute("aria-keyshortcuts");
  });
});

describe("ThemeToggle root", () => {
  it("forwards a ref and native attributes to the radiogroup", () => {
    const ref = createRef<HTMLDivElement>();
    renderInPanel(
      <ThemeToggle ref={ref} data-testid="theme-toggle" id="theme" />,
    );

    const group = screen.getByRole("radiogroup", { name: "Panel theme" });
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute("data-testid", "theme-toggle");
    expect(group).toHaveAttribute("id", "theme");
  });

  it("names the group from label and falls back through the deprecated legend", () => {
    renderInPanel(
      <>
        <ThemeToggle label="Display" />
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep naming the group */}
        <ThemeToggle legend="Legacy display" />
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- blank label and blank alias fall back together */}
        <ThemeToggle label="  " legend="  " />
      </>,
    );

    expect(screen.getByRole("radiogroup", { name: "Display" })).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: "Legacy display" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: "Panel theme" }),
    ).toBeVisible();
  });

  it("reports the theme through onValueChange and the deprecated onChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    renderInPanel(
      <ThemeToggle
        onValueChange={onValueChange}
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep firing
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Night" }));
    expect(onValueChange).toHaveBeenCalledWith("night");
    expect(onChange).toHaveBeenCalledWith("night");
  });
});

describe("EmptyState", () => {
  it("requires a non-empty title", () => {
    expect(() => render(<EmptyState title="  " />)).toThrow(
      "EmptyState requires a non-empty title.",
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
    expect(ref.current?.classList.contains("snui-empty-state")).toBe(true);
  });
});
