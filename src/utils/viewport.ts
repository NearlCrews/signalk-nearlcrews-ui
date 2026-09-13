/**
 * Viewport measurement shared by the components that position themselves
 * against the visible part of a panel: the toast host and the viewport-docked
 * action bar. Both need the same visual-viewport-aware edges and the same set
 * of change signals, so the arithmetic and the listener wiring live here once.
 */

import { windowGlobal } from "./window-global.js";

/** Edges of the visible viewport in CSS pixels, relative to the layout viewport. */
export interface ViewportEdges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * The visual viewport, which is null while the document is not fully active
 * and absent on an engine or a test environment that implements none, so both
 * spellings of "there is none" are answered the same way.
 */
function getVisualViewport(
  ownerWindow: Window,
): VisualViewport | null | undefined {
  return windowGlobal<VisualViewport | null>(ownerWindow, "visualViewport");
}

function getResizeObserver(
  ownerWindow: Window,
): typeof ResizeObserver | undefined {
  return windowGlobal<typeof ResizeObserver>(ownerWindow, "ResizeObserver");
}

/**
 * Reads the visible viewport edges. The visual viewport shrinks when an
 * on-screen keyboard opens or the page is pinch-zoomed, so its offset and size
 * win over the layout viewport whenever the browser exposes it.
 */
export function readViewportEdges(ownerWindow: Window): ViewportEdges {
  const viewport = getVisualViewport(ownerWindow);
  if (viewport == null) {
    return {
      top: 0,
      right: ownerWindow.innerWidth,
      bottom: ownerWindow.innerHeight,
      left: 0,
    };
  }
  return {
    top: viewport.offsetTop,
    right: viewport.offsetLeft + viewport.width,
    bottom: viewport.offsetTop + viewport.height,
    left: viewport.offsetLeft,
  };
}

/** Rounds a layout measurement to hundredths so equal geometry compares equal. */
export function roundedLayoutValue(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ObservePanelViewportOptions {
  /**
   * Elements whose size changes also invalidate the measurement, beside the
   * panel root itself.
   */
  readonly resizeTargets?: readonly Element[] | undefined;
}

/**
 * Calls `onChange` once per animation frame whenever the visible part of the
 * panel may have moved: a scroll of anything the panel sits inside, a window
 * resize, a visual viewport resize or scroll, or a resize of the panel root or
 * another observed element. The first call is scheduled for the next frame;
 * callers that need a synchronous first measurement take it themselves before
 * observing.
 *
 * The capture-phase document scroll listener already sees every scroll that
 * reaches the window, so no separate window scroll listener is registered. It
 * also sees scrolls that cannot move the panel, a several hundred row grid
 * inside it being the heaviest of them, so a scroll whose target is an element
 * containing neither the panel root nor an observed target is skipped rather
 * than measured on every frame of the gesture.
 *
 * Returns a disposer that cancels the pending frame and removes every
 * listener. Calling `onChange` after disposal never happens.
 */
export function observePanelViewport(
  panelRoot: HTMLElement,
  onChange: () => void,
  options: ObservePanelViewportOptions = {},
): () => void {
  const ownerDocument = panelRoot.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (ownerWindow === null) return () => undefined;

  const visualViewport = getVisualViewport(ownerWindow);
  let animationFrame = 0;
  let disposed = false;

  const measure = (): void => {
    animationFrame = 0;
    if (disposed) return;
    onChange();
  };

  const scheduleMeasure = (): void => {
    if (animationFrame !== 0 || disposed) return;
    animationFrame = ownerWindow.requestAnimationFrame(measure);
  };

  const { resizeTargets } = options;

  // Document and window scrolls carry no element target and always count; an
  // element's scroll only counts when the panel or a measured target moves
  // with it, which is what an ancestor scroller does and an inner one cannot.
  const scheduleForScroll = (event: Event): void => {
    const { target } = event;
    if (target instanceof ownerWindow.Element) {
      const moves =
        target.contains(panelRoot) ||
        (resizeTargets?.some((observed) => target.contains(observed)) ?? false);
      if (!moves) return;
    }
    scheduleMeasure();
  };

  const ResizeObserverConstructor = getResizeObserver(ownerWindow);
  const resizeObserver =
    ResizeObserverConstructor === undefined
      ? undefined
      : new ResizeObserverConstructor(scheduleMeasure);
  resizeObserver?.observe(panelRoot);
  if (resizeTargets !== undefined) {
    for (const target of resizeTargets) {
      resizeObserver?.observe(target);
    }
  }

  ownerDocument.addEventListener("scroll", scheduleForScroll, true);
  ownerWindow.addEventListener("resize", scheduleMeasure);
  visualViewport?.addEventListener("resize", scheduleMeasure);
  visualViewport?.addEventListener("scroll", scheduleMeasure);
  scheduleMeasure();

  return () => {
    disposed = true;
    if (animationFrame !== 0) {
      ownerWindow.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    resizeObserver?.disconnect();
    ownerDocument.removeEventListener("scroll", scheduleForScroll, true);
    ownerWindow.removeEventListener("resize", scheduleMeasure);
    visualViewport?.removeEventListener("resize", scheduleMeasure);
    visualViewport?.removeEventListener("scroll", scheduleMeasure);
  };
}
