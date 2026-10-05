import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  LabeledField,
  NumberInput,
  RangeInput,
  Select,
  Textarea,
  TextInput,
} from "../../src/index.js";
import { formOf, panel, renderInPanel } from "../helpers.js";

/** The filled portion a range input painted, as the custom property holds it. */
function progressOf(range: HTMLElement): string {
  return range.style.getPropertyValue("--snui-range-progress");
}

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

    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveAttribute(
      "rows",
      "8",
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute(
      "rows",
      "3",
    );
    expect(screen.getByRole("textbox", { name: "Plain" })).not.toHaveAttribute(
      "rows",
    );
  });
});

describe("Native input controls", () => {
  it("tracks the filled range progress across input and prop updates", () => {
    const rangeRef = createRef<HTMLInputElement>();
    const { rerender } = renderInPanel(
      <RangeInput
        ref={rangeRef}
        aria-label="Depth alarm"
        min={0}
        max={200}
        defaultValue={50}
      />,
    );

    const range = screen.getByRole("slider", { name: "Depth alarm" });
    expect(rangeRef.current).toBe(range);
    expect(progressOf(range)).toBe("25%");

    fireEvent.input(range, { target: { value: "150" } });
    expect(progressOf(range)).toBe("75%");

    rerender(
      panel(
        <RangeInput
          ref={rangeRef}
          aria-label="Depth alarm"
          min={0}
          max={100}
          value={80}
          onChange={() => undefined}
        />,
      ),
    );
    expect(progressOf(range)).toBe("80%");
  });

  it("fills range progress from browser defaults and guards invalid bounds", () => {
    renderInPanel(
      <>
        <RangeInput aria-label="Volume" defaultValue={50} />
        <RangeInput
          aria-label="Broken bounds"
          min="low"
          max="high"
          defaultValue={5}
        />
      </>,
    );

    const volume = screen.getByRole("slider", { name: "Volume" });
    expect(progressOf(volume)).toBe("50%");

    const broken = screen.getByRole("slider", { name: "Broken bounds" });
    expect(progressOf(broken)).toBe("0%");
  });

  it("restores range progress when a controlled owner rejects input", async () => {
    renderInPanel(
      <RangeInput
        aria-label="Locked threshold"
        min={0}
        max={200}
        value={50}
        onChange={() => undefined}
      />,
    );

    const range = screen.getByRole("slider", { name: "Locked threshold" });
    expect(progressOf(range)).toBe("25%");

    fireEvent.input(range, { target: { value: "150" } });
    await waitFor(() => expect(progressOf(range)).toBe("25%"));
    expect(range).toHaveValue("50");
  });

  it("preserves native number-input behavior", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <LabeledField label="Interval">
        <NumberInput min={1} max={60} />
      </LabeledField>,
    );

    const input = screen.getByRole("spinbutton", { name: "Interval" });
    await user.type(input, "15");
    expect(input).toHaveValue(15);
  });

  it("preserves native range-input semantics", () => {
    renderInPanel(
      <LabeledField label="Confidence">
        <RangeInput min={0} max={100} defaultValue={50} />
      </LabeledField>,
    );

    expect(screen.getByRole("slider", { name: "Confidence" })).toHaveValue(
      "50",
    );
  });

  it("supports typed text modes, selects, and textareas", () => {
    renderInPanel(
      <>
        <LabeledField label="API key">
          <TextInput type="password" />
        </LabeledField>
        <LabeledField label="Source">
          <Select defaultValue="gps">
            <option value="gps">GPS</option>
            <option value="manual">Manual</option>
          </Select>
        </LabeledField>
        <LabeledField label="Notes">
          <Textarea defaultValue="Ready" />
        </LabeledField>
      </>,
    );

    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveValue("gps");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Ready");
  });
});

describe("TextInput calendar types", () => {
  it.each(["date", "time", "month", "week"] as const)(
    "accepts the %s input type",
    (type) => {
      renderInPanel(
        <LabeledField label="Maintenance window">
          <TextInput type={type} />
        </LabeledField>,
      );

      expect(screen.getByLabelText("Maintenance window")).toHaveAttribute(
        "type",
        type,
      );
    },
  );
});

describe("Controlled text, numeric, and select form reset", () => {
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

  it("restores a controlled select after a native form reset", async () => {
    renderInPanel(
      <form>
        <Select aria-label="Units" value="imperial" onChange={() => undefined}>
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </Select>
        <Select
          aria-label="Layers"
          multiple
          value={["lights", "wrecks"]}
          onChange={() => undefined}
        >
          <option value="buoys">Buoys</option>
          <option value="lights">Lights</option>
          <option value="wrecks">Wrecks</option>
        </Select>
        <Select aria-label="Datum" value="unlisted" onChange={() => undefined}>
          <option value="wgs84">WGS 84</option>
          <option value="nad83">NAD 83</option>
        </Select>
      </form>,
    );

    const units = screen.getByRole("combobox", { name: "Units" });
    const layers = screen.getByRole("listbox", { name: "Layers" });
    const datum = screen.getByRole("combobox", { name: "Datum" });
    expect(units).toHaveValue("imperial");
    expect(layers).toHaveValue(["lights", "wrecks"]);

    // React marks no option of a controlled select as its default, so a
    // native reset returns a single select to its first option and empties a
    // multiple one, and no render follows to put the selection back.
    formOf(units).reset();
    await waitFor(() => {
      expect(units).toHaveValue("imperial");
      expect(layers).toHaveValue(["lights", "wrecks"]);
    });
    // A value no option carries shows the first option, as React renders it,
    // rather than an empty select.
    expect(datum).toHaveValue("wgs84");
  });

  it("leaves an uncontrolled select to the native reset", async () => {
    renderInPanel(
      <form>
        <Select aria-label="Units" defaultValue="imperial">
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </Select>
      </form>,
    );

    const units = screen.getByRole("combobox", { name: "Units" });
    fireEvent.change(units, { target: { value: "metric" } });
    expect(units).toHaveValue("metric");

    formOf(units).reset();
    await waitFor(() => expect(units).toHaveValue("imperial"));
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
    const tree = (form: string): React.JSX.Element => (
      <>
        <form id="first" />
        <form id="second" />
        <TextInput
          aria-label="Alarm label"
          form={form}
          value="Shallow"
          onChange={() => undefined}
        />
      </>
    );
    const { rerender } = renderInPanel(tree("first"));

    const input = screen.getByRole("textbox", { name: "Alarm label" });
    rerender(panel(tree("second")));

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
    expect(progressOf(range)).toBe("50%");

    fireEvent.input(range, { target: { value: "80" } });
    expect(progressOf(range)).toBe("80%");

    formOf(range).reset();
    await waitFor(() => expect(progressOf(range)).toBe("50%"));
    expect(range).toHaveValue("50");
  });
});

describe("RangeInput unit", () => {
  it("reads the value with the unit's name as the value text", () => {
    const { rerender } = renderInPanel(
      <RangeInput
        aria-label="Speed limit"
        min={0}
        max={30}
        value={12}
        onChange={() => undefined}
        unit={{ symbol: "kn", name: "knots" }}
      />,
    );

    const range = screen.getByRole("slider", { name: "Speed limit" });
    expect(range).toHaveAttribute("aria-valuetext", "12 knots");

    rerender(
      panel(
        <RangeInput
          aria-label="Speed limit"
          min={0}
          max={30}
          value={15}
          onChange={() => undefined}
          unit="kn"
        />,
      ),
    );
    // A unit given as text is read as that text.
    expect(range).toHaveAttribute("aria-valuetext", "15 kn");

    rerender(
      panel(
        <RangeInput
          aria-label="Speed limit"
          min={0}
          max={30}
          value={15}
          onChange={() => undefined}
        />,
      ),
    );
    expect(range).not.toHaveAttribute("aria-valuetext");
  });

  it("follows an uncontrolled value through input and form reset", async () => {
    renderInPanel(
      <form>
        <RangeInput
          aria-label="Cache size"
          min={0}
          max={100}
          defaultValue={50}
          unit={{ symbol: "GiB", name: "gibibytes" }}
        />
      </form>,
    );

    const range = screen.getByRole("slider", { name: "Cache size" });
    expect(range).toHaveAttribute("aria-valuetext", "50 gibibytes");
    fireEvent.input(range, { target: { value: "80" } });
    expect(range).toHaveAttribute("aria-valuetext", "80 gibibytes");

    formOf(range).reset();
    await waitFor(() =>
      expect(range).toHaveAttribute("aria-valuetext", "50 gibibytes"),
    );
  });

  it("leaves a value text the caller wrote alone", () => {
    renderInPanel(
      <RangeInput
        aria-label="Speed limit"
        aria-valuetext="twelve knots"
        min={0}
        max={30}
        value={12}
        onChange={() => undefined}
        unit={{ symbol: "kn", name: "knots" }}
      />,
    );

    expect(screen.getByRole("slider", { name: "Speed limit" })).toHaveAttribute(
      "aria-valuetext",
      "twelve knots",
    );
  });
});

describe("Owned node and consumer refs", () => {
  it("registers the reset listener once whatever ref the caller passes", () => {
    // An inline ref is a new function on every render.
    const tree = (): React.JSX.Element => (
      <form>
        <RangeInput
          aria-label="Depth alarm"
          min={0}
          max={100}
          defaultValue={50}
          ref={() => undefined}
        />
      </form>
    );
    const { rerender } = renderInPanel(tree());

    const range = screen.getByRole("slider", { name: "Depth alarm" });
    const form = formOf(range);
    const addListener = vi.spyOn(form, "addEventListener");

    // The node and its reset listener belong to the mount, so neither is torn
    // down and rebuilt.
    for (let pass = 0; pass < 3; pass += 1) {
      rerender(panel(tree()));
    }

    expect(addListener).not.toHaveBeenCalled();
    expect(screen.getByRole("slider", { name: "Depth alarm" })).toBe(range);
  });
});
