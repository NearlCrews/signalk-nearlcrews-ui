import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type ActionBarSticky = "bottom" | "top" | "viewport-bottom";

export interface ActionBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly actions: ReactNode;
  readonly status?: ReactNode;
  readonly statusRef?: Ref<HTMLDivElement>;
  readonly sticky?: ActionBarSticky | undefined;
}

interface ViewportPlacement {
  readonly bottomInset: number;
  readonly docked: boolean;
  readonly height: number;
  readonly left: number;
  readonly width: number;
}

const NATURAL_VIEWPORT_PLACEMENT: ViewportPlacement = {
  bottomInset: 0,
  docked: false,
  height: 0,
  left: 0,
  width: 0,
};

function placementsMatch(
  current: ViewportPlacement,
  next: ViewportPlacement,
): boolean {
  return (
    current.bottomInset === next.bottomInset &&
    current.docked === next.docked &&
    current.height === next.height &&
    current.left === next.left &&
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

    const measure = (): void => {
      animationFrame = 0;
      if (disposed) return;

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
      // panel instead of lingering over unrelated Admin pages.
      const docked =
        barRect.height > 0 &&
        anchorRect.width > 0 &&
        panelRect.top < dockingTop &&
        anchorRect.top > dockingTop &&
        panelRect.bottom > viewportTop &&
        panelRect.left < viewportRight &&
        panelRect.right > viewportLeft;

      const nextPlacement: ViewportPlacement = {
        bottomInset: roundedLayoutValue(bottomInset),
        docked,
        height: roundedLayoutValue(barRect.height),
        left: roundedLayoutValue(anchorRect.left),
        width: roundedLayoutValue(anchorRect.width),
      };
      if (!placementsMatch(placementRef.current, nextPlacement)) {
        placementRef.current = nextPlacement;
        setPlacement(nextPlacement);
        // Recheck after React applies the docking class. WebKit does not
        // reliably deliver a ResizeObserver notification when that position
        // change also alters the bar's wrapping or its anchor geometry.
        scheduleMeasure();
      }
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
    resizeObserver?.observe(anchor);
    resizeObserver?.observe(bar);
    resizeObserver?.observe(panelRoot);

    ownerDocument.addEventListener("scroll", scheduleMeasure, true);
    ownerWindow.addEventListener("resize", scheduleMeasure);
    ownerWindow.addEventListener("scroll", scheduleMeasure);
    visualViewport?.addEventListener("resize", scheduleMeasure);
    visualViewport?.addEventListener("scroll", scheduleMeasure);
    measure();
    scheduleMeasure();

    return () => {
      disposed = true;
      if (animationFrame !== 0) {
        ownerWindow.cancelAnimationFrame(animationFrame);
      }
      resizeObserver?.disconnect();
      ownerDocument.removeEventListener("scroll", scheduleMeasure, true);
      ownerWindow.removeEventListener("resize", scheduleMeasure);
      ownerWindow.removeEventListener("scroll", scheduleMeasure);
      visualViewport?.removeEventListener("resize", scheduleMeasure);
      visualViewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, []);

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
