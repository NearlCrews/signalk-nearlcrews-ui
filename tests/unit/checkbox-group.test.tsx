import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CheckboxGroup } from "../../src/composites.js";
import { formOf, renderInPanel } from "../helpers.js";

const LAYERS = [
  { label: "Depth areas", value: "depth" },
  { label: "Buoys", value: "buoys" },
  { label: "Lights", value: "lights" },
] as const;

describe("CheckboxGroup selection", () => {
  it("renders a named group of checkboxes and carries the selection into form data", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <form>
        <CheckboxGroup
          legend="Import layers"
          name="layers"
          options={LAYERS}
          defaultValue={["buoys"]}
        />
      </form>,
    );

    const group = screen.getByRole("group", { name: "Import layers" });
    expect(group.tagName).toBe("FIELDSET");
    const buoys = screen.getByRole("checkbox", { name: "Buoys" });
    expect(buoys).toBeChecked();
    expect(new FormData(formOf(buoys)).getAll("layers")).toEqual(["buoys"]);

    await user.click(screen.getByRole("checkbox", { name: "Lights" }));
    expect(new FormData(formOf(buoys)).getAll("layers")).toEqual([
      "buoys",
      "lights",
    ]);
  });

  it("reports the selected values in option order", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        options={LAYERS}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Lights" }));
    await user.click(screen.getByRole("checkbox", { name: "Depth areas" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["depth", "lights"]);

    await user.click(screen.getByRole("checkbox", { name: "Lights" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["depth"]);
  });

  it("keeps a controlled selection until the parent updates it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        options={LAYERS}
        value={["depth"]}
        onValueChange={onValueChange}
      />,
    );

    const buoys = screen.getByRole("checkbox", { name: "Buoys" });
    await user.click(buoys);
    expect(onValueChange).toHaveBeenCalledWith(["depth", "buoys"]);
    expect(buoys).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Depth areas" })).toBeChecked();
  });

  it("rejects an empty option list and duplicate values", () => {
    expect(() =>
      render(<CheckboxGroup legend="Import layers" options={[]} />),
    ).toThrow("CheckboxGroup requires at least one option.");
    expect(() =>
      render(
        <CheckboxGroup
          legend="Import layers"
          options={[
            { label: "Buoys", value: "buoys" },
            { label: "Beacons", value: "buoys" },
          ]}
        />,
      ),
    ).toThrow(
      'CheckboxGroup option values must be unique; received duplicate value "buoys".',
    );
  });

  it("forwards the ref, native attributes, and disabled state to the fieldset", () => {
    const ref = createRef<HTMLFieldSetElement>();
    renderInPanel(
      <CheckboxGroup
        ref={ref}
        legend="Import layers"
        options={LAYERS}
        data-testid="layers"
        disabled
      />,
    );

    const group = screen.getByTestId("layers");
    expect(ref.current).toBe(group);
    expect(group).toHaveClass("snui-field-group", "snui-checkbox-group");
    expect(screen.getByRole("checkbox", { name: "Buoys" })).toBeDisabled();
  });

  it("lays options out as a grid by default and stacks on request", () => {
    const { container, rerender } = renderInPanel(
      <CheckboxGroup legend="Import layers" options={LAYERS}>
        <p>Scale bands</p>
      </CheckboxGroup>,
    );

    expect(
      container.querySelector(".snui-checkbox-group__options--grid"),
    ).not.toBeNull();
    // Extra controls render above the options, inside the group.
    const content = container.querySelector(".snui-field-group__content");
    expect(content?.firstElementChild).toHaveTextContent("Scale bands");

    rerender(
      <CheckboxGroup legend="Import layers" options={LAYERS} layout="stack" />,
    );
    expect(
      container.querySelector(".snui-checkbox-group__options--stack"),
    ).not.toBeNull();
  });
});

describe("CheckboxGroup select all", () => {
  function Group(): ReactElement {
    const [value, setValue] = useState<readonly string[]>(["buoys"]);
    return (
      <CheckboxGroup
        legend="Import layers"
        selectAllLabel="All layers"
        options={[
          ...LAYERS,
          { label: "Restricted areas", value: "restricted", disabled: true },
        ]}
        value={value}
        onValueChange={setValue}
      />
    );
  }

  it("shows a tri-state control that completes, then clears, the enabled options", async () => {
    const user = userEvent.setup();
    renderInPanel(<Group />);

    const all = screen.getByRole("checkbox", { name: "All layers" });
    expect(all).toBePartiallyChecked();
    expect(all).not.toBeChecked();

    await user.click(all);
    expect(all).toBeChecked();
    expect(all).not.toBePartiallyChecked();
    for (const option of LAYERS) {
      expect(
        screen.getByRole("checkbox", { name: option.label }),
      ).toBeChecked();
    }
    // A disabled option is left alone.
    expect(
      screen.getByRole("checkbox", { name: "Restricted areas" }),
    ).not.toBeChecked();

    await user.click(all);
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
    for (const option of LAYERS) {
      expect(
        screen.getByRole("checkbox", { name: option.label }),
      ).not.toBeChecked();
    }
  });

  it("disables the select-all box when every option is disabled", () => {
    // A parent toggle that disables the whole group is an ordinary panel
    // state, and a select-all that looked live there would toggle nothing.
    renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        selectAllLabel="All layers"
        options={LAYERS.map((option) => ({ ...option, disabled: true }))}
      />,
    );

    const all = screen.getByRole("checkbox", { name: "All layers" });
    expect(all).toBeDisabled();
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
  });

  it("renders the select-all control in the legend row beside consumer actions", () => {
    const { container } = renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        selectAllLabel="All layers"
        actions={<button type="button">Reset</button>}
        options={LAYERS}
      />,
    );

    const actions = container.querySelector(".snui-field-group__actions");
    expect(actions).toContainElement(
      screen.getByRole("checkbox", { name: "All layers" }),
    );
    expect(actions).toContainElement(
      screen.getByRole("button", { name: "Reset" }),
    );
  });
});

describe("CheckboxGroup empty warning", () => {
  it("mounts a polite region first and fills it only while nothing is selected", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        options={LAYERS}
        defaultValue={["buoys"]}
        emptyWarning="Nothing will be imported."
      />,
    );

    const region = screen.getByRole("status");
    expect(region).toHaveClass("snui-checkbox-group__warning");
    expect(region).not.toHaveAttribute("aria-live");
    expect(region).toBeEmptyDOMElement();
    const group = screen.getByRole("group", { name: "Import layers" });
    expect(group).not.toHaveAttribute("aria-describedby");

    await user.click(screen.getByRole("checkbox", { name: "Buoys" }));
    expect(region).toHaveTextContent("Nothing will be imported.");
    // The warning carries the tone shape and label, not color alone.
    expect(region.querySelector(".snui-status--warning")).not.toBeNull();
    expect(group).toHaveAccessibleDescription(
      /^Warning\.? ?Nothing will be imported\.$/,
    );

    await user.click(screen.getByRole("checkbox", { name: "Lights" }));
    expect(region).toBeEmptyDOMElement();
    expect(group).not.toHaveAttribute("aria-describedby");
  });

  it("keeps a consumer description beside the warning it adds", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <p id="layers-hint">Layers are imported on save.</p>
        <CheckboxGroup
          legend="Import layers"
          aria-describedby="layers-hint"
          options={LAYERS}
          defaultValue={["buoys"]}
          emptyWarning="Nothing will be imported."
        />
      </>,
    );

    const group = screen.getByRole("group", { name: "Import layers" });
    expect(group).toHaveAttribute("aria-describedby", "layers-hint");

    await user.click(screen.getByRole("checkbox", { name: "Buoys" }));
    expect(group).toHaveAttribute(
      "aria-describedby",
      `layers-hint ${screen.getByRole("status").id}`,
    );
  });

  it("renders no warning region when none is configured", () => {
    renderInPanel(<CheckboxGroup legend="Import layers" options={LAYERS} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("CheckboxGroup option description", () => {
  it("describes an option with its description", () => {
    renderInPanel(
      <CheckboxGroup
        legend="Import layers"
        options={[
          {
            label: "Depth areas",
            value: "depth",
            description: "Contours and soundings.",
          },
          { label: "Buoys", value: "buoys" },
        ]}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Depth areas" }),
    ).toHaveAccessibleDescription("Contours and soundings.");
    expect(
      screen.getByRole("checkbox", { name: "Buoys" }),
    ).not.toHaveAccessibleDescription();
  });
});

describe("CheckboxGroup blocked options", () => {
  const OPTIONS = [
    { label: "Primary", value: "primary", ariaDisabled: true },
    { label: "Backup", value: "backup" },
  ] as const;

  it("keeps a blocked option focusable and out of select-all's reach", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <CheckboxGroup
        legend="Providers"
        options={OPTIONS}
        value={["primary"]}
        selectAllLabel="Select all"
        onValueChange={onValueChange}
      />,
    );

    const primary = screen.getByRole("checkbox", { name: "Primary" });
    // The last remaining provider: real, checked, reachable, and unchangeable.
    expect(primary).toHaveAttribute("aria-disabled", "true");
    expect(primary).toBeEnabled();
    expect(primary).toBeChecked();

    await user.click(primary);
    expect(onValueChange).not.toHaveBeenCalled();

    // Select-all completes the options the user could have checked by hand,
    // so it must not reach the one they cannot.
    await user.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith([
      "primary",
      "backup",
    ]);
  });

  it("counts only the options select-all can reach", () => {
    renderInPanel(
      <CheckboxGroup
        legend="Providers"
        options={OPTIONS}
        value={["backup"]}
        selectAllLabel="Select all"
      />,
    );

    // Every reachable option is selected, so the box reads checked even
    // though the blocked option is not.
    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    expect(selectAll).toBeChecked();
    expect(selectAll).not.toBePartiallyChecked();
  });
});
