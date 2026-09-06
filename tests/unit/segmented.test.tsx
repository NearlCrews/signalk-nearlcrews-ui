import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactActual from "react";
import { createRef } from "react";
import * as JSXDevRuntime from "react/jsx-dev-runtime";
import * as JSXRuntime from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";

import { CollapsibleSection, SegmentedControl } from "../../src/index.js";

const OPTIONS = [
  { label: "Metric", value: "metric" },
  { label: "Imperial", value: "imperial" },
  { label: "Nautical", value: "nautical" },
] as const;

const noop = (): void => undefined;

describe("SegmentedControl option validation", () => {
  it("rejects an empty option collection", () => {
    expect(() =>
      render(
        <SegmentedControl label="Units" options={[]} onValueChange={noop} />,
      ),
    ).toThrow("SegmentedControl requires at least one option.");
  });

  it("rejects options without an accessible label", () => {
    expect(() =>
      render(
        <SegmentedControl
          label="Units"
          options={[{ label: "  ", value: "metric" }]}
          onValueChange={noop}
        />,
      ),
    ).toThrow("SegmentedControl options require non-empty labels.");
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
          onValueChange={noop}
        />,
      ),
    ).toThrow(
      'SegmentedControl option values must be unique; received duplicate value "metric".',
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
          onValueChange={noop}
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
        onValueChange={noop}
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

  it("restores the defaultValue selection on form reset", () => {
    render(
      <form data-testid="units-form">
        <SegmentedControl
          label="Units"
          name="units"
          defaultValue="metric"
          onValueChange={noop}
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
    act(() => {
      form.reset();
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
          onValueChange={noop}
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
            onValueChange={noop}
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

describe("SegmentedControl label and value callbacks", () => {
  it("names the group from label and falls back to the deprecated legend", () => {
    render(
      <>
        <SegmentedControl label="Units" options={OPTIONS} />
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep naming the group */}
        <SegmentedControl legend="Legacy units" options={OPTIONS} />
      </>,
    );

    expect(screen.getByRole("radiogroup", { name: "Units" })).toBeVisible();
    expect(
      screen.getByRole("radiogroup", { name: "Legacy units" }),
    ).toBeVisible();
  });

  it("rejects a control with neither label nor legend content", () => {
    expect(() =>
      render(<SegmentedControl label="  " options={OPTIONS} />),
    ).toThrow("SegmentedControl requires a non-empty label.");
  });

  it("reports the value through onValueChange beside the deprecated onChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        options={OPTIONS}
        onValueChange={onValueChange}
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep firing
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Nautical" }));
    expect(onValueChange).toHaveBeenCalledWith("nautical");
    expect(onChange).toHaveBeenCalledWith("nautical");
  });

  it("shows the label through labelVisibility and the deprecated legendVisibility", () => {
    render(
      <>
        <SegmentedControl
          label="Units"
          labelVisibility="visible"
          options={OPTIONS}
        />
        <SegmentedControl
          label="Legacy units"
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- the alias must keep showing the label
          legendVisibility="visible"
          options={OPTIONS}
        />
      </>,
    );

    expect(screen.getByText("Units")).toHaveClass("snui-segmented__legend");
    expect(screen.getByText("Legacy units")).toHaveClass(
      "snui-segmented__legend",
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
          onValueChange={noop}
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
    render(
      <SegmentedControl
        label="Units"
        value="metric"
        onValueChange={noop}
        options={OPTIONS}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Units" });
    expect(group.querySelector(".snui-segmented__legend")).toBeNull();
    expect(group.querySelector(".snui-visually-hidden")).toHaveTextContent(
      "Units",
    );
  });

  it("shows the legend when legendVisibility is visible", () => {
    render(
      <SegmentedControl
        label="Units"
        labelVisibility="visible"
        value="metric"
        onValueChange={noop}
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
  it("maps arrow keys to the vertical axis in vertical orientation", () => {
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

    // Horizontal arrows are inert in vertical mode.
    onChange.mockClear();
    fireEvent.keyDown(metric, { key: "ArrowLeft" });
    fireEvent.keyDown(metric, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();

    // Home and End stay active in both orientations.
    fireEvent.keyDown(metric, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("nautical");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Nautical" }), {
      key: "Home",
    });
    expect(onChange).toHaveBeenCalledWith("metric");
  });

  it("ignores vertical arrow keys in horizontal orientation", () => {
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
    fireEvent.keyDown(metric, { key: "ArrowDown" });
    fireEvent.keyDown(metric, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
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
      vi.unstubAllGlobals();
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
        onValueChange={noop}
        options={OPTIONS}
      />,
    );

    expect(ref.current).toBe(screen.getByRole("radiogroup", { name: "Units" }));
  });
});
