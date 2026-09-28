import { screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Badge, Banner, Metric, StatusIndicator } from "../../src/index.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { TONE_SHAPE_DECLARATIONS } from "../../src/styles/tone-rules.js";
import { ruleBody } from "../css-helpers.js";
import { renderInPanel } from "../helpers.js";
import { announcementOf } from "./lib/announcements.js";

describe("tone marks", () => {
  it("renders the shared glyph and announcement for semantic badges", () => {
    const { container } = renderInPanel(<Badge tone="info">Beta</Badge>);

    const badge = container.querySelector(".snui-badge");
    const glyph = badge?.querySelector(".snui-tone-glyph");
    expect(glyph).toHaveClass("snui-badge__tone-glyph");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(glyph).toHaveTextContent("i");
    expect(announcementOf(badge)).toBe("Information. ");
  });

  it("names the tone on the glyph, so each tone can take its own shape", () => {
    const { container } = renderInPanel(
      <>
        <Badge tone="info">Beta</Badge>
        <Badge tone="success">Healthy</Badge>
        <Badge tone="warning">Drifting</Badge>
        <Badge tone="danger">Lost</Badge>
      </>,
    );

    const glyphs = [...container.querySelectorAll(".snui-tone-glyph")];
    expect(glyphs.map((glyph) => glyph.className)).toEqual(
      ["info", "success", "warning", "danger"].map(
        (tone) =>
          `snui-tone-glyph snui-tone-glyph--${tone} snui-badge__tone-glyph`,
      ),
    );
  });

  it("draws a shape per tone rather than one circle for every tone", () => {
    const glyph = ruleBody(COMPONENT_STYLES, ".snui-tone-glyph");
    // A filled shape with the character knocked out in the surface color:
    // the pair is the tone on the surface, which the contrast suite already
    // holds to text contrast.
    expect(glyph).toContain("background: currentColor;");
    expect(glyph).toContain(
      "-webkit-text-fill-color: var(--snui-color-surface);",
    );
    expect(glyph).not.toContain("border-radius: 50%");
    expect(glyph).not.toContain("border:");
    // Nothing is positioned against the glyph, so it is not a positioned box.
    expect(glyph).not.toContain("position:");

    // The status dots' vocabulary, so a tone reads the same in both marks.
    for (const tone of ["info", "warning", "danger"] as const) {
      expect(ruleBody(COMPONENT_STYLES, `.snui-tone-glyph--${tone}`)).toContain(
        TONE_SHAPE_DECLARATIONS[tone],
      );
    }
    // Success is a heavy check with nothing around it, so it never reads as
    // the slashed circle of "not available". It is cut from the same box the
    // other shapes fill, so it spans that box and its stroke grows with it,
    // rather than a thin border sized to the text.
    const success = ruleBody(COMPONENT_STYLES, ".snui-tone-glyph--success");
    expect(success).toContain(
      "clip-path: polygon(2% 50%, 20% 32%, 38% 50%, 80% 8%, 98% 26%, 38% 88%);",
    );
    expect(success).toContain("-webkit-text-fill-color: transparent;");
    expect(success).not.toContain("background: none");
    expect(COMPONENT_STYLES).not.toContain(".snui-tone-glyph--success::before");
  });

  it("keeps the glyph shapes under forced colors", () => {
    const forced = ruleBody(COMPONENT_STYLES, "@media (forced-colors: active)");
    const glyph = ruleBody(forced, ".snui-tone-glyph");
    // A background-painted shape vanishes when the system repaints
    // backgrounds, so the glyph paints itself in system colors instead.
    expect(glyph).toContain("forced-color-adjust: none;");
    expect(glyph).toContain("background: CanvasText;");
    expect(glyph).toContain("-webkit-text-fill-color: Canvas;");
    expect(glyph).toContain("color: CanvasText;");
    // The check keeps its CanvasText fill; its character stays hidden.
    expect(ruleBody(forced, ".snui-tone-glyph--success")).toContain(
      "-webkit-text-fill-color: transparent;",
    );
  });

  it("ignores a tone label on neutral surfaces everywhere", () => {
    const { container } = renderInPanel(
      <>
        <Badge toneLabel="Idle">Idle</Badge>
        <StatusIndicator toneLabel="Idle">Idle</StatusIndicator>
        <Metric label="Depth" value="12" toneLabel="Idle" />
      </>,
    );

    expect(container.querySelector(".snui-tone-glyph")).toBeNull();
    expect(container.querySelector(".snui-visually-hidden")).toBeNull();
  });

  it("falls back to the default tone name for a blank status label", () => {
    renderInPanel(
      <StatusIndicator
        tone="success"
        toneLabel="  "
        live="polite"
        deferFirstMessage={false}
      >
        Connected
      </StatusIndicator>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Success. Connected");
  });

  it("does not double the stop on a tone label that carries one", () => {
    const { container } = renderInPanel(
      <>
        <Badge tone="warning" toneLabel="Caution!">
          Drifting
        </Badge>
        <Badge tone="danger" toneLabel="Stop">
          Lost
        </Badge>
      </>,
    );

    const [caution, stop] = container.querySelectorAll(".snui-badge");
    expect(announcementOf(caution)).toBe("Caution! ");
    expect(announcementOf(stop)).toBe("Stop. ");
  });

  it("shows the glyph beside the status dot so info and neutral differ", () => {
    const { container } = renderInPanel(
      <>
        <StatusIndicator tone="info">Pending</StatusIndicator>
        <StatusIndicator>Idle</StatusIndicator>
      </>,
    );

    const [info, neutral] = container.querySelectorAll(".snui-status");
    expect(info?.querySelector(".snui-status__dot")).not.toBeNull();
    expect(info?.querySelector(".snui-tone-glyph")).toHaveTextContent("i");
    expect(neutral?.querySelector(".snui-status__dot")).not.toBeNull();
    expect(neutral?.querySelector(".snui-tone-glyph")).toBeNull();
  });

  it("keeps the compact status text accessible while hiding it visually", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = renderInPanel(
      <StatusIndicator
        ref={ref}
        size="compact"
        tone="danger"
        live="polite"
        deferFirstMessage={false}
      >
        Offline
      </StatusIndicator>,
    );

    const status = container.querySelector(".snui-status");
    expect(status).toHaveClass("snui-status--size-compact");
    expect(screen.getByText("Offline")).toHaveClass("snui-visually-hidden");
    expect(status?.querySelector(".snui-status__text")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Error. Offline");
    expect(ref.current).toBe(status);
  });

  it("keeps the banner glyph class alongside the shared mark", () => {
    const { container } = renderInPanel(
      <Banner tone="warning" title="Check the sensor">
        Depth stopped updating.
      </Banner>,
    );

    const icon = container.querySelector(".snui-banner__tone-icon");
    expect(icon).toHaveClass("snui-tone-glyph");
    expect(icon).toHaveTextContent("!");
    expect(
      announcementOf(container.querySelector(".snui-banner__content")),
    ).toBe("Warning. ");
  });
});
