import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { TRANSITION_FAST_MS } from "../styles/tokens.js";
import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { DEFAULT_DISMISS_LABEL, resolveLabel } from "../utils/labels.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { usePanelPortalContainer } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import {
  resolveToneLabel,
  type SemanticTone,
  TONE_GLYPHS,
} from "../utils/tone.js";
import { PACKAGE_VERSION } from "../version.js";
import { Button } from "./Button.js";
import { ToneAnnouncement } from "./ToneAnnouncement.js";

/** Default auto-dismiss delay in milliseconds. */
const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * Maximum queued toasts. Sticky toasts (duration zero) never time out, so
 * without a cap a chatty caller grows the queue, the mounted DOM, and the
 * subscriber notification cost without bound. Beyond the cap, eviction
 * prefers the oldest toast that is neither focused nor sticky-critical, with
 * a bounded fallback when every existing toast is protected.
 */
const MAX_QUEUED_TOASTS = 5;

const TOAST_EXIT_FALLBACK_BUFFER_MS = 10;
const FOCUSED_TOAST_COUNTS = new Map<string, number>();

function retainFocusedToast(key: string): void {
  FOCUSED_TOAST_COUNTS.set(key, (FOCUSED_TOAST_COUNTS.get(key) ?? 0) + 1);
}

function releaseFocusedToast(key: string): void {
  const count = FOCUSED_TOAST_COUNTS.get(key);
  if (count === undefined || count <= 1) {
    FOCUSED_TOAST_COUNTS.delete(key);
    return;
  }
  FOCUSED_TOAST_COUNTS.set(key, count - 1);
}

interface ToastHostRecord {
  readonly dispose: () => void;
  readonly element: HTMLDivElement;
  references: number;
}

type ToastHostRegistry = Map<HTMLElement, ToastHostRecord>;

const TOAST_HOST_REGISTRY_KEY = Symbol.for(
  "signalk-nearlcrews-ui.toast-host-registry.v1",
);

/** Browser timer handle returned by window.setTimeout. */
type TimerId = number;

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

function roundedLayoutValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function getToastHostRegistry(ownerDocument: Document): ToastHostRegistry {
  const existing = Reflect.get(ownerDocument, TOAST_HOST_REGISTRY_KEY) as
    | ToastHostRegistry
    | undefined;
  if (existing !== undefined) return existing;

  const registry: ToastHostRegistry = new Map();
  Reflect.defineProperty(ownerDocument, TOAST_HOST_REGISTRY_KEY, {
    configurable: true,
    value: registry,
  });
  return registry;
}

function createToastHost(panelRoot: HTMLElement): ToastHostRecord {
  const ownerDocument = panelRoot.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const element = ownerDocument.createElement("div");
  element.className = "snui-toast-region-host";
  element.dataset.snuiToastHost = PACKAGE_VERSION;
  panelRoot.append(element);

  if (ownerWindow === null) {
    return {
      dispose: () => element.remove(),
      element,
      references: 0,
    };
  }

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
    const panelRect = panelRoot.getBoundingClientRect();
    const visibleTop = Math.max(viewportTop, panelRect.top);
    const visibleBottom = Math.min(viewportBottom, panelRect.bottom);
    const visibleLeft = Math.max(viewportLeft, panelRect.left);
    const visibleRight = Math.min(viewportRight, panelRect.right);
    const visible = visibleBottom > visibleTop && visibleRight > visibleLeft;

    element.toggleAttribute("data-snui-toast-host-visible", visible);
    element.style.setProperty(
      "--snui-toast-host-top",
      `${String(roundedLayoutValue(Math.max(0, visibleTop)))}px`,
    );
    element.style.setProperty(
      "--snui-toast-host-bottom",
      `${String(
        roundedLayoutValue(
          Math.max(0, ownerWindow.innerHeight - visibleBottom),
        ),
      )}px`,
    );
    element.style.setProperty(
      "--snui-toast-host-left",
      `${String(roundedLayoutValue(Math.max(0, visibleLeft)))}px`,
    );
    element.style.setProperty(
      "--snui-toast-host-width",
      `${String(roundedLayoutValue(Math.max(0, visibleRight - visibleLeft)))}px`,
    );
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
  ownerDocument.addEventListener("scroll", scheduleMeasure, true);
  ownerWindow.addEventListener("resize", scheduleMeasure);
  ownerWindow.addEventListener("scroll", scheduleMeasure);
  visualViewport?.addEventListener("resize", scheduleMeasure);
  visualViewport?.addEventListener("scroll", scheduleMeasure);
  measure();
  scheduleMeasure();

  return {
    dispose: () => {
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
      element.remove();
    },
    element,
    references: 0,
  };
}

function acquireToastHost(panelRoot: HTMLElement): {
  readonly element: HTMLDivElement;
  readonly release: () => void;
} {
  const ownerDocument = panelRoot.ownerDocument;
  const registry = getToastHostRegistry(ownerDocument);
  let record = registry.get(panelRoot);
  if (record === undefined) {
    record = createToastHost(panelRoot);
    registry.set(panelRoot, record);
  } else if (!record.element.isConnected) {
    panelRoot.append(record.element);
  }
  record.references += 1;

  let released = false;
  return {
    element: record.element,
    release: () => {
      if (released) return;
      released = true;
      const current = registry.get(panelRoot);
      if (current === undefined) return;
      current.references -= 1;
      if (current.references > 0) return;
      current.dispose();
      registry.delete(panelRoot);
      if (registry.size === 0) {
        Reflect.deleteProperty(ownerDocument, TOAST_HOST_REGISTRY_KEY);
      }
    },
  };
}

function useToastHost(panelRoot: HTMLElement | null): HTMLDivElement | null {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (panelRoot === null) return () => undefined;
      const acquired = acquireToastHost(panelRoot);
      hostRef.current = acquired.element;
      onStoreChange();
      return () => {
        hostRef.current = null;
        acquired.release();
      };
    },
    [panelRoot],
  );
  const getSnapshot = useCallback(() => hostRef.current, []);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface ToastContent {
  readonly title: ReactNode;
  readonly description?: ReactNode | undefined;
  /** Defaults to "info". */
  readonly tone?: SemanticTone | undefined;
  /**
   * Auto-dismiss delay in milliseconds. Defaults to 5000. Zero keeps the
   * toast until it is dismissed explicitly.
   */
  readonly duration?: number | undefined;
  /**
   * Announcement mode. Defaults to assertive for the danger and warning
   * tones, polite otherwise.
   */
  readonly live?: AnnouncementMode | undefined;
  /** Overrides the localized tone name announced to assistive technology. */
  readonly toneLabel?: string | undefined;
}

export interface QueuedToast<T extends ToastContent = ToastContent> {
  readonly key: string;
  readonly content: T;
}

export interface ToastQueue<T extends ToastContent = ToastContent> {
  /**
   * Adds a toast and returns its key. The queue holds at most five toasts;
   * when full, it first evicts the oldest toast that is neither focused nor a
   * sticky warning or danger. A bounded fallback always leaves room for the
   * newly enqueued toast.
   */
  readonly enqueue: (content: T) => string;
  /** Removes one toast. Unknown keys are ignored. */
  readonly dismiss: (key: string) => void;
  /** Removes every queued toast. */
  readonly clear: () => void;
  readonly getSnapshot: () => readonly QueuedToast<T>[];
  readonly subscribe: (listener: () => void) => () => void;
}

let nextToastKey = 0;

function toastRetentionPriority(content: ToastContent): number {
  return content.duration === 0 &&
    (content.tone === "danger" || content.tone === "warning")
    ? 1
    : 0;
}

function chooseToastToEvict<T extends ToastContent>(
  items: readonly QueuedToast<T>[],
): number {
  let candidateIndex = -1;
  let candidatePriority = Number.POSITIVE_INFINITY;
  // The final item is the newly enqueued toast. Keep it visible so enqueue's
  // public contract remains meaningful, and choose among the existing cards.
  for (let index = 0; index < items.length - 1; index += 1) {
    const item = items[index];
    if (item === undefined || FOCUSED_TOAST_COUNTS.has(item.key)) continue;
    const priority = toastRetentionPriority(item.content);
    if (priority < candidatePriority) {
      candidateIndex = index;
      candidatePriority = priority;
    }
  }
  // At most one toast can contain document focus. This fallback also keeps the
  // queue bounded in synthetic environments that mark more than one key.
  return candidateIndex === -1 ? 0 : candidateIndex;
}

/**
 * Creates a framework-light toast store. The snapshot array is replaced on
 * every mutation, so useSyncExternalStore subscribers re-render only when the
 * queue actually changes.
 */
export function createToastQueue<
  T extends ToastContent = ToastContent,
>(): ToastQueue<T> {
  let snapshot: readonly QueuedToast<T>[] = [];
  const listeners = new Set<() => void>();

  const emit = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    enqueue: (content) => {
      nextToastKey += 1;
      const key = `snui-toast-${String(nextToastKey)}`;
      const next = [...snapshot, { key, content }];
      if (next.length > MAX_QUEUED_TOASTS) {
        const evicted = next.splice(chooseToastToEvict(next), 1)[0];
        if (evicted !== undefined) FOCUSED_TOAST_COUNTS.delete(evicted.key);
      }
      snapshot = next;
      emit();
      return key;
    },
    dismiss: (key) => {
      if (!snapshot.some((queued) => queued.key === key)) return;
      snapshot = snapshot.filter((queued) => queued.key !== key);
      FOCUSED_TOAST_COUNTS.delete(key);
      emit();
    },
    clear: () => {
      if (snapshot.length === 0) return;
      for (const queued of snapshot) FOCUSED_TOAST_COUNTS.delete(queued.key);
      snapshot = [];
      emit();
    },
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Shared queue for the common single-region setup. */
export const toast: ToastQueue = createToastQueue();

interface ToastCardProps<T extends ToastContent> {
  readonly item: QueuedToast<T>;
  readonly queue: ToastQueue<T>;
  readonly dismissLabel?: string | undefined;
}

function ToastCard<T extends ToastContent>({
  item,
  queue,
  dismissLabel,
}: ToastCardProps<T>): React.JSX.Element {
  const { content, key } = item;
  const tone = content.tone ?? "info";
  const duration = content.duration ?? DEFAULT_TOAST_DURATION_MS;
  const live =
    content.live ??
    (tone === "danger" || tone === "warning" ? "assertive" : "polite");

  requireContent(content.title, "Toast requires a non-empty title.");

  const [exiting, setExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const countdownTimerRef = useRef<TimerId | null>(null);
  const exitTimerRef = useRef<TimerId | null>(null);
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const exitStartedRef = useRef(false);

  const finishExit = useCallback((): void => {
    queue.dismiss(key);
  }, [queue, key]);

  // queue, key, and duration never change for a mounted toast, so these
  // callbacks stay valid for the card's lifetime.
  const stopCountdown = useCallback((): void => {
    if (countdownTimerRef.current === null) return;
    window.clearTimeout(countdownTimerRef.current);
    countdownTimerRef.current = null;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  const beginExit = useCallback((): void => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    stopCountdown();
    setExiting(true);
  }, [stopCountdown]);

  useLayoutEffect(() => {
    if (!exiting) return undefined;
    const reduceMotion = prefersReducedMotion(
      typeof window === "undefined" ? null : window,
    );
    if (reduceMotion) {
      exitTimerRef.current = window.setTimeout(finishExit, 0);
      return undefined;
    }

    const card = cardRef.current;
    const token =
      card === null
        ? ""
        : window
            .getComputedStyle(card)
            .getPropertyValue("--snui-transition-fast");
    const tokenMatch = /([\d.]+)\s*(ms|s)\b/.exec(token);
    const tokenDuration =
      tokenMatch === null
        ? TRANSITION_FAST_MS
        : Number(tokenMatch[1]) * (tokenMatch[2] === "s" ? 1000 : 1);
    const duration = Number.isFinite(tokenDuration)
      ? tokenDuration
      : TRANSITION_FAST_MS;
    exitTimerRef.current = window.setTimeout(
      finishExit,
      duration + TOAST_EXIT_FALLBACK_BUFFER_MS,
    );
    return undefined;
  }, [exiting, finishExit]);

  const startCountdown = useCallback((): void => {
    if (duration <= 0) return;
    if (countdownTimerRef.current !== null || exitTimerRef.current !== null) {
      return;
    }
    startedAtRef.current = Date.now();
    countdownTimerRef.current = window.setTimeout(
      beginExit,
      remainingRef.current,
    );
  }, [duration, beginExit]);

  const setPaused = (source: "hover" | "focus", paused: boolean): void => {
    if (source === "hover") hoverPausedRef.current = paused;
    else focusPausedRef.current = paused;
    if (hoverPausedRef.current || focusPausedRef.current) stopCountdown();
    else startCountdown();
  };

  // The roled region mounts empty and its text lands one tick later, because
  // a live region created together with its message is not announced
  // reliably.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setContentReady(true);
    }, 0);
    return () => {
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (focusPausedRef.current) {
        focusPausedRef.current = false;
        releaseFocusedToast(key);
      }
      stopCountdown();
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [key, startCountdown, stopCountdown]);

  const region = liveRegionProps(live);
  const effectiveToneLabel = resolveToneLabel(tone, content.toneLabel);
  const effectiveDismissLabel = resolveLabel(
    dismissLabel,
    DEFAULT_DISMISS_LABEL,
  );

  return (
    // Pointer and focus handlers only pause the auto-dismiss countdown; the
    // toast itself is not an interactive control.
    // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus pause auto-dismiss, they do not make the card interactive
    <div
      ref={cardRef}
      className={classNames("snui-toast", `snui-toast--${tone}`)}
      data-exiting={exiting || undefined}
      onTransitionEnd={(event) => {
        if (
          exiting &&
          event.target === event.currentTarget &&
          (event.propertyName === "opacity" ||
            event.propertyName === "transform")
        ) {
          finishExit();
        }
      }}
      onPointerEnter={() => {
        setPaused("hover", true);
      }}
      onPointerLeave={() => {
        setPaused("hover", false);
      }}
      onFocus={() => {
        if (!focusPausedRef.current) retainFocusedToast(key);
        setPaused("focus", true);
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        if (focusPausedRef.current) releaseFocusedToast(key);
        setPaused("focus", false);
      }}
    >
      <span className="snui-toast__tone" aria-hidden="true">
        <span className="snui-toast__tone-dot" />
        <span className="snui-toast__tone-glyph">{TONE_GLYPHS[tone]}</span>
      </span>
      <div
        className="snui-toast__text"
        role={region.role}
        aria-live={region["aria-live"]}
      >
        {contentReady ? (
          <>
            <ToneAnnouncement label={effectiveToneLabel} />
            <div className="snui-toast__title">{content.title}</div>
            {hasReactContent(content.description) ? (
              <div className="snui-toast__description">
                {content.description}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="compact"
        iconOnly
        aria-label={effectiveDismissLabel}
        onClick={() => {
          beginExit();
        }}
      >
        <span aria-hidden="true">×</span>
      </Button>
    </div>
  );
}

export interface ToastRegionProps<T extends ToastContent = ToastContent>
  extends Omit<HTMLAttributes<HTMLElement>, "aria-label" | "children" | "role">,
    RefAttributes<HTMLElement> {
  readonly queue: ToastQueue<T>;
  /** Accessible name for the landmark. Defaults to "Notifications". */
  readonly label?: string | undefined;
  /** Accessible name for each toast's dismiss button. Defaults to "Dismiss". */
  readonly dismissLabel?: string | undefined;
}

/**
 * Renders a queue's toasts, newest first, into the nearest PanelRoot portal
 * container so the scoped styles and theme reach them. Rendering outside a
 * PanelRoot throws because a body portal would lose scoped styles and tokens.
 */
export function ToastRegion<T extends ToastContent = ToastContent>({
  className,
  dismissLabel,
  label = "Notifications",
  queue,
  ref,
  ...props
}: ToastRegionProps<T>): React.JSX.Element | null {
  const effectiveLabel = label.trim();
  if (!effectiveLabel) {
    throw new Error("ToastRegion requires a non-empty label.");
  }

  const toasts = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  // Newest first, without copying the snapshot on every render.
  const cards: React.JSX.Element[] = [];
  for (let index = toasts.length - 1; index >= 0; index -= 1) {
    const item = toasts[index];
    if (item === undefined) continue;
    cards.push(
      <ToastCard
        key={item.key}
        item={item}
        queue={queue}
        dismissLabel={dismissLabel}
      />,
    );
  }
  const panelRoot = usePanelPortalContainer("ToastRegion");
  const container = useToastHost(panelRoot);

  if (container === null) return null;

  return createPortal(
    // A labelled section is the notifications landmark.
    <section
      {...props}
      ref={ref}
      className={classNames("snui-toast-region", className)}
      aria-label={effectiveLabel}
    >
      {cards}
    </section>,
    container,
  );
}
