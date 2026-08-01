import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, Checkbox, PanelRoot, RangeInput } from "../../src/index.js";
import { formOf } from "../helpers.js";

describe("RangeInput form reset", () => {
  it("resyncs the range fill after a native form reset", async () => {
    render(
      <PanelRoot>
        <form>
          <RangeInput
            aria-label="Depth alarm"
            min={0}
            max={100}
            defaultValue={50}
          />
        </form>
      </PanelRoot>,
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

describe("Checkbox form reset", () => {
  it("restores defaultChecked and re-asserts indeterminate after a reset", async () => {
    const user = userEvent.setup();
    render(
      <PanelRoot>
        <form>
          <Checkbox label="Enable sonar" defaultChecked indeterminate />
        </form>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <form>
          <Checkbox label="Enable radar" defaultChecked indeterminate />
        </form>
        <form>
          <Checkbox label="Enable pilot" defaultChecked />
        </form>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <form>
          <Checkbox label="Lock route" checked onChange={() => undefined} />
        </form>
      </PanelRoot>,
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
    render(
      <PanelRoot>
        <Button ariaDisabled onKeyDown={onKeyDown}>
          Save
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("suppresses consumer onKeyDown for activation keys while loading", () => {
    const onKeyDown = vi.fn();
    render(
      <PanelRoot>
        <Button loading onKeyDown={onKeyDown}>
          Save
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("passes non-activation keys through while blocked", () => {
    const onKeyDown = vi.fn();
    render(
      <PanelRoot>
        <Button ariaDisabled onKeyDown={onKeyDown}>
          Save
        </Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Tab" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(3);
  });

  it("passes activation keys through when the button is enabled", () => {
    const onKeyDown = vi.fn();
    render(
      <PanelRoot>
        <Button onKeyDown={onKeyDown}>Save</Button>
      </PanelRoot>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });
});
