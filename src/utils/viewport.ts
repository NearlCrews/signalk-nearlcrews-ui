/**
 * Viewport measurement shared by the components that position themselves
 * against the visible part of a panel: the toast host and the viewport-docked
 * action bar. Both need the same visual-viewport-aware edges and the same set
 * of change signals, so the arithmetic and the listener wiring live here once.
 */

/** Edges of the visible viewport in CSS pixels, relative to the layout viewport. */
export interface ViewportEdges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

function getVisualViewport(ownerWindow: Window): VisualViewport | undefined {
  return Reflect.get(ownerWindow, "visualViewport") as
    | VisualViewport
    | undefined;
}

function getResizeObserver(
  ownerWindow: Window,
): typeof ResizeObserver | undefined {
  return Reflect.get(ownerWindow, "ResizeObserver") as
    | typeof ResizeObserver
    | undefined;
}

/**
 * Reads the visible viewport edges. The visual viewport shrinks when an
 * on-screen keyboard opens or the page is pinch-zoomed, so its offset and size
 * win over the layout viewport whenever the browser exposes it.
 */
export function readViewportEdges(ownerWindow: Window): ViewportEdges {
  const viewport = getVisualViewport(ownerWindow);
  if (viewport === undefined) {
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
 * panel may have moved: any scroll in the document (captured, so nested
 * scrollers count), a window resize, a visual viewport resize or scroll, or a
 * resize of the panel root or another observed element. The first call is
 * scheduled for the next frame; callers that need a synchronous first
 * measurement take it themselves before observing.
 *
 * The capture-phase document scroll listener already sees every scroll that
 * reaches the window, so no separate window scroll listener is registered.
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

  const ResizeObserverConstructor = getResizeObserver(ownerWindow);
  const resizeObserver =
    ResizeObserverConstructor === undefined
      ? undefined
      : new ResizeObserverConstructor(scheduleMeasure);
  resizeObserver?.observe(panelRoot);
  for (const target of options.resizeTargets ?? []) {
    resizeObserver?.observe(target);
  }

  ownerDocument.addEventListener("scroll", scheduleMeasure, true);
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
    ownerDocument.removeEventListener("scroll", scheduleMeasure, true);
    ownerWindow.removeEventListener("resize", scheduleMeasure);
    visualViewport?.removeEventListener("resize", scheduleMeasure);
    visualViewport?.removeEventListener("scroll", scheduleMeasure);
  };
}
