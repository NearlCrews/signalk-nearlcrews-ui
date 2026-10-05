import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusIndicator } from "../../src/index.js";
import { LIVE_REGION_BLANK_MS } from "../../src/utils/repeat-announcement.js";
import { advanceTimers, renderInPanel } from "../helpers.js";

describe("StatusIndicator announcement modes", () => {
  it("turns a status indicator into a polite live region on request", () => {
    vi.useFakeTimers();
    renderInPanel(
      <StatusIndicator tone="success" live="polite">
        Connected
      </StatusIndicator>,
    );

    // A polite region mounted with its words holds them for a beat, so the
    // region exists empty before a screen reader is asked to read it.
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    advanceTimers(LIVE_REGION_BLANK_MS);
    expect(status).toHaveTextContent("Success. Connected");
    expect(status).not.toHaveAttribute("aria-live");
  });

  it("turns a status indicator into an assertive live region on request", () => {
    renderInPanel(
      <StatusIndicator tone="danger" live="assertive">
        Offline
      </StatusIndicator>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Error. Offline");
  });

  it("stays presentational without a live mode and honors an explicit off", () => {
    const { container } = renderInPanel(
      <>
        <StatusIndicator>Idle</StatusIndicator>
        <StatusIndicator live="off">Muted</StatusIndicator>
      </>,
    );

    expect(screen.queryByRole("status")).toBeNull();
    const indicators = container.querySelectorAll(".snui-status");
    expect(indicators[0]).not.toHaveAttribute("role");
    expect(indicators[0]).not.toHaveAttribute("aria-live");
    expect(indicators[1]).not.toHaveAttribute("role");
    expect(indicators[1]).toHaveAttribute("aria-live", "off");
  });

  it("keeps a requested mode beside a role that announces nothing itself", () => {
    renderInPanel(
      <StatusIndicator role="note" live="polite">
        Connected
      </StatusIndicator>,
    );

    // Only alert, log, and status announce on their own, so any other role
    // has to carry the requested aria-live or the update is silent.
    expect(screen.getByRole("note")).toHaveAttribute("aria-live", "polite");
  });
});

describe("StatusIndicator presentation", () => {
  it("renders visible status text alongside its decorative marker", () => {
    renderInPanel(<StatusIndicator tone="success">Connected</StatusIndicator>);

    expect(screen.getByText("Connected")).toBeVisible();
  });
});
