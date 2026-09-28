import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ActionBar,
  type ActionBarProps,
  Button,
  PanelRoot,
  Stack,
  StatusIndicator,
} from "../../src/index.js";
import { COMPONENT_STYLES } from "../../src/styles/components.js";
import { NARROW_PANEL_QUERY } from "../../src/styles/fragments.js";
import { ruleBody } from "../css-helpers.js";
import {
  flushAnimationFrames,
  headSheets,
  installVisualViewport,
  ROOT_SHEET,
  renderInPanel,
  stubAnimationFrames,
} from "../helpers.js";

/** The class the viewport anchor carries while its bar is docked. */
const DOCKED_ANCHOR = "snui-action-bar__viewport-anchor--docked";

/** A rectangle a spec pins on an element, read fresh at every measurement. */
type ElementRect = () => DOMRect;

/** No safe-area inset: the probe sits well outside the measured viewport. */
const OUTSIDE_THE_VIEWPORT: ElementRect = () => new DOMRect(800, 600, 0, 0);

/** A panel whose top edge sits at the top of the viewport. */
const PANEL_AT_TOP: ElementRect = () => new DOMRect(100, 0, 600, 1_200);

/** The elements an ActionBar renders for its own viewport docking. */
interface ActionBarParts {
  readonly anchor: HTMLElement;
  readonly safeAreaProbe: HTMLElement;
}

/**
 * Reads the two elements the docking logic measures for itself, named once so
 * a change to what ActionBar renders is one edit rather than one per spec.
 */
function actionBarParts(container: HTMLElement): ActionBarParts {
  const anchor = container.querySelector<HTMLElement>(
    ".snui-action-bar__viewport-anchor",
  );
  const safeAreaProbe = container.querySelector<HTMLElement>(
    ".snui-action-bar__safe-area-probe",
  );
  if (anchor === null || safeAreaProbe === null) {
    throw new Error(
      "The action bar rendered no viewport anchor or safe-area probe.",
    );
  }
  return { anchor, safeAreaProbe };
}

/**
 * Pins a rectangle on every element a docking spec measures, because jsdom
 * lays nothing out. Each rectangle is a function, so a spec can move an
 * element between measurements by changing what it returns.
 */
function mockActionBarGeometry(
  geometry: readonly (readonly [HTMLElement, ElementRect])[],
): void {
  for (const [element, rect] of geometry) {
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(rect);
  }
}

function isDocked(bar: HTMLElement): boolean {
  return bar.classList.contains("snui-action-bar--viewport-docked");
}

/** The bar's own rectangle, whose top depends on whether it is docked. */
function barRect(
  bar: HTMLElement,
  top: (docked: boolean) => number,
): ElementRect {
  return () => new DOMRect(120, top(isDocked(bar)), 560, 60);
}

/** A docking bar rendered in a panel, with every element a spec measures. */
interface DockingBar extends ActionBarParts {
  readonly bar: HTMLElement;
  readonly panel: HTMLElement;
  readonly unmount: () => void;
}

/** Renders a viewport-docking bar after `leading`, in the stack a panel uses. */
function renderDockingBar(
  leading?: ReactNode,
  barProps: Partial<ActionBarProps> = {},
): DockingBar {
  const { container, unmount } = render(
    <PanelRoot data-testid="docking-panel">
      <Stack>
        {leading}
        <ActionBar
          sticky="viewport-bottom"
          data-testid="docking-bar"
          actions={<Button>Save</Button>}
          {...barProps}
        />
      </Stack>
    </PanelRoot>,
  );
  return {
    ...actionBarParts(container),
    bar: screen.getByTestId("docking-bar"),
    panel: screen.getByTestId("docking-panel"),
    unmount,
  };
}

/**
 * A docked bar over a control inside a nested scroller that has ten pixels of
 * scroll left, so clearing the control saturates the scroller and hands the
 * rest of the distance to the window.
 */
function renderSaturatingScroller(): DockingBar & {
  readonly nestedScroller: HTMLElement;
  readonly target: HTMLElement;
} {
  const docking = renderDockingBar(
    <div data-testid="nested-scroll" style={{ overflowY: "auto" }}>
      <Button data-testid="covered-target">Earlier action</Button>
    </div>,
  );
  const nestedScroller = screen.getByTestId("nested-scroll");
  const target = screen.getByTestId("covered-target");

  mockActionBarGeometry([
    [docking.panel, PANEL_AT_TOP],
    [docking.anchor, () => new DOMRect(120, 900, 560, 60)],
    [docking.bar, barRect(docking.bar, (docked) => (docked ? 440 : 900))],
    [target, () => new DOMRect(140, 450, 200, 40)],
    [docking.safeAreaProbe, OUTSIDE_THE_VIEWPORT],
  ]);
  Object.defineProperties(nestedScroller, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 200 },
    scrollTop: { configurable: true, value: 90, writable: true },
  });
  return { ...docking, nestedScroller, target };
}

describe("ActionBar contract", () => {
  it("hands its bar element to a consumer ref and releases it on unmount", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = renderInPanel(
      <ActionBar ref={ref} actions={<Button>Save</Button>} />,
    );

    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveClass("snui-action-bar");
    expect(ref.current?.isConnected).toBe(true);

    unmount();
    expect(ref.current).toBeNull();
  });

  it("hands the docked bar element to a consumer ref as well", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = renderInPanel(
      <ActionBar
        ref={ref}
        sticky="viewport-bottom"
        actions={<Button>Save</Button>}
      />,
    );

    expect(ref.current).toHaveClass("snui-action-bar--sticky-viewport-bottom");

    unmount();
    expect(ref.current).toBeNull();
  });

  it("marks the bar and its status for a browser test to find", () => {
    const { container } = renderInPanel(
      <ActionBar status="Nothing to save" actions={<Button>Save</Button>} />,
    );

    const bar = container.querySelector("[data-snui-action-bar]");
    expect(bar).toHaveClass("snui-action-bar");
    expect(
      bar?.querySelector("[data-snui-action-bar-status]"),
    ).toHaveTextContent("Nothing to save");
  });

  it("renders a toolbar band with a free content slot", () => {
    const { container } = renderInPanel(
      <ActionBar
        variant="toolbar"
        role="region"
        aria-label="Panel controls"
        status="12 conversions"
        actions={<Button>Add</Button>}
      >
        <input aria-label="Search conversions" type="search" />
      </ActionBar>,
    );

    expect(screen.getByRole("region", { name: "Panel controls" })).toHaveClass(
      "snui-action-bar--toolbar",
    );
    expect(
      container.querySelector(".snui-action-bar__content"),
    ).toContainElement(screen.getByLabelText("Search conversions"));
  });

  it("reports a docking bar rendered outside a panel root", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <ActionBar sticky="viewport-bottom" actions={<Button>Save</Button>} />,
    );

    // Without a root the bar cannot measure anything, so it renders as
    // ordinary flow content and would otherwise say nothing about it.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("found no PanelRoot ancestor"),
    );
  });

  it("rejects a bar with no action", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderInPanel(<ActionBar actions={null} />)).toThrow(
      "signalk-nearlcrews-ui: ActionBar requires at least one action.",
    );
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
    // The mode is also published as a supported hook, so a consumer test
    // stops asserting a private class name.
    expect(screen.getByTestId("bottom-bar")).toHaveAttribute(
      "data-snui-sticky",
      "bottom",
    );
    expect(screen.getByTestId("top-bar")).toHaveAttribute(
      "data-snui-sticky",
      "top",
    );
    expect(screen.getByTestId("viewport-bottom-bar")).toHaveAttribute(
      "data-snui-sticky",
      "viewport-bottom",
    );
    expect(screen.getByTestId("viewport-bottom-bar")).not.toHaveAttribute(
      "data-snui-docked",
    );
    expect(screen.getByTestId("plain-bar")).not.toHaveAttribute(
      "data-snui-sticky",
    );
    expect(actionBarParts(container).anchor).toHaveStyle({
      "--snui-action-bar-fixed-bottom": "0px",
    });
    expect(screen.getByTestId("plain-bar").className).not.toContain("sticky");
  });

  it("adds scroll margins so a nested sticky action bar never covers focused content", () => {
    renderInPanel(
      <Stack>
        <Button>Earlier action</Button>
        <ActionBar sticky="bottom" actions={<Button>Save</Button>} />
      </Stack>,
    );

    const [styles] = headSheets(ROOT_SHEET);
    // The panel root is `:scope` here: the sheet is scoped to it, so the bare
    // class would name a descendant root and the rule would reach nothing.
    expect(styles?.textContent).toContain(
      ":scope:has(.snui-action-bar--sticky-bottom) .snui-root__content",
    );
    expect(styles?.textContent).toContain("scroll-margin-block-end");
    expect(styles?.textContent).toContain(
      ":scope:has(.snui-action-bar--sticky-top) .snui-root__content",
    );
    expect(styles?.textContent).toContain(".snui-action-bar__viewport-anchor");
    expect(styles?.textContent).toContain(".snui-action-bar--viewport-docked");
    expect(styles?.textContent).toContain("env(safe-area-inset-bottom, 0px)");
    expect(styles?.textContent).toContain("scroll-margin-block-start");
  });
});

describe("ActionBar viewport docking", () => {
  it("docks a viewport action bar only between the panel edge and its flow anchor", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });

    let anchorTop = 900;
    let panelTop = 0;
    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar();

    mockActionBarGeometry([
      [panel, () => new DOMRect(100, panelTop, 600, 1_200)],
      [anchor, () => new DOMRect(120, anchorTop, 560, 60)],
      [bar, () => new DOMRect(120, anchorTop, 560, 60)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    expect(bar).toHaveClass("snui-action-bar--viewport-docked");
    // The supported hooks sit on the bar itself, so a consumer test reads the
    // docking state from the element it already found by its own hook, and
    // the hook names one element: the anchor around the bar does not repeat
    // it, or a selector for the documented name would find the anchor first.
    expect(bar).toHaveAttribute("data-snui-docked", "");
    expect(anchor).not.toHaveAttribute("data-snui-docked");
    expect(bar).toHaveAttribute("data-snui-sticky", "viewport-bottom");
    expect(anchor).toHaveStyle({
      "--snui-action-bar-fixed-bottom": "100px",
      "--snui-action-bar-fixed-height": "60px",
      "--snui-action-bar-fixed-left": "120px",
      "--snui-action-bar-fixed-width": "560px",
    });

    anchorTop = 430;
    document.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    expect(bar).not.toHaveClass("snui-action-bar--viewport-docked");
    expect(bar).not.toHaveAttribute("data-snui-docked");
    expect(bar).toHaveAttribute("data-snui-sticky", "viewport-bottom");

    anchorTop = 900;
    panelTop = 650;
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));

    unmount();
    restore();
  });

  it("clears focused content when a viewport resize docks the bar", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="resize-focus-target">Earlier action</Button>,
    );
    const target = screen.getByTestId("resize-focus-target");

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 500, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? 340 : 500))],
      [target, () => new DOMRect(140, 350, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    target.focus();
    scrollBy.mockClear();

    Reflect.set(visualViewport, "height", 400);
    visualViewport.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    await waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 }),
    );

    unmount();
    restore();
  });

  it("leaves focus the reader scrolled away from when scrolling docks the bar", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="left-behind">Last theme</Button>,
    );
    const target = screen.getByTestId("left-behind");
    let anchorTop = 430;
    let targetTop = 380;

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, anchorTop, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? 440 : anchorTop))],
      [target, () => new DOMRect(140, targetTop, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    target.focus();
    scrollBy.mockClear();

    // The reader scrolls up with focus left on a control near the end, which
    // moves the anchor below the fold and docks the bar. The control is now
    // off screen below the bar, not under it, so pulling it back would undo
    // the reader's own scroll.
    anchorTop = 1_030;
    targetTop = 980;
    document.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(target).toHaveFocus();

    unmount();
    restore();
  });

  it("leaves focus alone when a touch toolbar resizes the viewport during that scroll", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    let scrollOffset = 1_200;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollOffset);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="left-behind">Last theme</Button>,
    );
    const target = screen.getByTestId("left-behind");
    let anchorTop = 430;
    let targetTop = 380;

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, anchorTop, 560, 60)],
      [
        bar,
        barRect(bar, (docked) =>
          docked ? visualViewport.height - 60 : anchorTop,
        ),
      ],
      [target, () => new DOMRect(140, targetTop, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    target.focus();
    scrollBy.mockClear();

    // Scrolling up on a phone or tablet brings the browser's toolbar back,
    // which shortens the visual viewport in the same moment. The page did
    // scroll, so this is still the reader leaving the control, not the
    // viewport closing over it.
    scrollOffset = 600;
    Reflect.set(visualViewport, "height", 440);
    anchorTop = 1_030;
    targetTop = 980;
    visualViewport.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(target).toHaveFocus();

    unmount();
    restore();
  });

  it("leaves a control scrolled behind the docked bar alone when a toolbar returns later", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    let scrollOffset = 200;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollOffset);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="behind-bar">Last theme</Button>,
    );
    const target = screen.getByTestId("behind-bar");
    let targetTop = 450;

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 900, 560, 60)],
      [
        bar,
        barRect(bar, (docked) => (docked ? visualViewport.height - 60 : 900)),
      ],
      [target, () => new DOMRect(140, targetTop, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    target.focus();

    // The reader scrolls until the control sits wholly behind the docked bar,
    // which hides it as surely as the bottom of the screen does.
    scrollOffset = 90;
    targetTop = 560;
    document.dispatchEvent(new Event("scroll"));
    await flushAnimationFrames();
    scrollBy.mockClear();

    // A touch browser's toolbar then returns in a pass of its own, shortening
    // the viewport with no scroll. The reader scrolled the control out of
    // sight, so the bar does not scroll it back.
    Reflect.set(visualViewport, "height", 550);
    visualViewport.dispatchEvent(new Event("resize"));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(target).toHaveFocus();

    unmount();
    restore();
  });

  it("does not count a control below a shrunken viewport as seen before the bar moves", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    let scrollOffset = 200;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollOffset);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="below-new-edge">Last theme</Button>,
    );
    const target = screen.getByTestId("below-new-edge");
    let targetTop = 450;

    // The docked bar sits where the committed placement put it, against the
    // layout viewport, not where the visual viewport now ends: a keyboard or
    // pinch zoom that shrinks only the visual viewport leaves it there until
    // the pass that measures the change commits a new placement.
    const committedBarTop = (): number =>
      window.innerHeight -
      Number.parseFloat(
        anchor.style.getPropertyValue("--snui-action-bar-fixed-bottom"),
      ) -
      60;
    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 900, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? committedBarTop() : 900))],
      [target, () => new DOMRect(140, targetTop, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    target.focus();
    await flushAnimationFrames();
    scrollBy.mockClear();

    // In one frame the reader scrolls, which moves the control down to 510,
    // and the visual viewport shrinks to 460. The control is below the new
    // viewport bottom though still above the bar's old spot, so it is not on
    // screen, and the scroll the reader made is not undone.
    scrollOffset = 140;
    targetTop = 510;
    Reflect.set(visualViewport, "height", 460);
    visualViewport.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("scroll"));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(target).toHaveFocus();

    unmount();
    restore();
  });

  it("does not credit one control's visible offset to another it never showed", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <>
        <Button data-testid="seen">Seen control</Button>
        <Button data-testid="unseen">Unseen control</Button>
      </>,
    );
    const seen = screen.getByTestId("seen");
    const unseen = screen.getByTestId("unseen");

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 500, 560, 60)],
      [
        bar,
        barRect(bar, (docked) => (docked ? visualViewport.height - 60 : 500)),
      ],
      [seen, () => new DOMRect(140, 350, 200, 40)],
      [unseen, () => new DOMRect(140, 620, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    // The first control is recorded while on screen; focus then moves to one
    // below the fold that was never on screen.
    seen.focus();
    unseen.focus({ preventScroll: true });
    scrollBy.mockClear();

    // The viewport shrinks with no scroll, docking the bar. The offset recorded
    // for the first control says nothing about the second, which the reader
    // never saw, so it is left where it is.
    Reflect.set(visualViewport, "height", 450);
    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(unseen).toHaveFocus();

    unmount();
    restore();
  });

  it("clears focus a shrinking viewport hides after a scroll made while docked", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    let scrollOffset = 0;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollOffset);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="in-view">Earlier action</Button>,
    );
    const target = screen.getByTestId("in-view");
    let targetTop = 450;

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 900, 560, 60)],
      [
        bar,
        barRect(bar, (docked) => (docked ? visualViewport.height - 60 : 900)),
      ],
      [target, () => new DOMRect(140, targetTop, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    target.focus();

    // The reader scrolls a little with the bar already docked. The placement
    // does not change, and the control stays on screen above the bar.
    scrollOffset = 100;
    targetTop = 350;
    document.dispatchEvent(new Event("scroll"));
    await flushAnimationFrames();
    scrollBy.mockClear();

    // Then the viewport shrinks with no scroll, as a smaller window or an
    // on-screen keyboard does, and leaves the control wholly below the bar.
    // The reader was looking at it, so it is brought back above the bar.
    Reflect.set(visualViewport, "height", 300);
    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 150 }),
    );

    unmount();
    restore();
  });

  it("still clears focus a shrinking viewport leaves below the docked bar", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="shrunk-away">Last theme</Button>,
    );
    const target = screen.getByTestId("shrunk-away");

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 500, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? 340 : 500))],
      [target, () => new DOMRect(140, 450, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).not.toHaveClass(DOCKED_ANCHOR));
    target.focus();
    scrollBy.mockClear();

    // The viewport shrinks under the focused control, as an on-screen keyboard
    // or a smaller window does. The reader did not move, so the control they
    // are on is brought back above the bar even though it now sits wholly
    // below it.
    Reflect.set(visualViewport, "height", 400);
    visualViewport.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    await waitFor(() =>
      expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 150 }),
    );

    unmount();
    restore();
  });

  it("propagates focus clearance after a nested scroller saturates", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, nestedScroller, target, unmount } =
      renderSaturatingScroller();
    const nestedScrollBy = vi.fn(({ top = 0 }: ScrollToOptions): void => {
      nestedScroller.scrollTop += top;
    });
    Object.defineProperty(nestedScroller, "scrollBy", {
      configurable: true,
      value: nestedScrollBy,
    });

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
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

  it("scrolls an ancestor that implements no scrollBy", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, nestedScroller, target, unmount } =
      renderSaturatingScroller();
    // An embedded browser whose scrollable elements implement no scrollBy is
    // the case the scrollTop fallback exists for, and jsdom is one.
    expect(typeof (nestedScroller as { scrollBy?: unknown }).scrollBy).not.toBe(
      "function",
    );

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    target.focus();

    // The same ten pixels the scrollBy path reports, applied by hand, and the
    // rest still propagates to the window.
    expect(nestedScroller.scrollTop).toBe(100);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 40 });

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

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <div data-testid="clipping-scroll" style={{ overflowY: "auto" }}>
        <Button data-testid="clipping-target">Earlier action</Button>
      </div>,
      { style: { paddingBlockStart: 4 } },
    );
    const nestedScroller = screen.getByTestId("clipping-scroll");
    const target = screen.getByTestId("clipping-target");

    mockActionBarGeometry([
      [panel, () => new DOMRect(100, -outerScroll, 600, 1_200)],
      [anchor, () => new DOMRect(120, 900 - outerScroll, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? 500 : 900 - outerScroll))],
      [nestedScroller, () => new DOMRect(120, 500 - outerScroll, 560, 100)],
      [
        target,
        () =>
          new DOMRect(
            140,
            510 - nestedScroller.scrollTop - outerScroll,
            200,
            40,
          ),
      ],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);
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

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));
    target.focus();

    expect(nestedScrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 6 });
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 48 });
    const targetRect = target.getBoundingClientRect();
    const scrollerRect = nestedScroller.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    expect(targetRect.top).toBeGreaterThanOrEqual(scrollerRect.top + 4);
    expect(targetRect.bottom).toBeLessThanOrEqual(scrollerRect.bottom);
    expect(targetRect.bottom).toBeLessThanOrEqual(barBox.top);

    unmount();
    restore();
  });

  it("skips focus clearance for a pointer-sourced focus", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar(
      <Button data-testid="press-target">Earlier action</Button>,
    );
    const target = screen.getByTestId("press-target");

    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 900, 560, 60)],
      [bar, barRect(bar, (docked) => (docked ? 440 : 900))],
      [target, () => new DOMRect(140, 450, 200, 40)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));

    // A press focuses its target before the release lands. Scrolling now would
    // move the control out from under the pointer and the click would never
    // reach it, and a scroll after the release would move content under a
    // pointer that is still there, so the clearance is dropped rather than
    // deferred.
    document.dispatchEvent(new Event("pointerdown"));
    target.focus();
    expect(scrollBy).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("pointerup"));
    await flushAnimationFrames();
    expect(scrollBy).not.toHaveBeenCalled();

    // Key input ends the press even when no release ever arrives, so keyboard
    // focus still clears immediately.
    document.dispatchEvent(new Event("pointerdown"));
    document.dispatchEvent(new Event("keydown"));
    target.blur();
    target.focus();
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "auto", top: 50 });

    unmount();
    restore();
  });

  it("settles an alternating docking geometry inside one animation frame", () => {
    const { restore, visualViewport } = installVisualViewport({ height: 600 });

    const { frames } = stubAnimationFrames();

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar();

    // Docking changes the bar's wrapping, and the shorter docked bar undocks
    // itself again. The measurement chain has to stop inside the frame it
    // started in, even though no geometry ever holds still.
    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, 500, 560, 60)],
      [bar, () => new DOMRect(120, 500, 560, isDocked(bar) ? 60 : 120)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

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

    expect(flushed).toBe(1);
    expect(frames).toHaveLength(0);

    unmount();
    restore();
  });

  it("holds a docking state that sits on the threshold", async () => {
    const { restore, visualViewport } = installVisualViewport({ height: 500 });

    const { anchor, bar, panel, safeAreaProbe, unmount } = renderDockingBar();

    // Reserving the bar's height moves the anchor across the dock line by less
    // than the hysteresis band, so the raw predicate answers differently on
    // each side of the change.
    mockActionBarGeometry([
      [panel, PANEL_AT_TOP],
      [anchor, () => new DOMRect(120, isDocked(bar) ? 439.6 : 441.6, 560, 60)],
      [bar, () => new DOMRect(120, 440, 560, 60)],
      [safeAreaProbe, OUTSIDE_THE_VIEWPORT],
    ]);

    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(anchor).toHaveClass(DOCKED_ANCHOR));

    document.dispatchEvent(new Event("scroll"));
    await flushAnimationFrames();
    expect(anchor).toHaveClass(DOCKED_ANCHOR);
    expect(bar).toHaveClass("snui-action-bar--viewport-docked");

    unmount();
    restore();
  });
});

describe("ActionBar layout", () => {
  /** The selector of the rule that sets the shared panel surface inset. */
  const INSET_SURFACES =
    ":is(.snui-section, .snui-collapsible, .snui-action-bar)";

  it("insets its content by the section inset, so it lines up with the sections above", () => {
    // A panel ends with its save bar under a column of sections, so the bar's
    // status and buttons keep the same inline edge as the section content, on
    // a wide panel and on a narrow one. The block padding stays the bar's own,
    // which keeps its height and the docking clearance unchanged.
    const bar = ruleBody(COMPONENT_STYLES, ".snui-action-bar");
    expect(bar).toContain("padding-block: var(--snui-space-3);");
    expect(bar).toContain("padding-inline: var(--snui-section-inset);");
    expect(bar).not.toMatch(/(^|\n)\s*padding:/);
    expect(ruleBody(COMPONENT_STYLES, INSET_SURFACES)).toContain(
      "--snui-section-inset: var(--snui-space-4);",
    );
    const narrow = ruleBody(COMPONENT_STYLES, NARROW_PANEL_QUERY);
    expect(ruleBody(narrow, INSET_SURFACES)).toContain(
      "--snui-section-inset: var(--snui-space-3);",
    );
  });

  it("keeps action state and actions presentational", () => {
    renderInPanel(
      <ActionBar
        status={<StatusIndicator>Unsaved changes</StatusIndicator>}
        actions={<Button variant="primary">Save</Button>}
      />,
    );

    expect(screen.getByText("Unsaved changes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("makes sticky positioning an explicit action-bar option", () => {
    const { container } = renderInPanel(
      <ActionBar sticky="bottom" actions={<Button>Save</Button>} />,
    );

    expect(
      container.querySelector(".snui-action-bar--sticky-bottom"),
    ).not.toBeNull();
    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });

  it("does not create an action-bar status wrapper for false content", () => {
    const { container } = renderInPanel(
      <ActionBar status={false} actions={<Button>Save</Button>} />,
    );

    expect(container.querySelector(".snui-action-bar__status")).toBeNull();
  });
});

describe("ActionBar status focus target", () => {
  it("provides a programmatic action-status focus target", () => {
    const statusRef = createRef<HTMLDivElement>();
    renderInPanel(
      <ActionBar
        statusRef={statusRef}
        status="Configuration saved"
        actions={<Button>Save</Button>}
      />,
    );

    statusRef.current?.focus();
    expect(statusRef.current).toHaveFocus();
    expect(statusRef.current).toHaveAttribute("tabindex", "-1");
  });
});
