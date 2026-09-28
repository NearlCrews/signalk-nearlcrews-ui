import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Progress } from "../../src/composites.js";
import { PROGRESS_STYLES } from "../../src/styles/progress.js";
import { ruleBody } from "../css-helpers.js";
import { renderInPanel } from "../helpers.js";

describe("Progress tone and description", () => {
  it("gives a toned bar a glyph and a spoken tone without renaming it", () => {
    const { container } = renderInPanel(
      <Progress label="Chart sync" value={80} tone="danger" />,
    );

    // The name stays what the bar reports, so a panel can still find it.
    const bar = screen.getByRole("progressbar", { name: "Chart sync" });
    expect(bar).toHaveClass("snui-progress--tone-danger");
    expect(container.querySelector(".snui-progress__tone-glyph")).toHaveClass(
      "snui-tone-glyph",
    );
    expect(bar).toHaveAccessibleDescription("Error.");
  });

  it("localizes the tone word", () => {
    renderInPanel(
      <Progress
        label="Chart sync"
        value={80}
        tone="warning"
        toneLabel="Attention"
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Chart sync" }),
    ).toHaveAccessibleDescription("Attention.");
  });

  it("keeps the waiting text of an indeterminate bar reachable", () => {
    renderInPanel(
      <Progress label="Chart sync" valueText="Waiting for the server" />,
    );

    // React Aria emits aria-valuetext only beside a value, so the description
    // is what is left to carry the words.
    const bar = screen.getByRole("progressbar", { name: "Chart sync" });
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(bar).toHaveAccessibleDescription("Waiting for the server");
  });

  it("treats a range it cannot measure as indeterminate", () => {
    renderInPanel(
      <>
        <Progress label="Broken" value={30} max={Number.NaN} />
        <Progress label="Inverted" value={7} min={10} max={5} />
      </>,
    );

    for (const name of ["Broken", "Inverted"]) {
      const bar = screen.getByRole("progressbar", { name });
      expect(bar).toHaveClass("snui-progress--indeterminate");
      expect(bar).not.toHaveAttribute("aria-valuenow");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(bar.querySelector(".snui-progress__fill")).not.toHaveAttribute(
        "style",
      );
    }
  });
});

describe("Progress", () => {
  it("requires a non-empty label", () => {
    expect(() => render(<Progress label="  " value={10} />)).toThrow(
      "signalk-nearlcrews-ui: Progress requires a non-empty label.",
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
    expect(bar).toHaveClass("snui-progress--indeterminate");
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
    expect(bar).toHaveClass("snui-progress--tone-danger");
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

describe("Progress tone glyph", () => {
  it("paints the glyph in its tone and centers it on the label's first line", () => {
    // Only the fill took the tone, so the glyph's shape took the label color.
    // vertical-align: middle centered the glyph on the x-height, a few pixels
    // under the text, and centering the mark on the heading row put it
    // between the lines of a wrapped label. The mark is one line box tall at
    // the top of the row, with the glyph centered inside it.
    const styles = PROGRESS_STYLES.styles;
    expect(
      ruleBody(
        styles,
        ".snui-progress--tone-warning .snui-progress__tone-glyph",
      ),
    ).toContain("color: var(--snui-color-warning);");
    const tone = ruleBody(styles, ".snui-progress__tone");
    expect(tone).toContain("display: flex;");
    expect(tone).toContain("align-self: flex-start;");
    expect(tone).toContain("align-items: center;");
    expect(tone).toContain("block-size: 1lh;");
    expect(tone).not.toContain("align-self: center;");
    expect(styles).not.toMatch(
      /\.snui-progress__tone-glyph\s*\{[^}]*vertical-align/,
    );
  });
});
