import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ToneEchoRegion,
  type ToneEchoRegionProps,
} from "../../src/components/ToneEchoRegion.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { VISUALLY_HIDDEN_CLASS } from "../../src/version.js";
import { advanceTimers, panel, renderInPanel } from "../helpers.js";

/** A polite echo of a warning status, varied only where a spec says. */
function echo(
  children: React.ReactNode,
  props: Partial<Omit<ToneEchoRegionProps, "children">> = {},
): React.JSX.Element {
  return (
    <ToneEchoRegion
      className="snui-status__region"
      defers={false}
      live="polite"
      settleMs={undefined}
      tone="warning"
      toneLabel={undefined}
      {...props}
    >
      {children}
    </ToneEchoRegion>
  );
}

describe("ToneEchoRegion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("speaks the tone's sentence ahead of the content, once", () => {
    renderInPanel(echo("Engine hot"));

    const region = screen.getByRole("status");
    expect(region.tagName).toBe("SPAN");
    expect(region).toHaveClass("snui-status__region", VISUALLY_HIDDEN_CLASS);
    expect(region).toHaveTextContent("Warning. Engine hot");
    expect(region.querySelectorAll(`.${VISUALLY_HIDDEN_CLASS}`)).toHaveLength(
      1,
    );
    // The visible glyph belongs to the owner and stays decorative, so the
    // echo carries no glyph of its own.
    expect(region.querySelector(".snui-tone-glyph")).toBeNull();
  });

  it("waits empty, without the tone, while there is nothing to say", () => {
    renderInPanel(echo(null, { defers: true }));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    // An empty region has no first message to hold.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("holds the content it mounts with for a beat when the owner defers", () => {
    renderInPanel(echo("Engine hot", { defers: true }));

    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    advanceTimers(LIVE_REGION_BLANK_MS);
    expect(region).toHaveTextContent("Warning. Engine hot");
  });

  it("speaks a changed status only once it settles", () => {
    const view = renderInPanel(echo("Engine warm", { settleMs: 500 }));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Warning. Engine warm");

    view.rerender(panel(echo("Engine hot", { settleMs: 500 })));
    expect(region).toBeEmptyDOMElement();

    advanceTimers(500);
    expect(region).toHaveTextContent("Warning. Engine hot");
  });

  it("names the tone with the label the owner passes", () => {
    renderInPanel(echo("Engine hot", { toneLabel: "Caution" }));

    expect(screen.getByRole("status")).toHaveTextContent("Caution. Engine hot");
  });

  it("speaks a neutral status without a tone sentence", () => {
    renderInPanel(echo("Idle", { tone: "neutral" }));

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Idle");
    expect(region.querySelector(`.${VISUALLY_HIDDEN_CLASS}`)).toBeNull();
  });

  it("follows the mode and the role the owner resolved", () => {
    const { container } = renderInPanel(
      <>
        {echo("Engine hot", { live: "off" })}
        {echo("Bilge high", { role: "alert", tone: "danger" })}
      </>,
    );

    const [silent, alert] = container.querySelectorAll(".snui-status__region");
    expect(silent).toHaveAttribute("aria-live", "off");
    expect(silent).toHaveTextContent("Warning. Engine hot");
    expect(alert).toBe(screen.getByRole("alert"));
    expect(alert).toHaveTextContent("Error. Bilge high");
    expect(alert).not.toHaveAttribute("aria-live");
  });

  it("re-announces the same words when the announce key changes", () => {
    const view = renderInPanel(echo("Engine hot", { announceKey: 1 }));
    const region = screen.getByRole("status");

    view.rerender(panel(echo("Engine hot", { announceKey: 2 })));
    expect(region).toBeEmptyDOMElement();

    advanceTimers(LIVE_REGION_BLANK_MS);
    expect(region).toHaveTextContent("Warning. Engine hot");
  });
});
