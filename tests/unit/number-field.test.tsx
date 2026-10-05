import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CollapsibleSection,
  NumberField,
  type NumberFieldMessageContext,
  type NumberFieldProps,
  NumberInput,
  resolveNumberDraft,
  useNumberDraft,
} from "../../src/index.js";
import { isNamedUnit } from "../../src/utils/unit.js";
import { formOf, loggedMessages, renderInPanel } from "../helpers.js";

describe("resolveNumberDraft", () => {
  it.each([
    ["", { status: "invalid", reason: "empty" }],
    ["   ", { status: "invalid", reason: "empty" }],
    ["abc", { status: "invalid", reason: "notANumber" }],
    ["1e400", { status: "invalid", reason: "notANumber" }],
    ["2.5", { status: "invalid", reason: "notAnInteger" }],
    ["-1", { status: "invalid", reason: "belowMin" }],
    ["0", { status: "invalid", reason: "belowMin" }],
    ["11", { status: "invalid", reason: "aboveMax" }],
    ["10", { status: "valid", value: 10 }],
    [" 7 ", { status: "valid", value: 7 }],
  ])("validates %j against an exclusive-min integer range", (raw, expected) => {
    expect(
      resolveNumberDraft(raw, {
        exclusiveMin: true,
        integer: true,
        max: 10,
        min: 0,
      }),
    ).toEqual(expected);
  });

  it("treats the bound itself as out of range only when exclusive", () => {
    expect(resolveNumberDraft("10", { max: 10 })).toEqual({
      status: "valid",
      value: 10,
    });
    expect(resolveNumberDraft("10", { max: 10, exclusiveMax: true })).toEqual({
      status: "invalid",
      reason: "aboveMax",
    });
    expect(resolveNumberDraft("0", { min: 0 })).toEqual({
      status: "valid",
      value: 0,
    });
  });

  it("commits undefined for an empty draft under allowEmpty", () => {
    expect(resolveNumberDraft("", { allowEmpty: true })).toEqual({
      status: "valid",
      value: undefined,
    });
    expect(resolveNumberDraft("", { allowEmpty: true, fallback: 4 })).toEqual({
      status: "valid",
      value: undefined,
    });
  });

  it.each([
    ["", 4],
    ["nope", 4],
    ["2.9", 2],
    ["-3", 1],
    ["99", 12],
    ["7", 7],
  ])("clamps %j once a fallback is given", (raw, value) => {
    expect(
      resolveNumberDraft(raw, { fallback: 4, integer: true, max: 12, min: 1 }),
    ).toEqual({ status: "valid", value });
  });

  it("snaps to the step before clamping in clamp mode", () => {
    expect(
      resolveNumberDraft("0.34", { fallback: 0, max: 1, min: 0, step: 0.1 }),
    ).toEqual({ status: "valid", value: 0.3 });
    expect(
      resolveNumberDraft("1.02", { fallback: 0, max: 1, min: 0, step: 0.1 }),
    ).toEqual({ status: "valid", value: 1 });
    // Validate mode leaves the step to the browser's spinner only.
    expect(resolveNumberDraft("0.34", { max: 1, min: 0, step: 0.1 })).toEqual({
      status: "valid",
      value: 0.34,
    });
  });

  it("measures the step from min, which is the step base the input uses", () => {
    // Snapping from zero would leave 4 alone, and the input the hook
    // configures reports 4 as a step mismatch against min 1 and step 2.
    expect(resolveNumberDraft("4", { fallback: 1, min: 1, step: 2 })).toEqual({
      status: "valid",
      value: 5,
    });
    expect(resolveNumberDraft("2.4", { fallback: 1, min: 1, step: 2 })).toEqual(
      {
        status: "valid",
        value: 3,
      },
    );
    expect(resolveNumberDraft("3", { fallback: 1, min: 1, step: 2 })).toEqual({
      status: "valid",
      value: 3,
    });
    // Without a usable minimum the base stays at zero, which is the base the
    // input falls back to for a min attribute it cannot read as a number.
    expect(resolveNumberDraft("4", { fallback: 1, step: 2 })).toEqual({
      status: "valid",
      value: 4,
    });
    expect(
      resolveNumberDraft("4", {
        fallback: 1,
        min: Number.NEGATIVE_INFINITY,
        step: 2,
      }),
    ).toEqual({ status: "valid", value: 4 });
  });

  it("keeps a fractional step base free of binary noise", () => {
    expect(
      resolveNumberDraft("0.34", { fallback: 0.05, min: 0.05, step: 0.1 }),
    ).toEqual({ status: "valid", value: 0.35 });
    expect(
      resolveNumberDraft("-0.19", { fallback: 0, min: -0.25, step: 0.1 }),
    ).toEqual({ status: "valid", value: -0.15 });
  });

  it.each([
    [0.5, "1.2", 1],
    [0.5, "1.3", 1.5],
    [0.1, "0.34", 0.3],
    [0.25, "7.6", 7.5],
    // Below 1e-6 a step prints in exponential notation, which a decimal
    // count read straight off the string would report as no fraction at all.
    [0.0000001, "0.0000004", 0.0000004],
    [0.0000001, "0.00000044", 0.0000004],
    [1e-9, "2.5e-9", 3e-9],
    [1, "2.6", 3],
    [1, "12345678901234567", 12345678901234568],
    [1000, "1400", 1000],
  ])("snaps to a step of %j across magnitudes", (step, raw, value) => {
    expect(resolveNumberDraft(raw, { fallback: 0, step })).toEqual({
      status: "valid",
      value,
    });
  });

  it("commits the fallback for a value that hits an exclusive bound in clamp mode", () => {
    expect(
      resolveNumberDraft("0", { exclusiveMin: true, fallback: 5, min: 0 }),
    ).toEqual({ status: "valid", value: 5 });
    expect(
      resolveNumberDraft("10", { exclusiveMax: true, fallback: 5, max: 10 }),
    ).toEqual({ status: "valid", value: 5 });
  });

  it("steps back inside a maximum the step does not land on", () => {
    // 12 snaps to 12 and then clamps to 10, which is no multiple of 3, so the
    // field would commit a value its own input reports as a step mismatch.
    expect(
      resolveNumberDraft("12", { fallback: 0, max: 10, min: 0, step: 3 }),
    ).toEqual({ status: "valid", value: 9 });
  });

  it("falls back when the bounds are closer together than one step", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // Nothing above an exclusive 2 and at or below 4 is a multiple of 5 from
    // the step base, so stepping back inside the range crosses the bound.
    expect(
      resolveNumberDraft("9", {
        exclusiveMin: true,
        fallback: 3,
        max: 4,
        min: 2,
        step: 5,
      }),
    ).toEqual({ status: "valid", value: 3 });
    // The rules admit no legal value at all, which development reports.
    expect(warn).toHaveBeenCalledOnce();
  });

  it("reads only the notation a numeric input can produce", () => {
    for (const raw of ["0x10", "0o17", "0b101", "1_000", "+5", "5."]) {
      expect(resolveNumberDraft(raw)).toEqual({
        status: "invalid",
        reason: "notANumber",
      });
    }
    // A bare fraction is part of the grammar the input accepts.
    expect(resolveNumberDraft(".5")).toEqual({ status: "valid", value: 0.5 });
  });

  it("commits a positive zero for a typed negative zero", () => {
    const resolved = resolveNumberDraft("-0");
    // String(-0) is "0", so a committed -0 would disagree with the value the
    // field shows again as soon as the draft clears.
    expect(
      Object.is(resolved.status === "valid" ? resolved.value : Number.NaN, 0),
    ).toBe(true);
  });

  it("reports rules that cannot do what they say", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    resolveNumberDraft("41", { exclusiveMin: true });
    resolveNumberDraft("41", { fallback: 41, max: 40 });
    expect(loggedMessages(warn)).toEqual([
      "resolveNumberDraft: exclusiveMin does nothing without a min.",
      "resolveNumberDraft: the fallback 41 does not satisfy the same rules, so a draft that falls back commits a value the field itself rejects.",
    ]);

    // Once per mistake, however many keystrokes reach it.
    resolveNumberDraft("42", { exclusiveMin: true });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

function Harness({
  initial = 10,
  onValidityChange,
  onValueChange,
  ...props
}: Partial<
  Omit<
    NumberFieldProps,
    "allowEmpty" | "defaultValue" | "onValueChange" | "value"
  >
> & {
  readonly initial?: number;
  readonly onValueChange?: (value: number) => void;
}): ReactElement {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberField
        label="Refresh interval"
        min={1}
        max={60}
        integer
        {...props}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        onValidityChange={onValidityChange}
      />
      <output data-testid="committed">{value}</output>
    </>
  );
}

/**
 * `useNumberDraft` on a bare text input. A text input keeps the typed string
 * verbatim, unlike a number input, so the draft text itself can be observed.
 */
function RawDraft({
  options,
}: {
  readonly options?: Parameters<typeof useNumberDraft>[2];
}): ReactElement {
  const [value, setValue] = useState<number | undefined>(10);
  const draft = useNumberDraft(value, setValue, options);
  return (
    <>
      <input aria-label="Raw" type="text" {...draft.inputProps} />
      <output data-testid="value">{String(value)}</output>
      <output data-testid="valid">{String(draft.valid)}</output>
      <output data-testid="reason">{draft.invalidReason ?? "none"}</output>
    </>
  );
}

describe("NumberField editing", () => {
  it("keeps the raw draft while typing and commits only valid values", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(<Harness onValueChange={onValueChange} />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    expect(input).toHaveValue(10);

    await user.clear(input);
    // An empty draft stays on screen instead of snapping back to 10.
    expect(input).toHaveValue(null);
    await user.keyboard("{Enter}");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Error.Enter a whole number.");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("committed")).toHaveTextContent("10");

    await user.type(input, "4");
    expect(input).toHaveValue(4);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByTestId("committed")).toHaveTextContent("4");

    await user.type(input, "5");
    expect(input).toHaveValue(45);
    expect(onValueChange).toHaveBeenLastCalledWith(45);
  });

  it("explains an out-of-range draft and reports validity transitions once each", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    renderInPanel(<Harness onValidityChange={onValidityChange} />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    // Clearing is invalid, the first digit commits 9, the second digit makes
    // 99 invalid again: three transitions, and the committed value stays at
    // the last valid keystroke.
    await user.clear(input);
    await user.type(input, "99");
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription(
      "Error.Enter a whole number from 1 to 60.",
    );
    expect(screen.getByTestId("committed")).toHaveTextContent("9");
    expect(onValidityChange.mock.calls).toEqual([[false], [true], [false]]);

    // Fixing the draft reports once more; staying invalid in between does not.
    await user.clear(input);
    await user.type(input, "8");
    expect(onValidityChange.mock.calls).toEqual([
      [false],
      [true],
      [false],
      [true],
    ]);
    expect(input).not.toHaveAccessibleDescription();
  });

  it("holds a draft's error until the edit finishes, and drops it the moment the draft is valid", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    const { container } = renderInPanel(
      <Harness onValidityChange={onValidityChange} errorLive="polite" />,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    const region = container.querySelector(".snui-field__error");
    await user.clear(input);
    // Save gating hears the keystroke at once; the field itself says nothing
    // while the value is being retyped, so the announcing region stays quiet.
    expect(onValidityChange.mock.calls).toEqual([[false]]);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAccessibleDescription();
    expect(region).toBeEmptyDOMElement();

    await user.keyboard("{Enter}");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Error.Enter a whole number.");

    // A reason on screen follows the draft while it stays invalid.
    await user.type(input, "0");
    expect(input).toHaveAccessibleDescription(
      "Error.Enter a whole number from 1 to 60.",
    );

    // The first valid keystroke clears it.
    await user.clear(input);
    await user.type(input, "5");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAccessibleDescription();

    // Once cleared, the next invalid draft waits for the edit to finish
    // again, and leaving the field is one way it finishes.
    await user.clear(input);
    expect(input).not.toHaveAttribute("aria-invalid");
    await user.tab();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(region).toHaveTextContent("Enter a whole number.");
  });

  it("reports validity on every keystroke through the standalone hook", async () => {
    const user = userEvent.setup();
    renderInPanel(<RawDraft options={{ integer: true }} />);

    const input = screen.getByRole("textbox", { name: "Raw" });
    await user.clear(input);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByTestId("reason")).toHaveTextContent("none");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("reason")).toHaveTextContent("empty");
  });

  it.each([
    [
      "a fractional draft under integer",
      { integer: true, max: undefined, min: undefined },
      "1.5",
      "Enter a whole number.",
    ],
    [
      "a draft under a lone minimum",
      { integer: false, max: undefined, min: 5 },
      "1",
      "Enter 5 or more.",
    ],
    [
      "a draft on an exclusive minimum",
      { exclusiveMin: true, integer: false, max: undefined, min: 5 },
      "5",
      "Enter a number greater than 5.",
    ],
    [
      "a draft over a lone maximum",
      { initial: 5, integer: false, max: 9, min: undefined },
      "12",
      "Enter 9 or less.",
    ],
    [
      "a draft on an exclusive maximum",
      {
        exclusiveMax: true,
        initial: 5,
        integer: false,
        max: 9,
        min: undefined,
      },
      "9",
      "Enter a number less than 9.",
    ],
    [
      "a draft on an exclusive maximum with both bounds",
      { exclusiveMax: true, integer: false },
      "60",
      "Enter a number less than 60.",
    ],
  ] as const)("explains %s", async (_, props, draft, message) => {
    const user = userEvent.setup();
    renderInPanel(<Harness {...props} />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, draft);
    await user.keyboard("{Enter}");
    // The danger mark leads every field error, so it leads the description
    // the message is read as part of.
    expect(input).toHaveAccessibleDescription(`Error.${message}`);
  });

  it("keeps an invalid draft on blur so the user can see what to fix", async () => {
    const user = userEvent.setup();
    renderInPanel(<Harness />);

    const input = screen.getByRole<HTMLInputElement>("spinbutton", {
      name: "Refresh interval",
    });
    await user.clear(input);
    await user.type(input, "7");
    expect(screen.getByTestId("committed")).toHaveTextContent("7");

    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    // The invalid draft stays so the user can see what needs fixing.
    expect(input).toHaveValue(99);
    expect(input).toHaveAttribute("aria-invalid", "true");
    // The first digit committed 9; the invalid second digit changed nothing.
    expect(screen.getByTestId("committed")).toHaveTextContent("9");
  });

  it("blurs a focused input on wheel so scrolling cannot spin the value", async () => {
    const user = userEvent.setup();
    renderInPanel(<Harness />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.click(input);
    expect(input).toHaveFocus();
    fireEvent.wheel(input, { deltaY: 120 });
    expect(input).not.toHaveFocus();
  });

  it("leaves an unfocused input alone on wheel", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <>
        <button type="button">Elsewhere</button>
        <Harness />
      </>,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    await user.click(elsewhere);
    // Scrolling a long panel sends the wheel across every field on the way.
    fireEvent.wheel(input, { deltaY: 120 });

    expect(elsewhere).toHaveFocus();
    expect(input).toHaveValue(10);
    expect(screen.getByTestId("committed")).toHaveTextContent("10");
  });

  it("prints a bound with no grouping and no exponent form", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <Harness initial={5} integer={false} min={0.0000001} max={100000} />,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "0");
    await user.keyboard("{Enter}");
    // Both bounds have to be typeable back into the field, which reads
    // neither "100,000" nor "1e-7".
    expect(input).toHaveAccessibleDescription(
      "Error.Enter a number from 0.0000001 to 100000.",
    );
  });

  it("owns the value when a defaultValue is given, and needs no callback", async () => {
    const user = userEvent.setup();
    renderInPanel(<NumberField label="Damping" defaultValue={4} integer />);

    const input = screen.getByRole<HTMLInputElement>("spinbutton", {
      name: "Damping",
    });
    expect(input).toHaveValue(4);

    await user.clear(input);
    await user.type(input, "9");
    await user.tab();
    expect(input).toHaveValue(9);
  });

  it("replaces the draft when the committed value changes from outside", async () => {
    const user = userEvent.setup();
    function Discardable(): ReactElement {
      const [value, setValue] = useState(10);
      return (
        <>
          <NumberField
            label="Depth offset"
            value={value}
            onValueChange={setValue}
          />
          <button type="button" onClick={() => setValue(3)}>
            Discard
          </button>
        </>
      );
    }
    renderInPanel(<Discardable />);

    const input = screen.getByRole("spinbutton", { name: "Depth offset" });
    await user.clear(input);
    await user.type(input, "abc");
    await user.keyboard("{Enter}");
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(3);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("drops the draft when resetKey changes even if the value is unchanged", async () => {
    const user = userEvent.setup();
    function Discardable(): ReactElement {
      const [epoch, setEpoch] = useState(0);
      return (
        <>
          <NumberField label="Depth offset" value={10} resetKey={epoch} />
          <button type="button" onClick={() => setEpoch((n) => n + 1)}>
            Discard
          </button>
        </>
      );
    }
    renderInPanel(<Discardable />);

    const input = screen.getByRole("spinbutton", { name: "Depth offset" });
    await user.clear(input);
    expect(input).toHaveValue(null);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(10);
  });

  it("commits undefined for a cleared field under allowEmpty", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <NumberField
        label="Rated speed"
        allowEmpty
        value={2500}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Rated speed" });
    await user.clear(input);
    expect(onValueChange).toHaveBeenCalledWith(undefined);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("clamps every keystroke once a fallback is given", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderInPanel(
      <NumberField
        label="Cache limit"
        fallback={4}
        min={4}
        max={64}
        integer
        value={16}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Cache limit" });
    await user.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    await user.type(input, "99");
    expect(onValueChange).toHaveBeenLastCalledWith(64);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("commits a value the input's own step constraint accepts", async () => {
    const user = userEvent.setup();
    function Berth(): ReactElement {
      const [value, setValue] = useState(1);
      return (
        <form>
          <NumberField
            label="Berth"
            fallback={1}
            min={1}
            max={9}
            step={2}
            value={value}
            onValueChange={setValue}
          />
        </form>
      );
    }
    renderInPanel(<Berth />);

    const input = screen.getByRole<HTMLInputElement>("spinbutton", {
      name: "Berth",
    });
    await user.clear(input);
    await user.type(input, "4");
    await user.tab();

    // A committed value the browser rejects would raise a native validation
    // bubble the field never explains.
    expect(input).toHaveValue(5);
    expect(input.validity.stepMismatch).toBe(false);
    expect(formOf(input).checkValidity()).toBe(true);
  });

  it("prefers a custom message and falls back to the field error otherwise", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <NumberField
        label="Port"
        min={1}
        max={65535}
        integer
        value={3000}
        error="Port is already in use."
        messages={{ notAnInteger: "Ports are whole numbers." }}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Port" });
    expect(input).toHaveAccessibleDescription("Error.Port is already in use.");
    await user.clear(input);
    await user.type(input, "30.5");
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription("Error.Ports are whole numbers.");
  });

  it("fills the bounds into a message given as text, from the prop and the bundle", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <NumberField
        label="Port"
        min={1024}
        max={65535}
        integer
        defaultValue={3000}
        messages={{ aboveMax: "Höchstens {max}, mindestens {min}." }}
      />,
      {
        labels: {
          numberField: { belowMin: "Mindestens {min}; {unknown} bleibt." },
        },
      },
    );

    const input = screen.getByRole("spinbutton", { name: "Port" });
    await user.clear(input);
    await user.type(input, "70000");
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription(
      "Error.Höchstens 65535, mindestens 1024.",
    );

    await user.clear(input);
    await user.type(input, "80");
    expect(input).toHaveAccessibleDescription(
      "Error.Mindestens 1024; {unknown} bleibt.",
    );
  });

  it("builds a message from the rules when it is given as a function", async () => {
    const user = userEvent.setup();
    const belowMin = vi.fn(
      ({ min, unit }: NumberFieldMessageContext) =>
        `At least ${String(min)} ${isNamedUnit(unit) ? unit.name : "units"}.`,
    );
    renderInPanel(
      <NumberField
        label="Speed limit"
        min={2}
        max={30}
        exclusiveMax
        value={6}
        unit={{ symbol: "kn", name: "knots" }}
        messages={{ belowMin }}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Speed limit" });
    await user.clear(input);
    await user.type(input, "1");
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription("Error.At least 2 knots. knots");
    expect(belowMin).toHaveBeenLastCalledWith({
      exclusiveMax: true,
      exclusiveMin: false,
      integer: false,
      max: 30,
      min: 2,
      reason: "belowMin",
      unit: { symbol: "kn", name: "knots" },
    });
  });

  it("leaves a placeholder for a bound the field does not have, and renders a message node as given", async () => {
    const user = userEvent.setup();
    renderInPanel(
      <NumberField
        label="Offset"
        min={2}
        defaultValue={4}
        messages={{
          belowMin: "From {min} to {max}.",
          empty: <strong>Enter an offset.</strong>,
        }}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Offset" });
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(input).toHaveAccessibleDescription("Error.Enter an offset.");
    await user.type(input, "1");
    expect(input).toHaveAccessibleDescription("Error.From 2 to {max}.");
  });

  it("reads a named unit by its name while it shows the symbol", () => {
    const { container } = renderInPanel(
      <NumberField
        label="Speed limit"
        unit={{ symbol: "kn", name: "knots" }}
        value={6}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Speed limit" });
    // The unit describes the value and never enters the name, so a speech
    // input user still says the label alone.
    expect(input).toHaveAccessibleName("Speed limit");
    expect(input).toHaveAccessibleDescription("knots");
    const addon = container.querySelector(".snui-input-group__addon");
    expect(addon).toHaveTextContent("kn knots");
    expect(addon?.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      /^kn$/,
    );
  });

  it("describes the value with its unit and offers the unit slot width", () => {
    const { container } = renderInPanel(
      <NumberField
        label="Depth offset"
        description="Below the transducer"
        unit="m"
        controlWidth="fixed"
        value={1.5}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Depth offset" });
    expect(input).toHaveAccessibleDescription("Below the transducer m");
    expect(input).toHaveAttribute("step", "any");
    expect(
      container.querySelector(".snui-input-group__control--fixed"),
    ).toContainElement(input);
  });

  it("forwards the root ref, the input ref, and input attributes", () => {
    const rootRef = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLInputElement>();
    renderInPanel(
      <NumberField
        ref={rootRef}
        inputRef={inputRef}
        label="Port"
        integer
        min={0}
        value={3000}
        inputProps={{ placeholder: "3000", autoComplete: "off" }}
        data-testid="port-field"
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Port" });
    expect(rootRef.current).toBe(screen.getByTestId("port-field"));
    expect(inputRef.current).toBe(input);
    expect(input).toHaveAttribute("placeholder", "3000");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("step", "1");
    // The key that commits the draft is labeled on an on-screen keyboard.
    expect(input).toHaveAttribute("enterkeyhint", "done");
  });

  it("asks for the decimal keypad on a non-negative fractional field", () => {
    renderInPanel(<NumberField label="Depth offset" min={0} value={1.5} />);

    expect(
      screen.getByRole("spinbutton", { name: "Depth offset" }),
    ).toHaveAttribute("inputmode", "decimal");
  });

  it("lets the caller replace the keyboard hints", () => {
    renderInPanel(
      <NumberField
        label="Depth offset"
        min={0}
        value={1.5}
        inputProps={{ enterKeyHint: "next", inputMode: "text" }}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Depth offset" });
    expect(input).toHaveAttribute("inputmode", "text");
    expect(input).toHaveAttribute("enterkeyhint", "next");
  });

  it("leaves the keypad alone where the rules allow a negative value", () => {
    renderInPanel(<NumberField label="Trim" value={-2} min={-10} />);

    // Both keypads omit the minus key on some platforms.
    expect(
      screen.getByRole("spinbutton", { name: "Trim" }),
    ).not.toHaveAttribute("inputmode");
  });
});

describe("NumberField inside a retaining CollapsibleSection", () => {
  it("keeps an in-progress draft and its validity across collapse and reopen", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    renderInPanel(
      <CollapsibleSection title="Timing" defaultOpen>
        <Harness onValidityChange={onValidityChange} />
      </CollapsibleSection>,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    expect(onValidityChange.mock.calls).toEqual([[false], [true], [false]]);

    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    await user.click(toggle);

    expect(input).toHaveValue(99);
    expect(input).toHaveAttribute("aria-invalid", "true");
    // The reopen reruns effects; validity is not re-announced.
    expect(onValidityChange.mock.calls).toEqual([[false], [true], [false]]);
  });
});

describe("NumberField validity reporting on unmount", () => {
  it("reports nothing when an invalid field leaves the tree", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    function Removable(): ReactElement {
      const [mounted, setMounted] = useState(true);
      return (
        <>
          {mounted ? <Harness onValidityChange={onValidityChange} /> : null}
          <button type="button" onClick={() => setMounted(false)}>
            Remove
          </button>
        </>
      );
    }
    renderInPanel(<Removable />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    expect(onValidityChange.mock.calls).toEqual([[false]]);

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      screen.queryByRole("spinbutton", { name: "Refresh interval" }),
    ).toBeNull();
    // A consumer gates its Save button on this map. A valid report from an
    // unmount would re-enable Save for a field nobody can see or fix, so the
    // consumer clears its own entry instead.
    expect(onValidityChange.mock.calls).toEqual([[false]]);
  });
});

describe("useNumberDraft standalone", () => {
  it("drives a bare NumberInput through inputProps", async () => {
    const user = userEvent.setup();
    function Bare(): ReactElement {
      const [value, setValue] = useState<number | undefined>(5);
      const draft = useNumberDraft(value, setValue, { allowEmpty: true });
      return (
        <>
          <NumberInput aria-label="Bare" {...draft.inputProps} />
          <output data-testid="value">{String(value)}</output>
          <output data-testid="reason">{draft.invalidReason ?? "valid"}</output>
        </>
      );
    }
    renderInPanel(<Bare />);

    const input = screen.getByRole("spinbutton", { name: "Bare" });
    await user.clear(input);
    expect(screen.getByTestId("value")).toHaveTextContent("undefined");
    await user.type(input, "8");
    expect(screen.getByTestId("value")).toHaveTextContent("8");
    expect(screen.getByTestId("reason")).toHaveTextContent("valid");
  });

  it("shows the raw draft until Enter or blur finishes a valid edit", async () => {
    const user = userEvent.setup();
    renderInPanel(<RawDraft options={{ integer: true }} />);

    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Raw",
    });
    await user.clear(input);
    await user.type(input, "007");
    expect(input.value).toBe("007");
    await user.keyboard("{Enter}");
    expect(input.value).toBe("7");

    await user.clear(input);
    await user.type(input, "0042");
    expect(input.value).toBe("0042");
    await user.tab();
    expect(input.value).toBe("42");
  });

  it("refuses free text a numeric input could never hold", async () => {
    const user = userEvent.setup();
    renderInPanel(<RawDraft />);

    const input = screen.getByRole("textbox", { name: "Raw" });
    await user.clear(input);
    await user.type(input, "0x10");
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("reason")).toHaveTextContent("notANumber");
    // The leading zero committed on its own keystroke; the hex notation that
    // followed commits nothing, rather than the 16 `Number` would read.
    expect(screen.getByTestId("value")).toHaveTextContent("0");
  });
});
