import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type ActionBarSticky = "bottom" | "top" | "viewport-bottom";

export interface ActionBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly actions: ReactNode;
  readonly status?: ReactNode | undefined;
  readonly statusRef?: Ref<HTMLDivElement> | undefined;
  readonly sticky?: ActionBarSticky | undefined;
}

interface ViewportPlacement {
  readonly bottomInset: number;
  readonly docked: boolean;
  readonly height: number;
  readonly left: number;
  readonly viewportBottom: number;
  readonly width: number;
}

const NATURAL_VIEWPORT_PLACEMENT: ViewportPlacement = {
  bottomInset: 0,
  docked: false,
  height: 0,
  left: 0,
  viewportBottom: 0,
  width: 0,
};

/**
 * Upper bound on the measurements one settling pass may take. A settling
 * docking change costs one recheck for the class React commits and one for the
 * anchor geometry that class changes, so four leaves headroom above a
 * legitimate settle. The bound is also even, which matters for a geometry that
 * never settles because docking undoes its own condition: an alternating pair
 * of placements then ends every pass on the same one of the two, so the bar's
 * box is identical from frame to frame instead of moving on each.
 */
const MAXIMUM_SETTLING_MEASUREMENTS = 4;

/**
 * Half-width, in CSS pixels, of the band around every docking edge. Geometry
 * inside the band keeps the docking state it already has, so a value that lands
 * on an edge cannot alternate the bar between docked and natural flow.
 */
const DOCKING_HYSTERESIS = 1;

function placementsMatch(
  current: ViewportPlacement,
  next: ViewportPlacement,
): boolean {
  return (
    current.bottomInset === next.bottomInset &&
    current.docked === next.docked &&
    current.height === next.height &&
    current.left === next.left &&
    current.viewportBottom === next.viewportBottom &&
    current.width === next.width
  );
}

function roundedLayoutValue(value: number): number {
  return Math.round(value * 100) / 100;
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

const SCROLLABLE_OVERFLOW = /^(auto|overlay|scroll)$/;

function isScrollable(element: HTMLElement): boolean {
  const ownerWindow = element.ownerDocument.defaultView;
  if (ownerWindow === null) return false;
  const overflow = ownerWindow.getComputedStyle(element).overflowY;
  return (
    SCROLLABLE_OVERFLOW.test(overflow) &&
    element.scrollHeight > element.clientHeight
  );
}

function scrollFocusedTarget(
  target: HTMLElement,
  panelRoot: HTMLElement,
  ownerWindow: Window,
  delta: number,
  clearance: number,
): void {
  let remaining = delta;
  const targetRect = target.getBoundingClientRect();
  let targetTop = targetRect.top;
  let targetBottom = targetRect.bottom;
  let ancestor = target.parentElement;
  while (
    remaining !== 0 &&
    ancestor !== null &&
    ancestor !== panelRoot.ownerDocument.body
  ) {
    if (isScrollable(ancestor)) {
      const maximumScrollTop = Math.max(
        0,
        ancestor.scrollHeight - ancestor.clientHeight,
      );
      const scrollRange =
        remaining > 0
          ? maximumScrollTop - ancestor.scrollTop
          : ancestor.scrollTop;
      const ancestorRect = ancestor.getBoundingClientRect();
      const visibleTop = ancestorRect.top + ancestor.clientTop;
      const visibleBottom = visibleTop + ancestor.clientHeight;
      const visibilityRange =
        remaining > 0
          ? targetTop - (visibleTop + clearance)
          : visibleBottom - clearance - targetBottom;
      const applied =
        Math.sign(remaining) *
        Math.min(
          Math.abs(remaining),
          Math.max(0, scrollRange),
          Math.max(0, visibilityRange),
        );
      if (applied !== 0) {
        if (typeof ancestor.scrollBy === "function") {
          ancestor.scrollBy({ behavior: "auto", top: applied });
        } else {
          ancestor.scrollTop += applied;
        }
        remaining -= applied;
        targetTop -= applied;
        targetBottom -= applied;
      }
    }
    ancestor = ancestor.parentElement;
  }
  if (remaining !== 0) {
    ownerWindow.scrollBy({ behavior: "auto", top: remaining });
  }
}

function keepFocusedTargetVisible(
  target: HTMLElement,
  bar: HTMLElement,
  panelRoot: HTMLElement,
  ownerWindow: Window,
): void {
  if (bar.contains(target)) return;
  const panelContent = target.closest(".snui-root__content");
  if (panelContent?.parentElement !== panelRoot) return;

  const targetRect = target.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();
  // The bar's token-driven padding resolves to pixels in the computed style
  // and leaves enough room for the target's outset focus ring.
  const parsedClearance = Number.parseFloat(
    ownerWindow.getComputedStyle(bar).paddingBlockStart,
  );
  const clearance = Number.isFinite(parsedClearance) ? parsedClearance : 0;
  const visibleBottom = barRect.top - clearance;
  if (targetRect.bottom <= visibleBottom) return;

  scrollFocusedTarget(
    target,
    panelRoot,
    ownerWindow,
    targetRect.bottom - visibleBottom,
    clearance,
  );
}

/**
 * A pointer press focuses its target before the release lands, so a clearance
 * scroll during the press would move the control out from under the pointer and
 * the resulting click would dispatch on an ancestor instead of the control. The
 * clearance is skipped rather than deferred: a pointer user can already see the
 * control they pressed, and a scroll that arrives after the click would move
 * content under a pointer that is still there for a second press.
 */
function requestFocusClearance(
  target: HTMLElement,
  bar: HTMLElement,
  panelRoot: HTMLElement,
  ownerWindow: Window,
  pointerPressed: boolean,
): void {
  if (pointerPressed) return;
  keepFocusedTargetVisible(target, bar, panelRoot, ownerWindow);
}

/** The focused element, when the owning document has focused one at all. */
function focusedElement(
  ownerDocument: Document,
  ownerWindow: Window & typeof globalThis,
): HTMLElement | null {
  const target = ownerDocument.activeElement;
  return target instanceof ownerWindow.HTMLElement ? target : null;
}

interface ActionBarContentProps {
  readonly actions: ReactNode;
  readonly status: ReactNode;
  readonly statusRef: Ref<HTMLDivElement> | undefined;
}

function ActionBarContent({
  actions,
  status,
  statusRef,
}: ActionBarContentProps): React.JSX.Element {
  return (
    <>
      {hasReactContent(status) ? (
        <div ref={statusRef} className="snui-action-bar__status" tabIndex={-1}>
          {status}
        </div>
      ) : null}
      <div className="snui-action-bar__actions">{actions}</div>
    </>
  );
}

function ViewportBottomActionBar({
  actions,
  className,
  status,
  statusRef,
  style,
  ...props
}: Omit<ActionBarProps, "sticky">): React.JSX.Element {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const safeAreaProbeRef = useRef<HTMLSpanElement>(null);
  const placementRef = useRef<ViewportPlacement>(NATURAL_VIEWPORT_PLACEMENT);
  const pointerPressRef = useRef(false);
  const [placement, setPlacement] = useState<ViewportPlacement>(
    NATURAL_VIEWPORT_PLACEMENT,
  );

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const bar = barRef.current;
    const safeAreaProbe = safeAreaProbeRef.current;
    if (anchor === null || bar === null || safeAreaProbe === null) {
      return undefined;
    }

    const ownerDocument = anchor.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    const panelRoot = anchor.closest<HTMLElement>("[data-snui-root]");
    if (ownerWindow === null || panelRoot === null) return undefined;
    const visualViewport = getVisualViewport(ownerWindow);

    let animationFrame = 0;
    let disposed = false;

    /**
     * Reads the current geometry and adopts it. Returns the placement React
     * still has to render, or null once the geometry holds still.
     */
    const takePlacement = (): ViewportPlacement | null => {
      const viewport = getVisualViewport(ownerWindow);
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportBottom =
        viewport === undefined
          ? ownerWindow.innerHeight
          : viewport.offsetTop + viewport.height;
      const viewportRight =
        viewport === undefined
          ? ownerWindow.innerWidth
          : viewport.offsetLeft + viewport.width;
      const bottomInset = Math.max(0, ownerWindow.innerHeight - viewportBottom);

      const anchorRect = anchor.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      const panelRect = panelRoot.getBoundingClientRect();
      const safeAreaProbeRect = safeAreaProbe.getBoundingClientRect();
      const safeAreaInset = Math.max(
        0,
        ownerWindow.innerHeight - safeAreaProbeRect.bottom,
      );
      const dockingBottom =
        ownerWindow.innerHeight - Math.max(bottomInset, safeAreaInset);
      const dockingTop = dockingBottom - barRect.height;

      // Dock only while the target viewport edge lies between the panel's
      // leading edge and the bar's natural-flow anchor. This makes the bar
      // enter with the panel, return to flow at the anchor, and leave with the
      // panel instead of lingering over unrelated Admin pages. Every edge
      // carries the hysteresis band, because docking moves the anchor and the
      // bar and so feeds back into the geometry the next measurement reads.
      const band = placementRef.current.docked
        ? -DOCKING_HYSTERESIS
        : DOCKING_HYSTERESIS;
      const docked =
        barRect.height > 0 &&
        anchorRect.width > 0 &&
        panelRect.top < dockingTop - band &&
        anchorRect.top > dockingTop + band &&
        panelRect.bottom > viewportTop + band &&
        panelRect.left < viewportRight - band &&
        panelRect.right > viewportLeft + band;

      const nextPlacement: ViewportPlacement = {
        bottomInset: roundedLayoutValue(bottomInset),
        docked,
        height: roundedLayoutValue(barRect.height),
        left: roundedLayoutValue(anchorRect.left),
        viewportBottom: roundedLayoutValue(viewportBottom),
        width: roundedLayoutValue(anchorRect.width),
      };
      if (placementsMatch(placementRef.current, nextPlacement)) return null;
      placementRef.current = nextPlacement;
      return nextPlacement;
    };

    const measure = (): void => {
      animationFrame = 0;
      if (disposed) return;
      // Settle inside this frame. Each pass commits its placement
      // synchronously, so the next pass reads the layout that placement
      // produced rather than waiting for another frame, and the bar's box is
      // final by the time the frame paints. A browser that checks a control's
      // box across consecutive frames before delivering a press therefore sees
      // it hold still immediately, and WebKit, which does not reliably report
      // a docking change through its ResizeObserver, needs no extra frames to
      // catch up.
      for (let pass = 0; pass < MAXIMUM_SETTLING_MEASUREMENTS; pass += 1) {
        const nextPlacement = takePlacement();
        if (nextPlacement === null) return;
        flushSync(() => {
          setPlacement(nextPlacement);
        });
      }
    };

    const scheduleMeasure = (): void => {
      if (animationFrame !== 0 || disposed) return;
      animationFrame = ownerWindow.requestAnimationFrame(measure);
    };

    const keepFocusedContentVisible = (event: FocusEvent): void => {
      if (!placementRef.current.docked) return;
      const target = event.target;
      if (
        !(target instanceof ownerWindow.HTMLElement) ||
        bar.contains(target)
      ) {
        return;
      }
      requestFocusClearance(
        target,
        bar,
        panelRoot,
        ownerWindow,
        pointerPressRef.current,
      );
    };

    const beginPointerPress = (): void => {
      pointerPressRef.current = true;
    };

    // Runs on release and on key input, because a key press means the pointer
    // is no longer the thing driving focus. Key input also recovers the state
    // when a release never arrives, which keeps keyboard clearance immediate in
    // every case.
    const endPointerPress = (): void => {
      pointerPressRef.current = false;
    };

    const ResizeObserverConstructor = getResizeObserver(ownerWindow);
    const resizeObserver =
      ResizeObserverConstructor === undefined
        ? undefined
        : new ResizeObserverConstructor(scheduleMeasure);
    resizeObserver?.observe(anchor);
    resizeObserver?.observe(bar);
    resizeObserver?.observe(panelRoot);

    ownerDocument.addEventListener("scroll", scheduleMeasure, true);
    ownerDocument.addEventListener("focusin", keepFocusedContentVisible);
    ownerDocument.addEventListener("pointerdown", beginPointerPress, true);
    ownerDocument.addEventListener("pointerup", endPointerPress, true);
    ownerDocument.addEventListener("pointercancel", endPointerPress, true);
    ownerDocument.addEventListener("keydown", endPointerPress, true);
    ownerWindow.addEventListener("resize", scheduleMeasure);
    ownerWindow.addEventListener("scroll", scheduleMeasure);
    visualViewport?.addEventListener("resize", scheduleMeasure);
    visualViewport?.addEventListener("scroll", scheduleMeasure);
    // React is already committing here, so this first placement lands through
    // an ordinary state update and the scheduled frame settles the rest.
    const mountPlacement = takePlacement();
    if (mountPlacement !== null) setPlacement(mountPlacement);
    scheduleMeasure();

    return () => {
      disposed = true;
      pointerPressRef.current = false;
      if (animationFrame !== 0) {
        ownerWindow.cancelAnimationFrame(animationFrame);
      }
      resizeObserver?.disconnect();
      ownerDocument.removeEventListener("scroll", scheduleMeasure, true);
      ownerDocument.removeEventListener("focusin", keepFocusedContentVisible);
      ownerDocument.removeEventListener("pointerdown", beginPointerPress, true);
      ownerDocument.removeEventListener("pointerup", endPointerPress, true);
      ownerDocument.removeEventListener("pointercancel", endPointerPress, true);
      ownerDocument.removeEventListener("keydown", endPointerPress, true);
      ownerWindow.removeEventListener("resize", scheduleMeasure);
      ownerWindow.removeEventListener("scroll", scheduleMeasure);
      visualViewport?.removeEventListener("resize", scheduleMeasure);
      visualViewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, []);

  useLayoutEffect(() => {
    if (!placement.docked) return;
    const anchor = anchorRef.current;
    const bar = barRef.current;
    if (anchor === null || bar === null) return;
    const ownerWindow = anchor.ownerDocument.defaultView;
    const panelRoot = anchor.closest<HTMLElement>("[data-snui-root]");
    if (ownerWindow === null || panelRoot === null) return;
    const target = focusedElement(anchor.ownerDocument, ownerWindow);
    if (target === null) return;
    requestFocusClearance(
      target,
      bar,
      panelRoot,
      ownerWindow,
      pointerPressRef.current,
    );
  }, [placement]);

  const anchorStyle = {
    "--snui-action-bar-fixed-bottom": `${String(placement.bottomInset)}px`,
    "--snui-action-bar-fixed-height": `${String(placement.height)}px`,
    "--snui-action-bar-fixed-left": `${String(placement.left)}px`,
    "--snui-action-bar-fixed-width": `${String(placement.width)}px`,
  } as CSSProperties;

  return (
    <div
      ref={anchorRef}
      className={classNames(
        "snui-action-bar__viewport-anchor",
        placement.docked && "snui-action-bar__viewport-anchor--docked",
      )}
      data-snui-docked={placement.docked ? "" : undefined}
      style={anchorStyle}
    >
      <span
        ref={safeAreaProbeRef}
        aria-hidden="true"
        className="snui-action-bar__safe-area-probe"
      />
      <div
        {...props}
        ref={barRef}
        {...(style === undefined ? {} : { style })}
        className={classNames(
          "snui-action-bar",
          "snui-action-bar--sticky-viewport-bottom",
          placement.docked && "snui-action-bar--viewport-docked",
          className,
        )}
      >
        <ActionBarContent
          actions={actions}
          status={status}
          statusRef={statusRef}
        />
      </div>
    </div>
  );
}

export function ActionBar({
  actions,
  className,
  status,
  statusRef,
  sticky,
  ...props
}: ActionBarProps): React.JSX.Element {
  if (sticky === "viewport-bottom") {
    return (
      <ViewportBottomActionBar
        {...props}
        actions={actions}
        className={className}
        status={status}
        {...(statusRef === undefined ? {} : { statusRef })}
      />
    );
  }

  return (
    <div
      {...props}
      className={classNames(
        "snui-action-bar",
        sticky !== undefined && `snui-action-bar--sticky-${sticky}`,
        className,
      )}
    >
      <ActionBarContent
        actions={actions}
        status={status}
        statusRef={statusRef}
      />
    </div>
  );
}
