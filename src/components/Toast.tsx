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

import { OVERLAY_STYLES } from "../styles/index.js";
import { TRANSITION_FAST_MS } from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import {
  createDocumentRegistry,
  type DocumentRegistryRecord,
} from "../utils/document-registry.js";
import { DEFAULT_DISMISS_LABEL, resolveLabel } from "../utils/labels.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { usePanelPortalContainer } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { composeRef } from "../utils/ref.js";
import type { SemanticTone } from "../utils/tone.js";
import {
  observePanelViewport,
  readViewportEdges,
  roundedLayoutValue,
} from "../utils/viewport.js";
import { PACKAGE_VERSION } from "../version.js";
import { Button } from "./Button.js";
import { ToneMark } from "./ToneMark.js";

/** Default auto-dismiss delay, in milliseconds, for the info and success tones. */
const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * Tones whose toasts stay until dismissed unless the caller sets a duration.
 * A failure that vanishes after five seconds cannot be re-read by a screen
 * reader user and is lost on a sighted user who looked away.
 */
const STICKY_TONES: ReadonlySet<SemanticTone> = new Set(["danger", "warning"]);

/**
 * Maximum queued toasts. Sticky toasts (duration zero) never time out, so
 * without a cap a chatty caller grows the queue, the mounted DOM, and the
 * subscriber notification cost without bound. Beyond the cap, eviction
 * prefers the oldest toast that is neither focused nor sticky-critical, with
 * a bounded fallback when every existing toast is protected.
 */
const MAX_QUEUED_TOASTS = 5;

const TOAST_EXIT_FALLBACK_BUFFER_MS = 10;
const TOAST_TITLE_MESSAGE = "Toast requires a non-empty title.";

/** A card that is not already leaving; exiting cards are never focus targets. */
const LIVE_TOAST_CARD_SELECTOR = ".snui-toast:not([data-exiting])";
const TOAST_DISMISS_SELECTOR = ".snui-toast__dismiss";

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

/** Browser timer handle returned by window.setTimeout. */
type TimerId = number;

function resolveToastTone(content: ToastContent): SemanticTone {
  return content.tone ?? "info";
}

/** Sticky for warning and danger, five seconds otherwise, unless overridden. */
function resolveToastDuration(content: ToastContent): number {
  return (
    content.duration ??
    (STICKY_TONES.has(resolveToastTone(content))
      ? 0
      : DEFAULT_TOAST_DURATION_MS)
  );
}

/** Assertive only for danger; a warning in a configuration panel can wait. */
function resolveToastLive(content: ToastContent): AnnouncementMode {
  return (
    content.live ??
    (resolveToastTone(content) === "danger" ? "assertive" : "polite")
  );
}

/**
 * The panel root is not normally focusable, so it borrows a tabindex for the
 * one focus move that has no better destination and gives it back on blur.
 * Focus never drops to the document body.
 */
function focusPanelRoot(panelRoot: HTMLElement): void {
  if (!panelRoot.hasAttribute("tabindex")) {
    panelRoot.setAttribute("tabindex", "-1");
    panelRoot.addEventListener(
      "blur",
      () => {
        panelRoot.removeAttribute("tabindex");
      },
      { once: true },
    );
  }
  panelRoot.focus({ preventScroll: true });
}

interface ToastHostHandle {
  readonly element: HTMLDivElement;
  /**
   * Moves focus to the element that had it before focus entered the host,
   * else to the panel root.
   */
  readonly restoreFocus: () => void;
}

/**
 * The host precedes the panel content so the notifications landmark is one
 * Tab from the panel start. It is fixed-positioned, so the position changes
 * only the focus order.
 */
function insertToastHost(panelRoot: HTMLElement, element: HTMLElement): void {
  panelRoot.insertBefore(
    element,
    panelRoot.querySelector(":scope > .snui-root__content"),
  );
}

function createToastHost(
  panelRoot: HTMLElement,
): DocumentRegistryRecord<ToastHostHandle> {
  const ownerDocument = panelRoot.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const element = ownerDocument.createElement("div");
  element.className = "snui-toast-region-host";
  element.dataset.snuiToastHost = PACKAGE_VERSION;
  // React Aria's modal overlays hide and inert everything outside the modal
  // except nodes carrying this marker, and its focus containment lets focus
  // reach them. Without it a toast raised while a Dialog is open is neither
  // announced nor dismissable.
  element.setAttribute("data-react-aria-top-layer", "");
  const attach = (): void => {
    insertToastHost(panelRoot, element);
  };
  attach();

  if (ownerWindow === null) {
    return {
      attach,
      dispose: () => {
        element.remove();
      },
      element,
      value: {
        element,
        restoreFocus: () => {
          focusPanelRoot(panelRoot);
        },
      },
    };
  }

  const measure = (): void => {
    const viewport = readViewportEdges(ownerWindow);
    const panelRect = panelRoot.getBoundingClientRect();
    const visibleTop = Math.max(viewport.top, panelRect.top);
    const visibleBottom = Math.min(viewport.bottom, panelRect.bottom);
    const visibleLeft = Math.max(viewport.left, panelRect.left);
    const visibleRight = Math.min(viewport.right, panelRect.right);
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

  // Focus that enters the host remembers where it came from, so dismissing
  // the last toast, or pressing F6 again, returns there rather than to the
  // document body. A null origin (focus arrived from nowhere) clears it.
  let lastFocusedOutside: HTMLElement | null = null;
  const rememberFocusOrigin = (event: FocusEvent): void => {
    const origin = event.relatedTarget;
    if (origin === null) {
      lastFocusedOutside = null;
      return;
    }
    if (
      origin instanceof ownerWindow.HTMLElement &&
      !element.contains(origin)
    ) {
      lastFocusedOutside = origin;
    }
  };

  const restoreFocus = (): void => {
    const target = lastFocusedOutside;
    lastFocusedOutside = null;
    if (target?.isConnected) {
      target.focus({ preventScroll: true });
      if (ownerDocument.activeElement === target) return;
    }
    focusPanelRoot(panelRoot);
  };

  const firstToastControl = (): HTMLElement | null => {
    for (const card of element.querySelectorAll(LIVE_TOAST_CARD_SELECTOR)) {
      const control = card.querySelector<HTMLElement>(TOAST_DISMISS_SELECTOR);
      if (control !== null) return control;
    }
    return null;
  };

  // F6 is the landmark shortcut React Aria's own toast region uses: it moves
  // focus into the notifications, and F6 again (or Shift+F6) moves it back to
  // where it was. The key is left alone while no toast is showing.
  const handleLandmarkKey = (event: KeyboardEvent): void => {
    if (
      event.key !== "F6" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.defaultPrevented
    ) {
      return;
    }
    if (element.contains(ownerDocument.activeElement)) {
      event.preventDefault();
      restoreFocus();
      return;
    }
    const control = firstToastControl();
    if (control === null) return;
    event.preventDefault();
    control.focus();
  };

  element.addEventListener("focusin", rememberFocusOrigin);
  ownerDocument.addEventListener("keydown", handleLandmarkKey);
  measure();
  const stopObserving = observePanelViewport(panelRoot, measure);

  return {
    attach,
    dispose: () => {
      stopObserving();
      element.removeEventListener("focusin", rememberFocusOrigin);
      ownerDocument.removeEventListener("keydown", handleLandmarkKey);
      element.remove();
    },
    element,
    value: { element, restoreFocus },
  };
}

// Version 2 of the key: the record shape stored on the document changed with
// the shared registry, so a 0.8.x copy in the same document never reads it.
const TOAST_HOSTS = createDocumentRegistry<HTMLElement, ToastHostHandle>(
  "signalk-nearlcrews-ui.toast-host-registry.v2",
);

function useToastHost(panelRoot: HTMLElement | null): ToastHostHandle | null {
  const hostRef = useRef<ToastHostHandle | null>(null);
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (panelRoot === null) return () => undefined;
      const ownerDocument = panelRoot.ownerDocument;
      hostRef.current = TOAST_HOSTS.acquire(ownerDocument, panelRoot, () =>
        createToastHost(panelRoot),
      );
      onStoreChange();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        hostRef.current = null;
        TOAST_HOSTS.release(ownerDocument, panelRoot);
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
   * Auto-dismiss delay in milliseconds. Defaults to 5000 for the info and
   * success tones and to zero for warning and danger. Zero keeps the toast
   * until it is dismissed explicitly.
   */
  readonly duration?: number | undefined;
  /**
   * Announcement mode. Defaults to assertive for the danger tone, polite
   * otherwise.
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
   * Adds a toast and returns its key. Throws synchronously when the title has
   * no content, so a blank runtime message fails at the call site instead of
   * inside the region's render. The queue holds at most five toasts; when
   * full, it first evicts the oldest toast that is neither focused nor a
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
  return resolveToastDuration(content) === 0 &&
    STICKY_TONES.has(resolveToastTone(content))
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
      requireContent(content.title, TOAST_TITLE_MESSAGE);
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
  const tone = resolveToastTone(content);
  const duration = resolveToastDuration(content);
  const live = resolveToastLive(content);

  // The queue already rejected a blank title in enqueue; this guards content
  // that reached the region without passing through it.
  requireContent(content.title, TOAST_TITLE_MESSAGE);

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
      </span>
      <div
        className="snui-toast__text"
        role={region.role}
        aria-live={region["aria-live"]}
      >
        {contentReady ? (
          <>
            <div className="snui-toast__title">
              <ToneMark
                tone={tone}
                toneLabel={content.toneLabel}
                className="snui-toast__tone-glyph"
              />
              {content.title}
            </div>
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
        className="snui-toast__dismiss"
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
 * container so the scoped styles and theme reach them. The notifications
 * landmark exists only while the queue has toasts, so an empty region adds
 * nothing to the landmark list, and the ref resolves only then. Rendering
 * outside a PanelRoot throws because a body portal would lose scoped styles
 * and tokens.
 */
export function ToastRegion<T extends ToastContent = ToastContent>({
  className,
  dismissLabel,
  label = "Notifications",
  onBlur,
  onFocus,
  queue,
  ref,
  ...props
}: ToastRegionProps<T>): React.JSX.Element | null {
  const effectiveLabel = label.trim();
  if (!effectiveLabel) {
    throw new Error("ToastRegion requires a non-empty label.");
  }

  useModuleStyles(OVERLAY_STYLES, "ToastRegion");
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
  const host = useToastHost(panelRoot);

  const regionRef = useRef<HTMLElement | null>(null);
  const setRegionRef = useCallback(
    (node: HTMLElement | null): (() => void) | undefined => {
      if (node === null) return undefined;
      regionRef.current = node;
      const release = composeRef(ref, node);
      return () => {
        release();
        regionRef.current = null;
      };
    },
    [ref],
  );

  // Index, newest first, of the card that contains focus, or -1. A removed
  // card fires no blur, so the index outlives the card and tells the effect
  // below where focus was.
  const focusedIndexRef = useRef(-1);
  const previousKeysRef = useRef<readonly string[]>([]);

  // When the focused card leaves the queue, focus moves to the card that now
  // occupies its slot (the next older one, else the newest remaining), and
  // when none remains it returns to where it was before entering the host.
  useLayoutEffect(() => {
    const previousKeys = previousKeysRef.current;
    previousKeysRef.current = toasts.map((item) => item.key);
    const focusedIndex = focusedIndexRef.current;
    if (focusedIndex === -1 || host === null) return;
    const focusedKey = previousKeys[previousKeys.length - 1 - focusedIndex];
    if (
      focusedKey === undefined ||
      toasts.some((item) => item.key === focusedKey)
    ) {
      return;
    }
    focusedIndexRef.current = -1;
    const survivors =
      regionRef.current?.querySelectorAll<HTMLElement>(
        LIVE_TOAST_CARD_SELECTOR,
      ) ?? [];
    const survivor = survivors[Math.min(focusedIndex, survivors.length - 1)];
    const dismiss =
      survivor?.querySelector<HTMLElement>(TOAST_DISMISS_SELECTOR) ?? null;
    if (dismiss !== null) {
      dismiss.focus();
      return;
    }
    host.restoreFocus();
  }, [host, toasts]);

  // A region that unmounts while one of its toasts has focus hands focus back
  // the same way, so the consumer removing a region never strands the user.
  useLayoutEffect(() => {
    return () => {
      if (focusedIndexRef.current !== -1) host?.restoreFocus();
    };
  }, [host]);

  if (host === null || cards.length === 0) return null;

  return createPortal(
    // A labeled section is the notifications landmark.
    <section
      {...props}
      ref={setRegionRef}
      className={classNames("snui-toast-region", className)}
      aria-label={effectiveLabel}
      onFocus={(event) => {
        const card = event.target.closest(".snui-toast");
        const rendered = event.currentTarget.querySelectorAll(".snui-toast");
        focusedIndexRef.current =
          card === null ? -1 : Array.prototype.indexOf.call(rendered, card);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedIndexRef.current = -1;
        }
        onBlur?.(event);
      }}
    >
      {cards}
    </section>,
    host.element,
  );
}
