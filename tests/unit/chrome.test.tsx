import { act, render, screen, waitFor } from "@testing-library/react";
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
import { installVisualViewport, renderInPanel } from "../helpers.js";

describe("chrome primitives", () => {
  it("renders a neutral banner without a tone glyph or label", () => {
    const { container } = renderInPanel(
      <Banner tone="neutral">Stored values stay in SI units.</Banner>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner).not.toBeNull();
    expect(banner?.querySelector(".snui-banner__tone-icon")).toBeNull();
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Stored values stay in SI units.");
  });

  it("ignores a tone label on a neutral banner", () => {
    const { container } = renderInPanel(
      <Banner tone="neutral" toneLabel="Notice">
        Plain note.
      </Banner>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Plain note.");
  });

  it("drives banner dismissal through the ghost compact button contract", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const { container } = renderInPanel(
      <Banner onDismiss={onDismiss}>Provider notice</Banner>,
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
    renderInPanel(
      <StatusIndicator tone="success" live="polite">
        Connected
      </StatusIndicator>,
    );

    const status = screen.getByRole("status");
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

  it("keeps a caller-supplied role on a status indicator", () => {
    renderInPanel(
      <StatusIndicator role="note" live="polite">
        Connected
      </StatusIndicator>,
    );

    expect(screen.getByRole("note")).not.toHaveAttribute("aria-live");
  });

  it("renders layout primitives on semantic elements with list items wrapped", () => {
    renderInPanel(
      <>
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
      </>,
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
    renderInPanel(
      <>
        <Stack data-testid="plain-stack">Plain</Stack>
        <Stack as="form" data-testid="form-stack" aria-label="Settings">
          Fields
        </Stack>
      </>,
    );

    expect(screen.getByTestId("plain-stack").tagName).toBe("DIV");
    expect(screen.getByTestId("form-stack").tagName).toBe("FORM");
  });

  it("supports space distribution justify options on clusters", () => {
    renderInPanel(
      <>
        <Cluster justify="around" data-testid="around">
          A
        </Cluster>
        <Cluster justify="evenly" data-testid="evenly">
          B
        </Cluster>
      </>,
    );

    expect(screen.getByTestId("around")).toHaveClass(
      "snui-layout--justify-around",
    );
    expect(screen.getByTestId("evenly")).toHaveClass(
      "snui-layout--justify-evenly",
    );
  });

  it("supports compact density and header plus footer slots on cards", () => {
    const { container } = renderInPanel(
      <Card density="compact" header="Engine" footer="Updated just now">
        Revolution content
      </Card>,
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
    const { container } = renderInPanel(
      <Card header={null} footer="">
        Body
      </Card>,
    );

    const card = container.querySelector(".snui-card");
    expect(card).toHaveClass("snui-card--default");
    expect(card?.querySelector(".snui-card__header")).toBeNull();
    expect(card?.querySelector(".snui-card__footer")).toBeNull();
  });

  it("renders the metric unit as a muted suffix on the value", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" unit="m" />,
    );

    const value = container.querySelector(".snui-metric__value");
    expect(value?.querySelector(".snui-metric__unit")).toHaveTextContent("m");
    expect(value).toHaveTextContent("12.4 m");
  });

  it("announces metric values through a polite live region", () => {
    const { container } = renderInPanel(
      <Metric label="Depth" value="12.4" live="polite" />,
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
    const { container } = renderInPanel(
      <>
        <Metric label="Depth" value="12.4" />
        <Metric label="Wind" value="8" live="off" />
      </>,
    );

    const values = container.querySelectorAll(".snui-metric__value");
    expect(values[0]).not.toHaveAttribute("role");
    expect(values[0]).not.toHaveAttribute("aria-live");
    expect(values[1]).not.toHaveAttribute("role");
    expect(values[1]).toHaveAttribute("aria-live", "off");
  });

  it("restricts theme choices to the requested subset", () => {
    renderInPanel(<ThemeToggle choices={["light", "dark"]} />);

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
    const { container } = renderInPanel(
      <>
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
        <ActionBar
          sticky="viewport-bottom"
          data-testid="viewport-bottom-bar"
          actions={<Button>Save</Button>}
        />
        <ActionBar data-testid="plain-bar" actions={<Button>Save</Button>} />
      </>,
    );

    expect(screen.getByTestId("bottom-bar")).toHaveClass(
      "snui-action-bar--sticky-bottom",
    );
    expect(screen.getByTestId("top-bar")).toHaveClass(
      "snui-action-bar--sticky-top",
    );
    expect(screen.getByTestId("viewport-bottom-bar")).toHaveClass(
      "snui-action-bar--sticky-viewport-bottom",
    );
    expect(
      container.querySelector(".snui-action-bar__viewport-anchor"),
    ).toHaveStyle({ "--snui-action-bar-fixed-bottom": "0px" });
    expect(screen.getByTestId("plain-bar").className).not.toContain("sticky");
  });

  it("docks a viewport action bar only between the panel edge and its flow anchor", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });

    let anchorTop = 900;
    let panelTop = 0;
    const { container, unmount } = render(
      <PanelRoot data-testid="viewport-panel">
        <ActionBar
          sticky="viewport-bottom"
          data-testid="viewport-bar"
          actions={<Button>Save</Button>}
        />
      </PanelRoot>,
    );
    const panel = screen.getByTestId("viewport-panel");
    const bar = screen.getByTestId("viewport-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, panelTop, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, anchorTop, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, anchorTop, 560, 60),
    );
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));
    expect(bar).toHaveClass("snui-action-bar--viewport-docked");
    expect(anchor).toHaveStyle({
      "--snui-action-bar-fixed-bottom": "100px",
      "--snui-action-bar-fixed-height": "60px",
      "--snui-action-bar-fixed-left": "120px",
      "--snui-action-bar-fixed-width": "560px",
    });

    anchorTop = 430;
    document.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(anchor).not.toHaveAttribute("data-snui-docked"));
    expect(bar).not.toHaveClass("snui-action-bar--viewport-docked");

    anchorTop = 900;
    panelTop = 650;
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveAttribute("data-snui-docked"));

    unmount();
    restore();
  });

  it("adds scroll margins so a nested sticky action bar never covers focused content", () => {
    renderInPanel(
      <Stack>
        <Button>Earlier action</Button>
        <ActionBar sticky="bottom" actions={<Button>Save</Button>} />
      </Stack>,
    );

    const styles = document.head.querySelector("style[data-snui-styles]");
    expect(styles?.textContent).toContain(
      ".snui-root:has(.snui-action-bar--sticky-bottom) .snui-root__content",
    );
    expect(styles?.textContent).toContain("scroll-margin-block-end");
    expect(styles?.textContent).toContain(
      ".snui-root:has(.snui-action-bar--sticky-top) .snui-root__content",
    );
    expect(styles?.textContent).toContain(".snui-action-bar__viewport-anchor");
    expect(styles?.textContent).toContain(".snui-action-bar--viewport-docked");
    expect(styles?.textContent).toContain("env(safe-area-inset-bottom, 0px)");
    expect(styles?.textContent).toContain("scroll-margin-block-start");
  });

  it("clears focused content when a viewport resize docks the bar", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { container, unmount } = render(
      <PanelRoot data-testid="resize-panel">
        <Button data-testid="resize-focus-target">Earlier action</Button>
        <ActionBar
          sticky="viewport-bottom"
          data-testid="resize-bar"
          actions={<Button>Save</Button>}
        />
      </PanelRoot>,
    );
    const panel = screen.getByTestId("resize-panel");
    const target = screen.getByTestId("resize-focus-target");
    const bar = screen.getByTestId("resize-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, 0, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 500, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          bar.classList.contains("snui-action-bar--viewport-docked")
            ? 340
            : 500,
          560,
          60,
        ),
    );
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(140, 350, 200, 40),
    );
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveAttribute("data-snui-docked"));
    target.focus();
    scrollBy.mockClear();

    Reflect.set(visualViewport, "height", 400);
    visualViewport.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));
    await waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 }),
    );

    unmount();
    restore();
  });

  it("propagates focus clearance after a nested scroller saturates", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { container, unmount } = render(
      <PanelRoot data-testid="focus-panel">
        <Stack>
          <div data-testid="nested-scroll" style={{ overflowY: "auto" }}>
            <Button data-testid="covered-target">Earlier action</Button>
          </div>
          <ActionBar
            sticky="viewport-bottom"
            data-testid="focus-bar"
            actions={<Button>Save</Button>}
          />
        </Stack>
      </PanelRoot>,
    );
    const panel = screen.getByTestId("focus-panel");
    const nestedScroller = screen.getByTestId("nested-scroll");
    const target = screen.getByTestId("covered-target");
    const bar = screen.getByTestId("focus-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, 0, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 900, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          bar.classList.contains("snui-action-bar--viewport-docked")
            ? 440
            : 900,
          560,
          60,
        ),
    );
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(140, 450, 200, 40),
    );
    Object.defineProperties(nestedScroller, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 90, writable: true },
    });
    const nestedScrollBy = vi.fn(({ top = 0 }: ScrollToOptions): void => {
      nestedScroller.scrollTop += top;
    });
    Object.defineProperty(nestedScroller, "scrollBy", {
      configurable: true,
      value: nestedScrollBy,
    });
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));
    target.focus();

    expect(nestedScrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 10 });
    expect(nestedScroller.scrollTop).toBe(100);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 40 });

    target.blur();
    nestedScrollBy.mockClear();
    scrollBy.mockClear();
    target.focus();

    expect(nestedScrollBy).not.toHaveBeenCalled();
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 });

    unmount();
    restore();
  });

  it("keeps focused content inside a nested scroller while clearing the bar", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 560 });
    let outerScroll = 0;
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation((optionsOrX: ScrollToOptions | number, y = 0) => {
        outerScroll +=
          typeof optionsOrX === "number" ? y : (optionsOrX.top ?? 0);
      });

    const { container, unmount } = render(
      <PanelRoot data-testid="clipping-panel">
        <Stack>
          <div data-testid="clipping-scroll" style={{ overflowY: "auto" }}>
            <Button data-testid="clipping-target">Earlier action</Button>
          </div>
          <ActionBar
            sticky="viewport-bottom"
            data-testid="clipping-bar"
            style={{ paddingBlockStart: 4 }}
            actions={<Button>Save</Button>}
          />
        </Stack>
      </PanelRoot>,
    );
    const panel = screen.getByTestId("clipping-panel");
    const nestedScroller = screen.getByTestId("clipping-scroll");
    const target = screen.getByTestId("clipping-target");
    const bar = screen.getByTestId("clipping-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, -outerScroll, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 900 - outerScroll, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          bar.classList.contains("snui-action-bar--viewport-docked")
            ? 500
            : 900 - outerScroll,
          560,
          60,
        ),
    );
    vi.spyOn(nestedScroller, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 500 - outerScroll, 560, 100),
    );
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(140, 510 - nestedScroller.scrollTop - outerScroll, 200, 40),
    );
    Object.defineProperties(nestedScroller, {
      clientHeight: { configurable: true, value: 100 },
      clientTop: { configurable: true, value: 0 },
      scrollHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    const nestedScrollBy = vi.fn(({ top = 0 }: ScrollToOptions): void => {
      nestedScroller.scrollTop += top;
    });
    Object.defineProperty(nestedScroller, "scrollBy", {
      configurable: true,
      value: nestedScrollBy,
    });
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));
    target.focus();

    expect(nestedScrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 6 });
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 48 });
    const targetRect = target.getBoundingClientRect();
    const scrollerRect = nestedScroller.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    expect(targetRect.top).toBeGreaterThanOrEqual(scrollerRect.top + 4);
    expect(targetRect.bottom).toBeLessThanOrEqual(scrollerRect.bottom);
    expect(targetRect.bottom).toBeLessThanOrEqual(barRect.top);

    unmount();
    restore();
  });

  it("holds focus clearance until a pointer press releases", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { container, unmount } = render(
      <PanelRoot data-testid="press-panel">
        <Button data-testid="press-target">Earlier action</Button>
        <ActionBar
          sticky="viewport-bottom"
          data-testid="press-bar"
          actions={<Button>Save</Button>}
        />
      </PanelRoot>,
    );
    const panel = screen.getByTestId("press-panel");
    const target = screen.getByTestId("press-target");
    const bar = screen.getByTestId("press-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, 0, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 900, 560, 60),
    );
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          bar.classList.contains("snui-action-bar--viewport-docked")
            ? 440
            : 900,
          560,
          60,
        ),
    );
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(140, 450, 200, 40),
    );
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveAttribute("data-snui-docked"));

    // A press focuses its target before the release lands. Scrolling now would
    // move the control out from under the pointer and the click would never
    // reach it.
    document.dispatchEvent(new Event("pointerdown"));
    target.focus();
    expect(scrollBy).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("pointerup"));
    await waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 }),
    );

    // Key input recovers the deferral even when no release ever arrives.
    scrollBy.mockClear();
    document.dispatchEvent(new Event("pointerdown"));
    document.dispatchEvent(new Event("keydown"));
    target.blur();
    target.focus();
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 });

    unmount();
    restore();
  });

  it("settles a docking geometry that alternates within a frame budget", () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );

    const { container, unmount } = render(
      <PanelRoot data-testid="settle-panel">
        <ActionBar
          sticky="viewport-bottom"
          data-testid="settle-bar"
          actions={<Button>Save</Button>}
        />
      </PanelRoot>,
    );
    const panel = screen.getByTestId("settle-panel");
    const bar = screen.getByTestId("settle-bar");
    const anchor = container.querySelector<HTMLElement>(
      ".snui-action-bar__viewport-anchor",
    );
    const safeAreaProbe = container.querySelector<HTMLElement>(
      ".snui-action-bar__safe-area-probe",
    );
    expect(anchor).not.toBeNull();
    expect(safeAreaProbe).not.toBeNull();
    if (anchor === null || safeAreaProbe === null) return;

    vi.spyOn(panel, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(100, 0, 600, 1_200),
    );
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(120, 500, 560, 60),
    );
    // Docking changes the bar's wrapping, and the shorter docked bar undocks
    // itself again. The measurement chain has to stop even though no geometry
    // ever holds still.
    vi.spyOn(bar, "getBoundingClientRect").mockImplementation(
      () =>
        new DOMRect(
          120,
          500,
          560,
          bar.classList.contains("snui-action-bar--viewport-docked") ? 60 : 120,
        ),
    );
    vi.spyOn(safeAreaProbe, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(800, 600, 0, 0),
    );

    const frameBudget = 12;
    let flushed = 0;
    visualViewport.dispatchEvent(new Event("resize"));
    while (frames.length > 0 && flushed < frameBudget) {
      const pending = frames.splice(0, frames.length);
      flushed += 1;
      act(() => {
        for (const frame of pending) frame(0);
      });
    }

    expect(flushed).toBeGreaterThan(1);
    expect(frames).toHaveLength(0);

    unmount();
    restore();
  });
});
