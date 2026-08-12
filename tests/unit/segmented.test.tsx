import { act, fireEvent, render, screen } from "@testing-library/react";
import * as ReactActual from "react";
import { createRef } from "react";
import * as JSXDevRuntime from "react/jsx-dev-runtime";
import * as JSXRuntime from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "../../src/index.js";

const OPTIONS = [
  { label: "Metric", value: "metric" },
  { label: "Imperial", value: "imperial" },
  { label: "Nautical", value: "nautical" },
] as const;

const noop = (): void => undefined;

describe("SegmentedControl selection modes", () => {
  it("selects options in uncontrolled mode from defaultValue", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        legend="Units"
        defaultValue="metric"
        onChange={onChange}
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
        legend="Units"
        name="units"
        onChange={onChange}
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
        legend="Units"
        value="metric"
        onChange={onChange}
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
        legend="Units"
        value="imperial"
        onChange={onChange}
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
          legend="Units"
          name="units"
          defaultValue="metric"
          onChange={noop}
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
        legend="Units"
        defaultValue="metric"
        onChange={noop}
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
          legend="Units"
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
          legend="Units"
          name="units"
          defaultValue="metric"
          onChange={noop}
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

  it("leaves a controlled selection to the parent on form reset", () => {
    render(
      <form data-testid="units-form">
        <SegmentedControl
          legend="Units"
          name="units"
          value="imperial"
          onChange={noop}
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
  });
});

describe("SegmentedControl legend visibility", () => {
  it("keeps the legend visually hidden by default", () => {
    render(
      <SegmentedControl
        legend="Units"
        value="metric"
        onChange={noop}
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
        legend="Units"
        legendVisibility="visible"
        value="metric"
        onChange={noop}
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
        legend="Units"
        orientation="vertical"
        defaultValue="metric"
        onChange={onChange}
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
        legend="Units"
        defaultValue="metric"
        onChange={onChange}
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
        legend="Units"
        defaultValue="metric"
        onChange={onChange}
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
          legend="Units"
          defaultValue="metric"
          onChange={onChange}
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
        legend="Units"
        value="metric"
        onChange={noop}
        options={OPTIONS}
      />,
    );

    expect(ref.current).toBe(screen.getByRole("radiogroup", { name: "Units" }));
  });
});
