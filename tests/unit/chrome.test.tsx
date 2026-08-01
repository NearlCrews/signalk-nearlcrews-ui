import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ActionBar,
  Banner,
  Button,
  Card,
  Cluster,
  Metric,
  MetricGrid,
  PanelRoot,
  Stack,
  StatusIndicator,
  THEME_STORAGE_KEY,
  ThemeToggle,
} from "../../src/index.js";

describe("chrome primitives", () => {
  it("renders a neutral banner without a tone glyph or label", () => {
    const { container } = render(
      <PanelRoot>
        <Banner tone="neutral">Stored values stay in SI units.</Banner>
      </PanelRoot>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner).not.toBeNull();
    expect(banner?.querySelector(".snui-banner__tone-icon")).toBeNull();
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Stored values stay in SI units.");
  });

  it("ignores a tone label on a neutral banner", () => {
    const { container } = render(
      <PanelRoot>
        <Banner tone="neutral" toneLabel="Notice">
          Plain note.
        </Banner>
      </PanelRoot>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Plain note.");
  });

  it("drives banner dismissal through the ghost compact button contract", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const { container } = render(
      <PanelRoot>
        <Banner onDismiss={onDismiss}>Provider notice</Banner>
      </PanelRoot>,
    );

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss).toHaveClass(
      "snui-button",
      "snui-button--ghost",
      "snui-button--size-compact",
    );
    expect(container.querySelector(".snui-banner__dismiss")).toBeNull();

    await user.click(dismiss);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("turns a status indicator into a polite live region on request", () => {
    render(
      <PanelRoot>
        <StatusIndicator tone="success" live="polite">
          Connected
        </StatusIndicator>
      </PanelRoot>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Success. Connected");
    expect(status).not.toHaveAttribute("aria-live");
  });

  it("turns a status indicator into an assertive live region on request", () => {
    render(
      <PanelRoot>
        <StatusIndicator tone="danger" live="assertive">
          Offline
        </StatusIndicator>
      </PanelRoot>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Error. Offline");
  });

  it("stays presentational without a live mode and honors an explicit off", () => {
    const { container } = render(
      <PanelRoot>
        <StatusIndicator>Idle</StatusIndicator>
        <StatusIndicator live="off">Muted</StatusIndicator>
      </PanelRoot>,
    );

    expect(screen.queryByRole("status")).toBeNull();
    const indicators = container.querySelectorAll(".snui-status");
    expect(indicators[0]).not.toHaveAttribute("role");
    expect(indicators[0]).not.toHaveAttribute("aria-live");
    expect(indicators[1]).not.toHaveAttribute("role");
    expect(indicators[1]).toHaveAttribute("aria-live", "off");
  });

  it("keeps a caller-supplied role on a status indicator", () => {
    render(
      <PanelRoot>
        <StatusIndicator role="note" live="polite">
          Connected
        </StatusIndicator>
      </PanelRoot>,
    );

    expect(screen.getByRole("note")).not.toHaveAttribute("aria-live");
  });

  it("renders layout primitives on semantic elements with list items wrapped", () => {
    render(
      <PanelRoot>
        <Stack as="ul" data-testid="stack-list">
          <span>First</span>
          <span>Second</span>
        </Stack>
        <Cluster as="ol" data-testid="cluster-list">
          <span>One</span>
        </Cluster>
        <Card as="section" data-testid="card-section">
          Body
        </Card>
        <MetricGrid as="ul" data-testid="metric-list">
          <Metric label="Depth" value="12" />
          <Metric label="Wind" value="8" />
        </MetricGrid>
      </PanelRoot>,
    );

    const stack = screen.getByTestId("stack-list");
    expect(stack.tagName).toBe("UL");
    expect(stack).toHaveClass("snui-stack");
    expect(stack.querySelectorAll(":scope > li")).toHaveLength(2);

    const cluster = screen.getByTestId("cluster-list");
    expect(cluster.tagName).toBe("OL");
    expect(cluster.querySelectorAll(":scope > li")).toHaveLength(1);

    expect(screen.getByTestId("card-section").tagName).toBe("SECTION");

    const grid = screen.getByTestId("metric-list");
    expect(grid.tagName).toBe("UL");
    expect(grid.querySelectorAll(":scope > li")).toHaveLength(2);
    expect(grid.querySelectorAll(".snui-metric")).toHaveLength(2);
  });

  it("defaults layout primitives to div and supports form stacks", () => {
    render(
      <PanelRoot>
        <Stack data-testid="plain-stack">Plain</Stack>
        <Stack as="form" data-testid="form-stack" aria-label="Settings">
          Fields
        </Stack>
      </PanelRoot>,
    );

    expect(screen.getByTestId("plain-stack").tagName).toBe("DIV");
    expect(screen.getByTestId("form-stack").tagName).toBe("FORM");
  });

  it("supports space distribution justify options on clusters", () => {
    render(
      <PanelRoot>
        <Cluster justify="around" data-testid="around">
          A
        </Cluster>
        <Cluster justify="evenly" data-testid="evenly">
          B
        </Cluster>
      </PanelRoot>,
    );

    expect(screen.getByTestId("around")).toHaveClass(
      "snui-layout--justify-around",
    );
    expect(screen.getByTestId("evenly")).toHaveClass(
      "snui-layout--justify-evenly",
    );
  });

  it("supports compact density and header plus footer slots on cards", () => {
    const { container } = render(
      <PanelRoot>
        <Card density="compact" header="Engine" footer="Updated just now">
          Revolution content
        </Card>
      </PanelRoot>,
    );

    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--compact");
    expect(card?.querySelector(".snui-card__header")).toHaveTextContent(
      "Engine",
    );
    expect(card?.querySelector(".snui-card__footer")).toHaveTextContent(
      "Updated just now",
    );
  });

  it("renders default card density without slot wrappers for empty slots", () => {
    const { container } = render(
      <PanelRoot>
        <Card header={null} footer="">
          Body
        </Card>
      </PanelRoot>,
    );

    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--default");
    expect(card?.querySelector(".snui-card__header")).toBeNull();
    expect(card?.querySelector(".snui-card__footer")).toBeNull();
  });

  it("renders the metric unit as a muted suffix on the value", () => {
    const { container } = render(
      <PanelRoot>
        <Metric label="Depth" value="12.4" unit="m" />
      </PanelRoot>,
    );

    const value = container.querySelector(".snui-metric__value");
    expect(value?.querySelector(".snui-metric__unit")).toHaveTextContent("m");
    expect(value).toHaveTextContent("12.4 m");
  });

  it("announces metric values through a polite live region", () => {
    const { container } = render(
      <PanelRoot>
        <Metric label="Depth" value="12.4" live="polite" />
      </PanelRoot>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveClass("snui-metric__value");
    expect(status).not.toHaveAttribute("aria-live");
    expect(container.querySelector(".snui-metric")).toHaveAttribute(
      "role",
      "group",
    );
  });

  it("keeps metric values inert without a live mode", () => {
    const { container } = render(
      <PanelRoot>
        <Metric label="Depth" value="12.4" />
        <Metric label="Wind" value="8" live="off" />
      </PanelRoot>,
    );

    const values = container.querySelectorAll(".snui-metric__value");
    expect(values[0]).not.toHaveAttribute("role");
    expect(values[0]).not.toHaveAttribute("aria-live");
    expect(values[1]).not.toHaveAttribute("role");
    expect(values[1]).toHaveAttribute("aria-live", "off");
  });

  it("restricts theme choices to the requested subset", () => {
    render(
      <PanelRoot>
        <ThemeToggle choices={["light", "dark"]} />
      </PanelRoot>,
    );

    expect(screen.getByRole("radio", { name: "Light" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeVisible();
    expect(screen.queryByRole("radio", { name: "Auto" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Night" })).toBeNull();
  });

  it("reports theme changes after applying them internally", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PanelRoot data-testid="panel">
        <ThemeToggle onChange={onChange} />
      </PanelRoot>,
    );

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(onChange).toHaveBeenCalledWith("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await waitFor(() => {
      expect(screen.getByTestId("panel")).toHaveAttribute(
        "data-snui-theme",
        "dark",
      );
    });
  });

  it("pins action bars to the requested edge only", () => {
    render(
      <PanelRoot>
        <ActionBar
          sticky="bottom"
          data-testid="bottom-bar"
          actions={<Button>Save</Button>}
        />
        <ActionBar
          sticky="top"
          data-testid="top-bar"
          actions={<Button>Save</Button>}
        />
        <ActionBar data-testid="plain-bar" actions={<Button>Save</Button>} />
      </PanelRoot>,
    );

    expect(screen.getByTestId("bottom-bar")).toHaveClass(
      "snui-action-bar--sticky-bottom",
    );
    expect(screen.getByTestId("top-bar")).toHaveClass(
      "snui-action-bar--sticky-top",
    );
    expect(screen.getByTestId("plain-bar").className).not.toContain("sticky");
  });

  it("adds scroll padding so a sticky action bar never covers focused content", () => {
    render(
      <PanelRoot>
        <ActionBar sticky="bottom" actions={<Button>Save</Button>} />
      </PanelRoot>,
    );

    const styles = document.head.querySelector("style[data-snui-styles]");
    expect(styles?.textContent).toContain(
      ".snui-root:has(> .snui-action-bar--sticky-bottom)",
    );
    expect(styles?.textContent).toContain("scroll-padding-block-end");
    expect(styles?.textContent).toContain(
      ".snui-root:has(> .snui-action-bar--sticky-top)",
    );
    expect(styles?.textContent).toContain("scroll-padding-block-start");
  });
});
