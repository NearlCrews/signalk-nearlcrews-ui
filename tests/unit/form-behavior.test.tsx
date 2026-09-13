import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Button,
  Checkbox,
  NumberInput,
  RangeInput,
  TextInput,
} from "../../src/index.js";
import { formOf, panel, renderInPanel } from "../helpers.js";

describe("Controlled text and numeric form reset", () => {
  it("restores the controlled value after a native form reset", async () => {
    renderInPanel(
      <form>
        <TextInput
          aria-label="Broker host"
          value="mqtt.local"
          onChange={() => undefined}
        />
        <NumberInput
          aria-label="Broker port"
          value={1883}
          onChange={() => undefined}
        />
      </form>,
    );

    const host = screen.getByRole("textbox", { name: "Broker host" });
    const port = screen.getByRole("spinbutton", { name: "Broker port" });

    // A native reset restores an input from its value attribute, which a
    // controlled input does not carry, and React neither re-renders nor
    // reports a change afterwards.
    formOf(host).reset();
    await waitFor(() => {
      expect(host).toHaveValue("mqtt.local");
      expect(port).toHaveValue(1883);
    });
  });

  it("leaves an uncontrolled control to the native reset", async () => {
    renderInPanel(
      <form>
        <TextInput aria-label="Vessel name" defaultValue="Kittiwake" />
      </form>,
    );

    const name = screen.getByRole("textbox", { name: "Vessel name" });
    fireEvent.change(name, { target: { value: "Petrel" } });
    expect(name).toHaveValue("Petrel");

    formOf(name).reset();
    await waitFor(() => expect(name).toHaveValue("Kittiwake"));
  });

  it("follows the control to the form its form attribute names", async () => {
    const { rerender } = renderInPanel(
      <>
        <form id="first" />
        <form id="second" />
        <TextInput
          aria-label="Alarm label"
          form="first"
          value="Shallow"
          onChange={() => undefined}
        />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Alarm label" });
    rerender(
      panel(
        <>
          <form id="first" />
          <form id="second" />
          <TextInput
            aria-label="Alarm label"
            form="second"
            value="Shallow"
            onChange={() => undefined}
          />
        </>,
      ),
    );

    fireEvent.change(input, { target: { value: "Deep" } });
    const second = document.getElementById("second");
    if (!(second instanceof HTMLFormElement)) {
      throw new Error("Expected the second form to be in the document.");
    }
    second.reset();
    await waitFor(() => expect(input).toHaveValue("Shallow"));
  });
});

describe("NumberInput wheel guard", () => {
  it("drops focus before a wheel can spin the value", () => {
    const onWheel = vi.fn();
    renderInPanel(
      <NumberInput
        aria-label="Depth alarm"
        defaultValue={12}
        onWheel={onWheel}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Depth alarm" });
    input.focus();
    expect(input).toHaveFocus();

    // Scrolling past a focused numeric field at a nav station would otherwise
    // rewrite a configured threshold and report it as the operator's edit.
    fireEvent.wheel(input);
    expect(input).not.toHaveFocus();
    expect(onWheel).toHaveBeenCalledOnce();
  });
});

describe("RangeInput form reset", () => {
  it("resyncs the range fill after a native form reset", async () => {
    renderInPanel(
      <form>
        <RangeInput
          aria-label="Depth alarm"
          min={0}
          max={100}
          defaultValue={50}
        />
      </form>,
    );

    const range = screen.getByRole("slider", { name: "Depth alarm" });
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("50%");

    fireEvent.input(range, { target: { value: "80" } });
    expect(range.style.getPropertyValue("--snui-range-progress")).toBe("80%");

    formOf(range).reset();
    await waitFor(() =>
      expect(range.style.getPropertyValue("--snui-range-progress")).toBe("50%"),
    );
    expect(range).toHaveValue("50");
  });
});

describe("Owned node and consumer refs", () => {
  it("registers the reset listener once whatever ref the caller passes", () => {
    const seen: (HTMLInputElement | null)[] = [];
    const { rerender } = renderInPanel(
      <form>
        <RangeInput
          aria-label="Depth alarm"
          min={0}
          max={100}
          defaultValue={50}
          ref={(node) => {
            seen.push(node);
          }}
        />
      </form>,
    );

    const range = screen.getByRole("slider", { name: "Depth alarm" });
    const form = formOf(range);
    const addListener = vi.spyOn(form, "addEventListener");

    // An inline ref is a new function on every render. The node and its reset
    // listener belong to the mount, so neither is torn down and rebuilt.
    for (let pass = 0; pass < 3; pass += 1) {
      rerender(
        panel(
          <form>
            <RangeInput
              aria-label="Depth alarm"
              min={0}
              max={100}
              defaultValue={50}
              ref={(node) => {
                seen.push(node);
              }}
            />
          </form>,
        ),
      );
    }

    expect(addListener).not.toHaveBeenCalled();
    expect(screen.getByRole("slider", { name: "Depth alarm" })).toBe(range);
    addListener.mockRestore();
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
});

describe("Button blocked activation keys", () => {
  it("suppresses consumer onKeyDown for activation keys while aria-disabled", () => {
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button ariaDisabled onKeyDown={onKeyDown}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("suppresses consumer onKeyDown for activation keys while loading", () => {
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button loading onKeyDown={onKeyDown}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("passes non-activation keys through while blocked", () => {
    const onKeyDown = vi.fn();
    renderInPanel(
      <Button ariaDisabled onKeyDown={onKeyDown}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Tab" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(3);
  });

  it("passes activation keys through when the button is enabled", () => {
    const onKeyDown = vi.fn();
    renderInPanel(<Button onKeyDown={onKeyDown}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });
});
