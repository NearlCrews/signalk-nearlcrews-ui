import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  type FieldValidity,
  type FieldValidityHandlers,
  useFieldValidity,
} from "../../src/hooks/use-field-validity.js";
import {
  DraftResetScope,
  useResetDrafts,
} from "../../src/hooks/use-reset-drafts.js";
import {
  CollapsibleSection,
  NumberField,
  type NumberFieldMessageContext,
  type NumberFieldProps,
  NumberInput,
  resolveNumberDraft,
  useNumberDraft,
} from "../../src/index.js";
import {
  hasUnitContent,
  isNamedUnit,
  renderUnit,
  unitSpokenText,
} from "../../src/utils/unit.js";
import { formOf, renderInPanel } from "../helpers.js";
import { withFrameDocument } from "./lib/frame-document.js";

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
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
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
    function Raw(): ReactElement {
      const [value, setValue] = useState<number | undefined>(10);
      const draft = useNumberDraft(value, setValue, { integer: true });
      return (
        <>
          <input aria-label="Raw" type="text" {...draft.inputProps} />
          <output data-testid="valid">{String(draft.valid)}</output>
          <output data-testid="reason">{draft.invalidReason ?? "none"}</output>
        </>
      );
    }
    renderInPanel(<Raw />);

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

describe("useFieldValidity", () => {
  /** Whether a Map dropped a key, which is how the hook forgets a name. */
  function forgot(deleted: { mock: { calls: unknown[][] } }, name: string) {
    return deleted.mock.calls.some(([key]) => key === name);
  }

  async function flushMicrotasks(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
    });
  }

  function Panel(): ReactElement {
    const validity = useFieldValidity();
    const [mounted, setMounted] = useState(true);
    return (
      <>
        {mounted ? (
          <NumberField
            {...validity.register("interval")}
            label="Refresh interval"
            min={1}
            max={60}
            integer
            defaultValue={10}
          />
        ) : null}
        <button type="button" onClick={() => setMounted(false)}>
          Remove
        </button>
        <output data-testid="invalid">
          {[...validity.invalidFields].join(",")}
        </output>
        <output data-testid="valid">{String(validity.valid)}</output>
      </>
    );
  }

  it("collects invalid fields and releases one that leaves the tree", async () => {
    const user = userEvent.setup();
    renderInPanel(<Panel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    await user.clear(input);
    expect(screen.getByTestId("invalid")).toHaveTextContent("interval");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    // A field nobody can see must not go on blocking a save.
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByTestId("invalid")).toBeEmptyDOMElement();
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("starts a field mounted again under the same name as valid", async () => {
    const user = userEvent.setup();
    function Remountable(): ReactElement {
      const validity = useFieldValidity();
      const [mounted, setMounted] = useState(true);
      return (
        <>
          {mounted ? (
            <NumberField
              {...validity.register("interval")}
              label="Refresh interval"
              min={1}
              integer
              defaultValue={10}
            />
          ) : null}
          <button type="button" onClick={() => setMounted((on) => !on)}>
            Toggle
          </button>
          <output data-testid="valid">{String(validity.valid)}</output>
        </>
      );
    }
    renderInPanel(<Remountable />);

    await user.clear(
      screen.getByRole("spinbutton", { name: "Refresh interval" }),
    );
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    const toggle = screen.getByRole("button", { name: "Toggle" });
    await user.click(toggle);
    await user.click(toggle);
    // A new field holds a new, valid draft, whatever the old one reported.
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("forgets a field that left the tree, so its name registers afresh", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Rows(): ReactElement {
      const validity = useFieldValidity();
      const [mounted, setMounted] = useState(true);
      const handlers = validity.register("row-1");
      seen.push(handlers);
      return (
        <>
          {mounted ? (
            <NumberField
              {...handlers}
              label="Row one"
              min={1}
              integer
              defaultValue={10}
            />
          ) : null}
          <button type="button" onClick={() => setMounted((on) => !on)}>
            Toggle
          </button>
        </>
      );
    }
    renderInPanel(<Rows />);

    const first = seen.at(-1);
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    // Nothing holds the removed field once its node has left the document.
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(seen.at(-1)).not.toBe(first);
  });

  it("keeps a hidden field's handlers, which a retaining section reveals again", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Hidden(): ReactElement {
      const validity = useFieldValidity();
      const handlers = validity.register("interval");
      seen.push(handlers);
      return (
        <CollapsibleSection title="Timing" defaultOpen>
          <NumberField
            {...handlers}
            label="Refresh interval"
            min={1}
            integer
            defaultValue={10}
          />
        </CollapsibleSection>
      );
    }
    renderInPanel(<Hidden />);

    const first = seen.at(-1);
    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    await flushMicrotasks();
    await user.click(toggle);
    // A hidden node stays in the document, so the field is not forgotten.
    expect(new Set(seen)).toEqual(new Set([first]));
  });

  it("forgets a field its owner removes while a retaining section hides it, at that commit", async () => {
    const user = userEvent.setup();
    function Rows(): ReactElement {
      const validity = useFieldValidity();
      const [alpha, setAlpha] = useState(true);
      // The React keys never equal a field name, so a dropped key can only be
      // the hook forgetting the field.
      return (
        <>
          {alpha ? (
            <CollapsibleSection key="k-alpha" title="Alpha" defaultOpen>
              <NumberField
                {...validity.register("field-alpha")}
                label="Alpha interval"
                min={1}
                integer
                defaultValue={10}
              />
            </CollapsibleSection>
          ) : null}
          <CollapsibleSection key="k-beta" title="Beta" defaultOpen>
            <NumberField
              {...validity.register("field-beta")}
              label="Beta interval"
              min={1}
              integer
              defaultValue={10}
            />
          </CollapsibleSection>
          <button type="button" onClick={() => setAlpha(false)}>
            Remove alpha
          </button>
        </>
      );
    }
    renderInPanel(<Rows />);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await flushMicrotasks();
    const deleted = vi.spyOn(Map.prototype, "delete");
    // Removed while hidden: React runs no second ref cleanup for a subtree
    // it already hid, so the owner's commit is where the hook notices.
    await user.click(screen.getByRole("button", { name: "Remove alpha" }));
    expect(forgot(deleted, "field-alpha")).toBe(true);
    expect(forgot(deleted, "field-beta")).toBe(false);
  });

  it("registers a name afresh when a field removed while hidden left without its owner rendering", async () => {
    const user = userEvent.setup();
    const seen: FieldValidityHandlers[] = [];
    function Section({
      handlers,
    }: {
      readonly handlers: FieldValidityHandlers;
    }): ReactElement {
      const [present, setPresent] = useState(true);
      return (
        <>
          {present ? (
            <CollapsibleSection title="Timing" defaultOpen>
              <NumberField
                {...handlers}
                label="Refresh interval"
                min={1}
                integer
                defaultValue={10}
              />
            </CollapsibleSection>
          ) : null}
          <button type="button" onClick={() => setPresent(false)}>
            Remove section
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      const validity = useFieldValidity();
      const [renders, setRenders] = useState(0);
      const handlers = validity.register("interval");
      seen.push(handlers);
      return (
        <>
          <Section handlers={handlers} />
          <button type="button" onClick={() => setRenders(renders + 1)}>
            Render owner
          </button>
        </>
      );
    }
    renderInPanel(<Owner />);

    const first = seen.at(-1);
    await user.click(screen.getByRole("button", { name: "Timing" }));
    await flushMicrotasks();
    // The section leaves through its own state, so the owner does not commit.
    await user.click(screen.getByRole("button", { name: "Remove section" }));
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Render owner" }));
    // The owner's next registration of the name finds its field gone.
    expect(seen.at(-1)).not.toBe(first);
  });

  it("forgets a visible field that leaves without its owner rendering, once the commit lands", async () => {
    const user = userEvent.setup();
    function Row({
      handlers,
    }: {
      readonly handlers: FieldValidityHandlers;
    }): ReactElement {
      const [present, setPresent] = useState(true);
      return (
        <>
          {present ? (
            <NumberField
              {...handlers}
              label="Row interval"
              min={1}
              integer
              defaultValue={10}
            />
          ) : null}
          <button type="button" onClick={() => setPresent(false)}>
            Remove row
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      const validity = useFieldValidity();
      return <Row handlers={validity.register("field-row")} />;
    }
    renderInPanel(<Owner />);

    const deleted = vi.spyOn(Map.prototype, "delete");
    // A valid field leaves: the owner's validity set does not change, so the
    // owner does not commit, and the ref cleanup is the only route.
    await user.click(screen.getByRole("button", { name: "Remove row" }));
    await flushMicrotasks();
    expect(forgot(deleted, "field-row")).toBe(true);
  });

  it("forgets a row a child registered and removed while hidden, when the next row registers", async () => {
    const user = userEvent.setup();
    function List({
      validity,
    }: {
      readonly validity: FieldValidity;
    }): ReactElement {
      const [rows, setRows] = useState<readonly number[]>([]);
      // Ids are never reused, so a name never registers twice.
      const [next, setNext] = useState(1);
      // The rows register in this child's render, so adding or removing one
      // commits no render of the component that owns the validity. The React
      // keys never equal a field name.
      return (
        <>
          {rows.map((id) => (
            <CollapsibleSection
              key={`k${String(id)}`}
              title={`Section ${String(id)}`}
              defaultOpen
            >
              <NumberField
                {...validity.register(`row-${String(id)}`)}
                label={`Row ${String(id)}`}
                min={1}
                integer
                defaultValue={10}
              />
            </CollapsibleSection>
          ))}
          <button
            type="button"
            onClick={() => {
              setRows([...rows, next]);
              setNext(next + 1);
            }}
          >
            Add row
          </button>
          <button type="button" onClick={() => setRows(rows.slice(0, -1))}>
            Remove last row
          </button>
        </>
      );
    }
    function Owner(): ReactElement {
      return <List validity={useFieldValidity()} />;
    }
    renderInPanel(<Owner />);

    await user.click(screen.getByRole("button", { name: "Add row" }));
    await user.click(screen.getByRole("button", { name: "Section 1" }));
    await flushMicrotasks();
    await user.click(screen.getByRole("button", { name: "Remove last row" }));
    await flushMicrotasks();
    const deleted = vi.spyOn(Map.prototype, "delete");
    await user.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getByRole("spinbutton", { name: "Row 2" })).toBeVisible();
    // Neither the owner's commit nor the same name ever comes, so a new
    // name's registration is where the removed row is noticed.
    expect(forgot(deleted, "row-1")).toBe(true);
  });

  it("releases a field while a retaining section hides it, and restores it on reveal", async () => {
    const user = userEvent.setup();
    function SectionPanel(): ReactElement {
      const validity = useFieldValidity();
      return (
        <>
          <CollapsibleSection title="Timing" defaultOpen>
            <NumberField
              {...validity.register("interval")}
              label="Refresh interval"
              min={1}
              max={60}
              integer
              defaultValue={10}
            />
          </CollapsibleSection>
          <output data-testid="valid">{String(validity.valid)}</output>
        </>
      );
    }
    renderInPanel(<SectionPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    // Out of sight, the field no longer blocks a save.
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    await user.click(toggle);
    // Back on screen with its error, it blocks again.
    expect(input).toHaveValue(99);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
  });

  it("joins a field that reports without a ref, and focuses a control registered directly", async () => {
    const user = userEvent.setup();
    let found: HTMLElement | null = null;
    // A control of the panel's own that spreads the handlers, keeping the
    // callback off the element.
    function RawInput({
      onValidityChange,
      ...props
    }: FieldValidityHandlers & {
      readonly "aria-label": string;
    }): ReactElement {
      return <input {...props} />;
    }
    function Direct(): ReactElement {
      const validity = useFieldValidity();
      const callbackOnly = validity.register("callback");
      const direct = validity.register("direct");
      return (
        <>
          <RawInput aria-label="Direct" {...direct} />
          <button
            type="button"
            onClick={() => {
              callbackOnly.onValidityChange(false);
              direct.onValidityChange(false);
            }}
          >
            Break
          </button>
          <button
            type="button"
            onClick={() => {
              found = validity.firstInvalid();
            }}
          >
            Find
          </button>
          <output data-testid="invalid">
            {[...validity.invalidFields].join(",")}
          </output>
        </>
      );
    }
    renderInPanel(<Direct />);

    await user.click(screen.getByRole("button", { name: "Break" }));
    expect(screen.getByTestId("invalid")).toHaveTextContent("callback,direct");
    await user.click(screen.getByRole("button", { name: "Find" }));
    // A field with no node has nothing to focus; the registered input is the
    // control itself.
    expect(found).toBe(screen.getByRole("textbox", { name: "Direct" }));
  });

  it("finds a field rendered into a second window", () => {
    const found = vi.fn<(target: HTMLElement | null) => void>();
    function FramedInput({
      onValidityChange,
      ...props
    }: FieldValidityHandlers & {
      readonly "aria-label": string;
    }): ReactElement {
      return <input {...props} />;
    }
    function Framed(): ReactElement {
      const validity = useFieldValidity();
      const field = validity.register("framed");
      return (
        <>
          <FramedInput aria-label="Framed" {...field} />
          <button
            type="button"
            onClick={() => {
              field.onValidityChange(false);
            }}
          >
            Break
          </button>
          <button
            type="button"
            onClick={() => {
              found(validity.firstInvalid());
            }}
          >
            Find
          </button>
        </>
      );
    }

    withFrameDocument((frameDocument) => {
      const host = frameDocument.createElement("div");
      frameDocument.body.append(host);
      const root = createRoot(host);
      try {
        act(() => {
          root.render(<Framed />);
        });
        const [breakButton, findButton] = host.querySelectorAll("button");
        act(() => {
          breakButton?.click();
        });
        act(() => {
          findButton?.click();
        });
        // The frame's own element type, not the top window's, recognizes it.
        expect(found).toHaveBeenLastCalledWith(host.querySelector("input"));
      } finally {
        act(() => {
          root.unmount();
        });
      }
    });
  });

  it("finds the first invalid field in document order", async () => {
    const user = userEvent.setup();
    let found: HTMLElement | null = null;
    function Ordered(): ReactElement {
      const validity = useFieldValidity();
      const [early, setEarly] = useState(false);
      return (
        <>
          {early ? (
            <NumberField
              {...validity.register("early")}
              label="Early"
              min={1}
              integer
              defaultValue={10}
            />
          ) : null}
          <NumberField
            {...validity.register("late")}
            label="Late"
            min={1}
            integer
            defaultValue={10}
          />
          <button type="button" onClick={() => setEarly(true)}>
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              found = validity.firstInvalid();
            }}
          >
            Find
          </button>
        </>
      );
    }
    renderInPanel(<Ordered />);

    const find = screen.getByRole("button", { name: "Find" });
    await user.click(find);
    expect(found).toBeNull();

    // The later field registers first and goes invalid first; the one
    // inserted above it still comes first on the page.
    await user.clear(screen.getByRole("spinbutton", { name: "Late" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.clear(screen.getByRole("spinbutton", { name: "Early" }));
    await user.click(find);
    expect(found).toBe(screen.getByRole("spinbutton", { name: "Early" }));

    await user.type(screen.getByRole("spinbutton", { name: "Early" }), "4");
    await user.click(find);
    expect(found).toBe(screen.getByRole("spinbutton", { name: "Late" }));
  });
});

describe("named unit helpers", () => {
  it("tells a named unit from a node and reads it by name, or by its symbol", () => {
    expect(isNamedUnit({ name: "knots", symbol: "kn" })).toBe(true);
    expect(isNamedUnit("kn")).toBe(false);
    expect(isNamedUnit(<span>kn</span>)).toBe(false);
    expect(isNamedUnit(null)).toBe(false);

    expect(unitSpokenText({ name: " knots ", symbol: "kn" })).toBe("knots");
    // A blank name falls back to the symbol, which is then read as drawn.
    expect(unitSpokenText({ name: " ", symbol: "kn" })).toBe("kn");
    expect(unitSpokenText(12)).toBe("12");
    // A unit drawn through markup of its own is read as the text it renders.
    expect(unitSpokenText(<abbr title="knots">kn</abbr>)).toBe("kn");
    expect(unitSpokenText(<span aria-hidden="true">kn</span>)).toBeUndefined();

    expect(hasUnitContent({ name: "", symbol: "" })).toBe(false);
    expect(hasUnitContent({ name: "knots", symbol: "" })).toBe(true);
    expect(hasUnitContent(" ")).toBe(false);
  });

  it("draws a named unit with no name as its plain symbol", () => {
    expect(renderUnit({ name: " ", symbol: "kn" })).toBe("kn");
  });
});

describe("useResetDrafts", () => {
  function ResettablePanel({
    onValidityChange,
  }: {
    readonly onValidityChange?: (valid: boolean) => void;
  }): ReactElement {
    const reset = useResetDrafts();
    return (
      <>
        <CollapsibleSection title="Timing" defaultOpen>
          <NumberField
            label="Refresh interval"
            min={1}
            max={60}
            integer
            value={10}
            onValidityChange={onValidityChange}
          />
        </CollapsibleSection>
        <button type="button" onClick={reset}>
          Discard
        </button>
      </>
    );
  }

  it("drops every draft, an invalid one included, and reports it valid", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    // PanelRoot publishes the reset, so a panel needs nothing more.
    renderInPanel(<ResettablePanel onValidityChange={onValidityChange} />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.tab();
    expect(input).toHaveAttribute("aria-invalid", "true");

    // Discard restores the value the draft was typed against, which alone
    // would change nothing the draft is keyed on.
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(onValidityChange.mock.calls).toEqual([[false], [true]]);

    // The next edit starts from the committed value.
    await user.type(input, "0");
    expect(input).toHaveValue(100);
  });

  it("leaves the panel that calls the reset alone, rendering only the fields", async () => {
    const user = userEvent.setup();
    const panelRender = vi.fn();
    function CountingPanel(): ReactElement {
      panelRender();
      const reset = useResetDrafts();
      return (
        <>
          <NumberField label="Refresh interval" min={1} integer value={10} />
          <button type="button" onClick={reset}>
            Discard
          </button>
        </>
      );
    }
    renderInPanel(<CountingPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    const before = panelRender.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue(10);
    expect(panelRender).toHaveBeenCalledTimes(before);
  });

  it("reports a field in a collapsed section valid while it is hidden", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    renderInPanel(
      <DraftResetScope>
        <ResettablePanel onValidityChange={onValidityChange} />
      </DraftResetScope>,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Discard" }));
    // Heard at once, although the hidden section runs no effects.
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    const reports = onValidityChange.mock.calls.length;

    await user.click(toggle);
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    // The reveal repeats nothing.
    expect(onValidityChange).toHaveBeenCalledTimes(reports);
  });

  it("clears a hidden field's useFieldValidity entry, so the reveal blocks nothing", async () => {
    const user = userEvent.setup();
    function ValidatedPanel(): ReactElement {
      const validity = useFieldValidity();
      const reset = useResetDrafts();
      return (
        <>
          <CollapsibleSection title="Timing" defaultOpen>
            <NumberField
              {...validity.register("interval")}
              label="Refresh interval"
              min={1}
              max={60}
              integer
              value={10}
            />
          </CollapsibleSection>
          <button type="button" onClick={reset}>
            Discard
          </button>
          <output data-testid="valid">{String(validity.valid)}</output>
        </>
      );
    }
    renderInPanel(<ValidatedPanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    await user.type(input, "99");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    const toggle = screen.getByRole("button", { name: "Timing" });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    await user.click(toggle);

    // The reset reached the hidden field, so the reveal restores nothing.
    expect(input).toHaveValue(10);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    // A fresh invalid edit still blocks.
    await user.clear(input);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
  });

  it("says once in development that it has no panel to reset", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<ResettablePanel />);

    const input = screen.getByRole("spinbutton", { name: "Refresh interval" });
    await user.clear(input);
    const discard = screen.getByRole("button", { name: "Discard" });
    await user.click(discard);
    await user.click(discard);
    expect(input).toHaveValue(null);
    // The field still edits normally without a scope to report to: a valid
    // keystroke commits, and the panel's fixed value shows again.
    await user.type(input, "5");
    expect(input).toHaveValue(10);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
      "useResetDrafts found no PanelRoot or PanelShell above it, so the reset did nothing. Render the panel inside one, or pass each field a resetKey that the Discard action changes.",
    ]);
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
    function Raw(): ReactElement {
      const [value, setValue] = useState<number | undefined>(10);
      const draft = useNumberDraft(value, setValue, { integer: true });
      // A text input keeps the typed string verbatim, unlike a number input,
      // so the draft text itself can be observed.
      return <input aria-label="Raw" type="text" {...draft.inputProps} />;
    }
    renderInPanel(<Raw />);

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
    function Raw(): ReactElement {
      const [value, setValue] = useState<number | undefined>(10);
      const draft = useNumberDraft(value, setValue);
      return (
        <>
          <input aria-label="Raw" type="text" {...draft.inputProps} />
          <output data-testid="value">{String(value)}</output>
          <output data-testid="reason">{draft.invalidReason ?? "valid"}</output>
        </>
      );
    }
    renderInPanel(<Raw />);

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
