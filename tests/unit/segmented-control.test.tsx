import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactActual from "react";
import { createRef, useState } from "react";
import * as JSXDevRuntime from "react/jsx-dev-runtime";
import * as JSXRuntime from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";
import {
  CollapsibleSection,
  SegmentedControl,
  type ThemeChoice,
} from "../../src/index.js";

const OPTIONS = [
  { label: "Metric", value: "metric" },
  { label: "Imperial", value: "imperial" },
  { label: "Nautical", value: "nautical" },
] as const;

describe("SegmentedControl option validation", () => {
  it("rejects an empty option collection", () => {
    expect(() =>
      render(<SegmentedControl label="Units" options={[]} />),
    ).toThrow(
      "signalk-nearlcrews-ui: SegmentedControl requires at least one option.",
    );
  });

  it("rejects options without an accessible label", () => {
    expect(() =>
      render(
        <SegmentedControl
          label="Units"
          options={[{ label: "  ", value: "metric" }]}
        />,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: SegmentedControl options require non-empty labels.",
    );
  });

  it("rejects duplicate option values", () => {
    expect(() =>
      render(
        <SegmentedControl
          label="Units"
          options={[
            { label: "Metric", value: "metric" },
            { label: "Meters", value: "metric" },
          ]}
        />,
      ),
    ).toThrow(
      'signalk-nearlcrews-ui: SegmentedControl option values must be unique; received duplicate value "metric".',
    );
  });
});

describe("SegmentedControl selection modes", () => {
  it("selects options in uncontrolled mode from defaultValue", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Imperial" }));

    expect(onChange).toHaveBeenCalledWith("imperial");
    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    // The roving tab stop follows the internal selection.
    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("starts with no selection when neither value nor defaultValue is given", () => {
    const onChange = vi.fn();
    const view = render(
      <SegmentedControl
        label="Units"
        name="units"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    for (const option of screen.getAllByRole("radio")) {
      expect(option).toHaveAttribute("aria-checked", "false");
    }
    // The first enabled option holds the tab stop until a selection exists.
    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    // The hidden input submits an empty value until a selection exists.
    expect(view.container.querySelector("input[type=hidden]")).toHaveProperty(
      "value",
      "",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Nautical" }));

    expect(onChange).toHaveBeenCalledWith("nautical");
    expect(screen.getByRole("radio", { name: "Nautical" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("keeps selection controlled by the value prop", () => {
    const onChange = vi.fn();
    const view = render(
      <SegmentedControl
        label="Units"
        value="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Imperial" }));

    expect(onChange).toHaveBeenCalledWith("imperial");
    // The parent has not updated value, so the selection stays put.
    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    view.rerender(
      <SegmentedControl
        label="Units"
        value="imperial"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("SegmentedControl form participation", () => {
  it("carries the current selection into native form submission", () => {
    const submitted: FormData[] = [];
    const view = render(
      <form
        data-testid="units-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitted.push(new FormData(event.currentTarget));
        }}
      >
        <SegmentedControl
          label="Units"
          name="units"
          defaultValue="metric"
          options={OPTIONS}
        />
      </form>,
    );

    const hidden = view.container.querySelector("input[type=hidden]");
    expect(hidden).toHaveProperty("name", "units");
    expect(hidden).toHaveProperty("value", "metric");

    fireEvent.click(screen.getByRole("radio", { name: "Imperial" }));
    fireEvent.submit(screen.getByTestId("units-form"));

    expect(submitted[0]?.get("units")).toBe("imperial");
  });

  it("omits the hidden input when no name is given", () => {
    const view = render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        options={OPTIONS}
      />,
    );

    expect(view.container.querySelector("input")).toBeNull();
  });

  it("omits a disabled control from native form data", () => {
    render(
      <form data-testid="units-form">
        <SegmentedControl
          disabled
          label="Units"
          name="units"
          defaultValue="metric"
          options={OPTIONS}
        />
      </form>,
    );

    const form = screen.getByTestId<HTMLFormElement>("units-form");
    expect(new FormData(form).has("units")).toBe(false);
  });

  it("restores the defaultValue selection on form reset", async () => {
    render(
      <form data-testid="units-form">
        <SegmentedControl
          label="Units"
          name="units"
          defaultValue="metric"
          options={OPTIONS}
        />
      </form>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Imperial" }));
    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const form = screen.getByTestId<HTMLFormElement>("units-form");
    // The restore waits a microtask, because a native reset finishes
    // rewriting its controls only once the event has finished dispatching.
    await act(async () => {
      form.reset();
      // The restore lands on the microtask after the reset event.
      await Promise.resolve();
    });

    expect(screen.getByRole("radio", { name: "Metric" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(new FormData(form).get("units")).toBe("metric");
  });

  it("leaves a controlled selection to the parent on form reset", async () => {
    render(
      <form data-testid="units-form">
        <SegmentedControl
          label="Units"
          name="units"
          value="imperial"
          options={OPTIONS}
        />
      </form>,
    );

    const form = screen.getByTestId<HTMLFormElement>("units-form");
    act(() => {
      form.reset();
    });

    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await waitFor(() =>
      expect(new FormData(form).get("units")).toBe("imperial"),
    );
  });

  it("keeps the submitted value on the displayed selection through a collapse", async () => {
    const user = userEvent.setup();
    render(
      <form data-testid="units-form">
        <CollapsibleSection title="Units" defaultOpen>
          <SegmentedControl
            label="Units"
            name="units"
            defaultValue="metric"
            options={OPTIONS}
          />
        </CollapsibleSection>
      </form>,
    );
    const toggle = screen.getByRole("button", { name: "Units" });
    const form = screen.getByTestId<HTMLFormElement>("units-form");
    await user.click(screen.getByRole("radio", { name: "Imperial" }));

    // A retained subtree keeps its state while its effects and refs are torn
    // down, so this reset reaches the input but not the control's listener.
    await user.click(toggle);
    act(() => {
      form.reset();
    });
    await user.click(toggle);

    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(new FormData(form).get("units")).toBe("imperial");
  });
});

describe("SegmentedControl label and controlled value", () => {
  it("names the group from its label", () => {
    render(<SegmentedControl label="Units" options={OPTIONS} />);

    expect(screen.getByRole("radiogroup", { name: "Units" })).toBeVisible();
  });

  it("rejects a control with no label content", () => {
    expect(() =>
      render(<SegmentedControl label="  " options={OPTIONS} />),
    ).toThrow(
      "signalk-nearlcrews-ui: SegmentedControl requires a non-empty label.",
    );
  });

  it("keeps the hidden input attached while the controlled value changes", () => {
    const addListener = vi.spyOn(HTMLFormElement.prototype, "addEventListener");
    const tree = (
      value: (typeof OPTIONS)[number]["value"],
    ): ReactActual.ReactElement => (
      <form>
        <SegmentedControl
          label="Units"
          name="units"
          value={value}
          options={OPTIONS}
        />
      </form>
    );
    const view = render(tree("metric"));
    const resetListeners = (): number =>
      addListener.mock.calls.filter(([type]) => type === "reset").length;
    expect(resetListeners()).toBe(1);

    view.rerender(tree("imperial"));
    view.rerender(tree("nautical"));

    // A stable callback ref means the reset listener registered once.
    expect(resetListeners()).toBe(1);
    expect(view.container.querySelector("input[type=hidden]")).toHaveProperty(
      "value",
      "nautical",
    );
  });
});

describe("SegmentedControl legend visibility", () => {
  it("keeps the legend visually hidden by default", () => {
    render(<SegmentedControl label="Units" value="metric" options={OPTIONS} />);

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group.querySelector(".snui-segmented__legend")).toBeNull();
    expect(group.querySelector(".snui-visually-hidden")).toHaveTextContent(
      "Units",
    );
  });

  it("shows the legend when labelVisibility is visible", () => {
    render(
      <SegmentedControl
        label="Units"
        labelVisibility="visible"
        value="metric"
        options={OPTIONS}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group.querySelector(".snui-visually-hidden")).toBeNull();
    expect(group.querySelector(".snui-segmented__legend")).toHaveTextContent(
      "Units",
    );
  });
});

describe("SegmentedControl orientation", () => {
  it("moves along both axes in vertical orientation", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        orientation="vertical"
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group).toHaveAttribute("aria-orientation", "vertical");
    expect(group.querySelector(".snui-segmented__group")).toHaveClass(
      "snui-segmented__group--vertical",
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    metric.focus();
    fireEvent.keyDown(metric, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("imperial");

    const imperial = screen.getByRole("radio", { name: "Imperial" });
    expect(imperial).toHaveFocus();
    fireEvent.keyDown(imperial, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("metric");

    // The radio pattern binds both axes, so the horizontal pair moves here
    // too, and an operator who learned one axis keeps it in either group.
    onChange.mockClear();
    fireEvent.keyDown(metric, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("imperial");
    fireEvent.keyDown(metric, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("nautical");

    // Home and End stay active in both orientations.
    fireEvent.keyDown(metric, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("nautical");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Nautical" }), {
      key: "Home",
    });
    expect(onChange).toHaveBeenCalledWith("metric");
  });

  it("moves along both axes in horizontal orientation", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group).toHaveAttribute("aria-orientation", "horizontal");
    expect(group.querySelector(".snui-segmented__group")).not.toHaveClass(
      "snui-segmented__group--vertical",
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    metric.focus();
    // The vertical pair is answered rather than left to scroll the page.
    expect(fireEvent.keyDown(metric, { key: "ArrowDown" })).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith("imperial");
    fireEvent.keyDown(metric, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("nautical");
  });

  it("leaves a key it does not answer to the page", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    metric.focus();
    expect(fireEvent.keyDown(metric, { key: "PageDown" })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedControl read-only state", () => {
  it("refuses every selection route while every option keeps its tab stop", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        readOnly
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    const imperial = screen.getByRole("radio", { name: "Imperial" });
    // A save in flight must not drop the operator's focus on the body.
    expect(metric).toBeEnabled();
    expect(metric).toHaveAttribute("tabindex", "0");
    // The group reads as fixed, the way RadioGroup's readOnly does, rather
    // than as a set of unavailable options.
    expect(screen.getByRole("radiogroup", { name: "Units" })).toHaveAttribute(
      "aria-readonly",
      "true",
    );
    expect(metric).not.toHaveAttribute("aria-disabled");
    expect(imperial).not.toHaveAttribute("aria-disabled");

    metric.focus();
    fireEvent.click(imperial);
    fireEvent.keyDown(metric, { key: " " });
    expect(onChange).not.toHaveBeenCalled();
    expect(metric).toHaveAttribute("aria-checked", "true");

    // Arrows still move focus, so the group can be read through.
    fireEvent.keyDown(metric, { key: "ArrowRight" });
    expect(imperial).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(metric).toHaveAttribute("aria-checked", "true");
  });

  it("leaves a disabled group its native state alone", () => {
    render(
      <SegmentedControl
        label="Units"
        disabled
        defaultValue="metric"
        options={OPTIONS}
      />,
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    // A natively disabled control already reports its state.
    expect(metric).toBeDisabled();
    expect(metric).not.toHaveAttribute("aria-disabled");
  });
});

describe("SegmentedControl blocked option", () => {
  const BLOCKED = [
    { label: "Metric", value: "metric" },
    { label: "Imperial", value: "imperial", ariaDisabled: true },
    { label: "Nautical", value: "nautical" },
  ] as const;

  it("keeps a blocked option focusable and refuses to select it", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        onValueChange={onChange}
        options={BLOCKED}
      />,
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    const imperial = screen.getByRole("radio", { name: "Imperial" });
    const nautical = screen.getByRole("radio", { name: "Nautical" });
    expect(imperial).toBeEnabled();
    expect(imperial).toHaveAttribute("aria-disabled", "true");
    expect(metric).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-readonly");

    fireEvent.click(imperial);
    fireEvent.keyDown(imperial, { key: " " });
    expect(onChange).not.toHaveBeenCalled();

    // Arrows reach the blocked option, so its state can be read, and leave
    // the selection where it was; the next arrow selects past it.
    metric.focus();
    fireEvent.keyDown(metric, { key: "ArrowRight" });
    expect(imperial).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(metric).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(imperial, { key: "ArrowRight" });
    expect(nautical).toHaveFocus();
    expect(onChange).toHaveBeenCalledExactlyOnceWith("nautical");
  });

  it("keeps the tab stop on a selected option that becomes blocked", () => {
    const { rerender } = render(
      <SegmentedControl label="Units" value="imperial" options={OPTIONS} />,
    );
    const imperial = screen.getByRole("radio", { name: "Imperial" });
    imperial.focus();

    rerender(
      <SegmentedControl label="Units" value="imperial" options={BLOCKED} />,
    );
    // Native disabled here would drop focus on the body.
    expect(imperial).toHaveFocus();
    expect(imperial).toHaveAttribute("tabindex", "0");
    expect(imperial).toHaveAttribute("aria-disabled", "true");
  });
});

describe("SegmentedControl blocked option reason", () => {
  it("reads a blocked option's reason as its description and drops it once live", () => {
    const { rerender } = render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        options={[
          { label: "Metric", value: "metric" },
          {
            label: "Imperial",
            value: "imperial",
            ariaDisabled: true,
            disabledReason: "The chart set is metric only.",
          },
        ]}
      />,
    );

    const imperial = screen.getByRole("radio", { name: "Imperial" });
    // A description, so the option keeps the name it had before it was
    // blocked.
    expect(imperial).toHaveAccessibleDescription(
      "The chart set is metric only.",
    );

    rerender(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        options={[
          { label: "Metric", value: "metric" },
          {
            label: "Imperial",
            value: "imperial",
            disabledReason: "The chart set is metric only.",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("radio", { name: "Imperial" }),
    ).not.toHaveAccessibleDescription();
  });

  it.each([
    [
      "the option",
      false,
      true,
      // A reason beside the option's own native disabled is a mistake the
      // consumer can fix, so development names it.
      [
        'SegmentedControl option "Imperial" has a disabledReason beside native disabled, which takes it out of the tab order, so no one reaches the reason. Use ariaDisabled instead: the option stays focusable and reads the reason.',
      ],
    ],
    // A disabled group is an ordinary panel state, not a mistake.
    ["the group", true, false, []],
  ] as const)(
    "drops the reason once %s is natively disabled",
    (_, groupDisabled, optionDisabled, warnings) => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      render(
        <SegmentedControl
          label="Units"
          defaultValue="metric"
          disabled={groupDisabled}
          options={[
            { label: "Metric", value: "metric" },
            {
              label: "Imperial",
              value: "imperial",
              ariaDisabled: true,
              disabled: optionDisabled,
              disabledReason: "The chart set is metric only.",
            },
          ]}
        />,
      );

      // Native disabled takes the option out of the tab order, where the
      // reason would reach no one.
      const imperial = screen.getByRole("radio", { name: "Imperial" });
      expect(imperial).toBeDisabled();
      expect(imperial).not.toHaveAttribute("aria-describedby");
      expect(imperial).not.toHaveAccessibleDescription();
      expect(screen.queryByText("The chart set is metric only.")).toBeNull();
      expect(warn.mock.calls.map(([message]) => String(message))).toEqual(
        warnings,
      );
    },
  );

  it("asks a blocked option that says nothing to say why", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <SegmentedControl
        label="Depth units"
        defaultValue="meters"
        options={[
          { label: "Meters", value: "meters" },
          { label: "Fathoms", value: "fathoms", ariaDisabled: true },
          {
            label: "Feet",
            value: "feet",
            disabled: true,
            disabledReason: "Not offered here.",
          },
        ]}
      />,
    );

    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
      'SegmentedControl option "Fathoms" is blocked with ariaDisabled but says nothing about why. Pass disabledReason on the option.',
      'SegmentedControl option "Feet" has a disabledReason beside native disabled, which takes it out of the tab order, so no one reaches the reason. Use ariaDisabled instead: the option stays focusable and reads the reason.',
    ]);
  });
});

describe("SegmentedControl option data attribute values", () => {
  it("writes numbers and booleans the way a data attribute on any element takes them", () => {
    render(
      <SegmentedControl
        label="Waypoint"
        defaultValue="first"
        options={[
          {
            label: "First",
            value: "first",
            dataAttributes: { "data-index": 1, "data-default": true },
          },
        ]}
      />,
    );

    const first = screen.getByRole("radio", { name: "First" });
    expect(first).toHaveAttribute("data-index", "1");
    expect(first).toHaveAttribute("data-default", "true");
  });
});

describe("SegmentedControl option data attributes", () => {
  it("passes an option's data attributes to its radio", () => {
    render(
      <SegmentedControl
        label="Panel theme"
        defaultValue="auto"
        options={[
          {
            label: "Match Admin",
            value: "auto",
            dataAttributes: { "data-snui-theme-choice": "auto" },
          },
          {
            label: "Night",
            value: "night",
            dataAttributes: { "data-snui-theme-choice": "night" },
          },
        ]}
      />,
    );

    expect(screen.getByRole("radio", { name: "Match Admin" })).toHaveAttribute(
      "data-snui-theme-choice",
      "auto",
    );
    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "data-snui-theme-choice",
      "night",
    );
  });

  it("accepts options a consumer typed with an interface", () => {
    interface ViewOption {
      readonly label: string;
      readonly value: "list" | "map";
    }
    const views: readonly ViewOption[] = [
      { label: "List", value: "list" },
      { label: "Map", value: "map" },
    ];
    render(
      <SegmentedControl label="View" defaultValue="list" options={views} />,
    );

    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("SegmentedControl focus-only movement", () => {
  it("moves focus without changing selection when Ctrl is held", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        defaultValue="metric"
        onValueChange={onChange}
        options={OPTIONS}
      />,
    );

    const metric = screen.getByRole("radio", { name: "Metric" });
    metric.focus();
    fireEvent.keyDown(metric, { key: "ArrowRight", ctrlKey: true });

    expect(screen.getByRole("radio", { name: "Imperial" })).toHaveFocus();
    expect(metric).toHaveAttribute("aria-checked", "true");
    expect(onChange).not.toHaveBeenCalled();

    // Focus-only moves chain from the focused option.
    fireEvent.keyDown(screen.getByRole("radio", { name: "Imperial" }), {
      key: "ArrowRight",
      ctrlKey: true,
    });
    expect(screen.getByRole("radio", { name: "Nautical" })).toHaveFocus();
    expect(metric).toHaveAttribute("aria-checked", "true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses Cmd as the focus modifier on macOS", async () => {
    vi.stubGlobal("navigator", {
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    vi.resetModules();
    // The re-imported module must share the renderer's React copy.
    vi.doMock("react", () => ReactActual);
    vi.doMock("react/jsx-runtime", () => JSXRuntime);
    vi.doMock("react/jsx-dev-runtime", () => JSXDevRuntime);

    try {
      // Dynamic import is required here: the macOS modifier resolves once at
      // module scope, so the module must be re-evaluated after stubbing
      // navigator. React is mocked back to the renderer's copy above.
      const { SegmentedControl: MacSegmentedControl } = await import(
        "../../src/components/SegmentedControl.js"
      );
      const onChange = vi.fn();
      render(
        <MacSegmentedControl
          label="Units"
          defaultValue="metric"
          onValueChange={onChange}
          options={OPTIONS}
        />,
      );

      const metric = screen.getByRole("radio", { name: "Metric" });
      metric.focus();
      fireEvent.keyDown(metric, { key: "ArrowRight", metaKey: true });

      expect(screen.getByRole("radio", { name: "Imperial" })).toHaveFocus();
      expect(metric).toHaveAttribute("aria-checked", "true");
      expect(onChange).not.toHaveBeenCalled();

      // Ctrl is not the focus modifier on macOS, so it still selects.
      fireEvent.keyDown(screen.getByRole("radio", { name: "Imperial" }), {
        key: "ArrowRight",
        ctrlKey: true,
      });
      expect(onChange).toHaveBeenCalledWith("nautical");
    } finally {
      vi.doUnmock("react");
      vi.doUnmock("react/jsx-runtime");
      vi.doUnmock("react/jsx-dev-runtime");
      vi.resetModules();
    }
  });
});

describe("SegmentedControl ref", () => {
  it("forwards ref to the radiogroup container", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SegmentedControl
        ref={ref}
        label="Units"
        value="metric"
        options={OPTIONS}
      />,
    );

    expect(ref.current).toBe(screen.getByRole("radiogroup", { name: "Units" }));
  });
});

describe("SegmentedControl description and error", () => {
  it("describes the group with its own text and marks it invalid", () => {
    render(
      <SegmentedControl
        label="Units"
        description="Applies to every reading in this panel."
        error="Pick the units the crew reads."
        options={OPTIONS}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-errormessage");
    expect(group).toHaveAccessibleDescription(
      "Applies to every reading in this panel. Error.Pick the units the crew reads.",
    );
  });

  it("mounts an announcing error region before its content arrives", () => {
    const { container } = render(
      <SegmentedControl label="Units" errorLive="polite" options={OPTIONS} />,
    );

    // The region has to exist before the message so a screen reader observes
    // the change rather than the arrival of a new element.
    const region = container.querySelector(".snui-segmented__error");
    expect(region).not.toBeNull();
    expect(region).toBeEmptyDOMElement();
    expect(
      screen.getByRole("radiogroup", { name: "Units" }),
    ).not.toHaveAttribute("aria-errormessage");
  });
});

describe("SegmentedControl", () => {
  const DISPLAY_MODES = [
    { label: "Auto", value: "auto" },
    { label: "Light", value: "light", disabled: true },
    { label: "Dark", value: "dark" },
    { label: "Night", value: "night" },
  ] as const;

  function ControlledControl({
    initial = "auto",
  }: {
    readonly initial?: ThemeChoice;
  }): React.JSX.Element {
    const [value, setValue] = useState<ThemeChoice>(initial);

    return (
      <SegmentedControl
        label="Display mode"
        value={value}
        onValueChange={setValue}
        options={DISPLAY_MODES}
      />
    );
  }

  it("uses radio semantics and supports roving arrow-key selection", async () => {
    const user = userEvent.setup();
    render(<ControlledControl />);

    const auto = screen.getByRole("radio", { name: "Auto" });
    auto.focus();
    await user.keyboard("{ArrowRight}");

    const dark = screen.getByRole("radio", { name: "Dark" });
    expect(dark).toHaveAttribute("aria-checked", "true");
    expect(dark).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{Home}");
    expect(auto).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Light" })).toBeDisabled();
  });

  it("moves backward from a disabled selected option", async () => {
    const user = userEvent.setup();

    render(<ControlledControl initial="light" />);
    const auto = screen.getByRole("radio", { name: "Auto" });
    expect(auto).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    auto.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("reverses horizontal arrow navigation in right-to-left layouts", () => {
    render(
      <div dir="rtl">
        <ControlledControl />
      </div>,
    );

    const auto = screen.getByRole("radio", { name: "Auto" });
    auto.focus();
    fireEvent.keyDown(auto, { key: "ArrowRight" });

    expect(screen.getByRole("radio", { name: "Night" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("forwards native attributes and a root ref", () => {
    const rootRef = createRef<HTMLDivElement>();
    render(
      <SegmentedControl
        ref={rootRef}
        data-testid="display-mode"
        label="Display mode"
        value="auto"
        onValueChange={() => undefined}
        options={[{ label: "Auto", value: "auto" }]}
      />,
    );

    expect(rootRef.current).toBe(screen.getByTestId("display-mode"));
    expect(rootRef.current).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("rejects a whitespace-only legend", () => {
    expect(() =>
      render(
        <SegmentedControl
          label="  "
          value="auto"
          onValueChange={() => undefined}
          options={[{ label: "Auto", value: "auto" }]}
        />,
      ),
    ).toThrow(
      "signalk-nearlcrews-ui: SegmentedControl requires a non-empty label.",
    );
  });
});
