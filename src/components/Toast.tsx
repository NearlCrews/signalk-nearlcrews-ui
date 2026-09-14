import {
  type HTMLAttributes,
  memo,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useNodeRef } from "../hooks/use-node-ref.js";
import { TOAST_STYLES } from "../styles/toast.js";
import { TRANSITION_FAST_MS } from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import {
  type AnnouncementMode,
  announcesUpdates,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import {
  createDocumentRegistry,
  type DocumentRegistryRecord,
  once,
} from "../utils/document-registry.js";
import { createEmitter } from "../utils/emitter.js";
import { focusPanelRoot } from "../utils/focus.js";
import {
  DEFAULT_DISMISS_LABEL,
  resolveBundledLabel,
  resolveLabel,
} from "../utils/labels.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { usePanelPortalContainer } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import type { SemanticTone } from "../utils/tone.js";
import {
  layoutMatches,
  observePanelViewport,
  readViewportEdges,
  roundedLayoutValue,
} from "../utils/viewport.js";
import { Button } from "./Button.js";
import { ToneMark } from "./ToneMark.js";

/** Default auto-dismiss delay, in milliseconds, for the info and success tones. */
const DEFAULT_TOAST_DURATION_MS = 5_000;

/**
 * Tones whose toasts stay until dismissed unless the caller sets a duration.
 * A failure that vanishes after five seconds cannot be re-read by a screen
 * reader user and is lost on a sighted user who looked away.
 */
const STICKY_TONES: ReadonlySet<SemanticTone> = new Set(["danger", "warning"]);

/**
 * Maximum queued toasts. Sticky toasts (duration zero) never time out, so
 * without a cap a chatty caller grows the queue, the mounted DOM, and the
 * subscriber notification cost without bound. Beyond the cap, eviction takes
 * the oldest toast that is neither focused nor more consequential than the
 * arrival, and refuses the arrival itself when the queue holds nothing it may
 * drop.
 */
const MAX_QUEUED_TOASTS = 5;

const TOAST_EXIT_FALLBACK_BUFFER_MS = 10;
const TOAST_TITLE_MESSAGE = "Toast requires a non-empty title.";

const TOAST_CARD_SELECTOR = ".snui-toast";
/** A card that is not already leaving; exiting cards are never focus targets. */
const LIVE_TOAST_CARD_SELECTOR = `${TOAST_CARD_SELECTOR}:not([data-exiting])`;
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

/**
 * Sticky for warning and danger, and otherwise the toast's own duration, the
 * region's default, or five seconds, in that order.
 */
function resolveToastDuration(
  content: ToastContent,
  defaultDuration: number = DEFAULT_TOAST_DURATION_MS,
): number {
  return (
    content.duration ??
    (STICKY_TONES.has(resolveToastTone(content)) ? 0 : defaultDuration)
  );
}

/** Assertive only for danger; a warning in a configuration panel can wait. */
function resolveToastLive(content: ToastContent): AnnouncementMode {
  return (
    content.live ??
    (resolveToastTone(content) === "danger" ? "assertive" : "polite")
  );
}

interface ToastHostHandle {
  readonly element: HTMLDivElement;
  /**
   * Measures the panel's visible rectangle now. The host measures nothing
   * while it holds no cards, so the region asks for this when its first card
   * mounts.
   */
  readonly measure: () => void;
  /**
   * Moves focus to the element that had it before focus entered the host,
   * else to the panel root.
   */
  readonly restoreFocus: () => void;
}

/** The host geometry last written, so a frame that moved nothing writes nothing. */
interface ToastHostPlacement {
  readonly bottom: number;
  readonly left: number;
  readonly top: number;
  readonly visible: boolean;
  readonly width: number;
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
  // React Aria's modal overlays hide and inert everything outside the modal
  // except nodes carrying this marker, and its focus containment lets focus
  // reach them. Without it a toast raised while a Dialog is open is neither
  // announced nor dismissable.
  element.setAttribute("data-react-aria-top-layer", "");
  // The registry attaches the record itself whenever an acquire finds the
  // element disconnected, so the insertion keeps one owner.
  const attach = (): void => {
    insertToastHost(panelRoot, element);
  };

  if (ownerWindow === null) {
    return {
      attach,
      dispose: () => {
        element.remove();
      },
      element,
      value: {
        element,
        measure: () => undefined,
        restoreFocus: () => {
          focusPanelRoot(panelRoot);
        },
      },
    };
  }

  let placement: ToastHostPlacement | null = null;

  const measure = (): void => {
    // An empty host paints nothing, so a panel whose queue has never held a
    // toast pays no panel rectangle and no style write on a scroll frame.
    if (element.firstElementChild === null) return;
    const viewport = readViewportEdges(ownerWindow);
    const panelRect = panelRoot.getBoundingClientRect();
    const visibleTop = Math.max(viewport.top, panelRect.top);
    const visibleBottom = Math.min(viewport.bottom, panelRect.bottom);
    const visibleLeft = Math.max(viewport.left, panelRect.left);
    const visibleRight = Math.min(viewport.right, panelRect.right);
    const next: ToastHostPlacement = {
      bottom: roundedLayoutValue(
        Math.max(0, ownerWindow.innerHeight - visibleBottom),
      ),
      left: roundedLayoutValue(Math.max(0, visibleLeft)),
      top: roundedLayoutValue(Math.max(0, visibleTop)),
      visible: visibleBottom > visibleTop && visibleRight > visibleLeft,
      width: roundedLayoutValue(Math.max(0, visibleRight - visibleLeft)),
    };
    // Every value is rounded, so equal geometry compares equal. Custom
    // properties inherit, and a redundant write would invalidate style for
    // the host and every card below it once per scroll frame.
    if (placement !== null && layoutMatches(placement, next)) return;
    placement = next;

    element.toggleAttribute("data-snui-toast-host-visible", next.visible);
    element.style.setProperty("--snui-toast-host-top", `${String(next.top)}px`);
    element.style.setProperty(
      "--snui-toast-host-bottom",
      `${String(next.bottom)}px`,
    );
    element.style.setProperty(
      "--snui-toast-host-left",
      `${String(next.left)}px`,
    );
    element.style.setProperty(
      "--snui-toast-host-width",
      `${String(next.width)}px`,
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

  // F6 is the landmark shortcut React Aria's own toast region uses: from
  // inside the panel it moves focus into the notifications, and from inside
  // the host it moves focus back where it came from. Both spellings toggle,
  // F6 and Shift+F6, because the region is one stop rather than a cycle. The
  // key is left to the host page while no toast is showing and while focus
  // stands outside this panel, so a second panel and the Admin chrome keep
  // their own.
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
    const focused = ownerDocument.activeElement;
    if (element.contains(focused)) {
      event.preventDefault();
      restoreFocus();
      return;
    }
    if (!panelRoot.contains(focused)) return;
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
    value: { element, measure, restoreFocus },
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
      return once(() => {
        hostRef.current = null;
        TOAST_HOSTS.release(ownerDocument, panelRoot);
      });
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

/** Why a queued toast left the queue without being dismissed. */
export type ToastEvictionReason = "overflow" | "rejected";

/** A toast the queue dropped to stay inside its bound. */
export interface ToastEviction<T extends ToastContent = ToastContent> {
  /**
   * "overflow" when an older toast made room for a new one, and "rejected"
   * when the queue held nothing it was allowed to drop, so the new toast never
   * appeared.
   */
  readonly reason: ToastEvictionReason;
  /** The toast that left the queue, or the arrival that never entered it. */
  readonly toast: QueuedToast<T>;
}

/** Options for {@link createToastQueue}. */
export interface ToastQueueOptions<T extends ToastContent = ToastContent> {
  /**
   * Called when the queue drops a toast to stay inside its bound, so a caller
   * reporting safety-relevant failures can re-raise, log, or count the one
   * that went instead of losing it silently. Dismissals and clears are
   * deliberate and are never reported here.
   */
  readonly onEvict?: ((eviction: ToastEviction<T>) => void) | undefined;
}

export interface ToastQueue<T extends ToastContent = ToastContent> {
  /**
   * Adds a toast and returns its key. Throws synchronously when the title has
   * no content, so a blank runtime message fails at the call site instead of
   * inside the region's render. The queue holds at most five toasts; when
   * full, it evicts the oldest toast that is neither focused nor more
   * consequential than the arrival. A sticky warning or danger is never
   * removed for a lesser notice: when the queue holds nothing it may drop, the
   * arrival is refused instead. Either way the toast that went is reported to
   * `onEvict`, and the returned key stays safe to pass to `dismiss`.
   */
  readonly enqueue: (content: T) => string;
  /** Removes one toast. Unknown keys are ignored. */
  readonly dismiss: (key: string) => void;
  /** Removes every queued toast. */
  readonly clear: () => void;
  readonly getSnapshot: () => readonly QueuedToast<T>[];
  readonly subscribe: (listener: () => void) => () => void;
}

/** A server render holds no toasts, and the identity has to stay stable. */
const EMPTY_TOASTS: readonly QueuedToast<never>[] = [];

function getServerToasts(): readonly QueuedToast<never>[] {
  return EMPTY_TOASTS;
}

let nextToastKey = 0;

/**
 * How hard a queued toast is to evict. A caller that turned auto-dismiss off
 * meant the message to stay, so an explicitly sticky toast outranks a timed
 * one; a sticky warning or danger outranks both, because it reports a failure
 * that may not have been read yet.
 */
const TOAST_PRIORITY_TIMED = 0;
const TOAST_PRIORITY_STICKY = 1;
const TOAST_PRIORITY_CRITICAL = 2;

function toastRetentionPriority(content: ToastContent): number {
  if (resolveToastDuration(content) !== 0) return TOAST_PRIORITY_TIMED;
  return STICKY_TONES.has(resolveToastTone(content))
    ? TOAST_PRIORITY_CRITICAL
    : TOAST_PRIORITY_STICKY;
}

/**
 * Index of the toast that makes room for the arrival, or -1 when the queue
 * keeps everything it holds and the arrival is refused.
 */
function chooseToastToEvict<T extends ToastContent>(
  items: readonly QueuedToast<T>[],
  incomingPriority: number,
): number {
  let candidateIndex = -1;
  let candidatePriority = Number.POSITIVE_INFINITY;
  // The final item is the newly enqueued toast, so the choice is made among
  // the existing cards.
  for (let index = 0; index < items.length - 1; index += 1) {
    const item = items[index];
    if (item === undefined || FOCUSED_TOAST_COUNTS.has(item.key)) continue;
    const priority = toastRetentionPriority(item.content);
    if (priority < candidatePriority) {
      candidateIndex = index;
      candidatePriority = priority;
    }
  }
  // Nothing droppable, or nothing droppable that matters less than the
  // arrival: a failure the operator has not read yet outlives a routine
  // notice, and the queue stays bounded because the arrival is refused.
  return candidatePriority > incomingPriority ? -1 : candidateIndex;
}

/**
 * Creates a framework-light toast store. The snapshot array is replaced on
 * every mutation, so useSyncExternalStore subscribers re-render only when the
 * queue actually changes.
 *
 * One queue feeds one region at a time. Two regions bound to the same queue
 * each render, announce, and time out every toast in it, which the package
 * tolerates only across the moment a consumer swaps one region for another.
 */
export function createToastQueue<T extends ToastContent = ToastContent>(
  options: ToastQueueOptions<T> = {},
): ToastQueue<T> {
  let snapshot: readonly QueuedToast<T>[] = [];
  const { emit, subscribe } = createEmitter();

  return {
    enqueue: (content) => {
      requireContent(content.title, TOAST_TITLE_MESSAGE);
      nextToastKey += 1;
      const key = `snui-toast-${String(nextToastKey)}`;
      const queued: QueuedToast<T> = { content, key };
      const next = [...snapshot, queued];
      let dropped: QueuedToast<T> | undefined;
      if (next.length > MAX_QUEUED_TOASTS) {
        const index = chooseToastToEvict(next, toastRetentionPriority(content));
        if (index === -1) {
          options.onEvict?.({ reason: "rejected", toast: queued });
          return key;
        }
        dropped = next[index];
        next.splice(index, 1);
        if (dropped !== undefined) FOCUSED_TOAST_COUNTS.delete(dropped.key);
      }
      snapshot = next;
      emit();
      // Reported after the queue settled, so a caller that re-raises the lost
      // toast enqueues against the state its subscribers already saw.
      if (dropped !== undefined) {
        options.onEvict?.({ reason: "overflow", toast: dropped });
      }
      return key;
    },
    dismiss: (key) => {
      const index = snapshot.findIndex((queued) => queued.key === key);
      if (index === -1) return;
      const next = [...snapshot];
      next.splice(index, 1);
      snapshot = next;
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
    subscribe,
  };
}

/** Shared queue for the common single-region setup. */
export const toast: ToastQueue = createToastQueue();

interface ToastCardProps<T extends ToastContent> {
  readonly item: QueuedToast<T>;
  readonly queue: ToastQueue<T>;
  readonly defaultDuration?: number | undefined;
  readonly dismissLabel?: string | undefined;
}

function ToastCardImpl<T extends ToastContent>({
  defaultDuration,
  dismissLabel,
  item,
  queue,
}: ToastCardProps<T>): React.JSX.Element {
  const { content, key } = item;
  const tone = resolveToastTone(content);
  const duration = resolveToastDuration(content, defaultDuration);
  const live = resolveToastLive(content);
  const region = liveRegionProps(live);
  const announcing = announcesUpdates(region);
  const titleId = useId();

  // The queue already rejected a blank title in enqueue; this guards content
  // that reached the region without passing through it.
  requireContent(content.title, TOAST_TITLE_MESSAGE);

  const [exiting, setExiting] = useState(false);
  // A region that announces nothing has no reason to mount empty first.
  const [contentReady, setContentReady] = useState(!announcing);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Every timer and computed style reads the card's own view, so a panel in a
  // secondary window keeps its own clock. The view outlives the node, because
  // the unmount cleanup clears timers after the ref is gone.
  const viewRef = useRef<Window | null>(null);
  const setCardRef = useCallback((node: HTMLDivElement | null): void => {
    cardRef.current = node;
    if (node !== null) viewRef.current = node.ownerDocument.defaultView;
  }, []);

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
    const timer = countdownTimerRef.current;
    if (timer === null) return;
    viewRef.current?.clearTimeout(timer);
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
    const view = viewRef.current;
    if (!exiting || view === null) return undefined;
    // One cleanup for both branches, so a re-run can never orphan the handle
    // it is about to overwrite.
    const clearExitTimer = (): void => {
      if (exitTimerRef.current === null) return;
      view.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    };
    if (prefersReducedMotion(view)) {
      exitTimerRef.current = view.setTimeout(finishExit, 0);
      return clearExitTimer;
    }

    const card = cardRef.current;
    const token =
      card === null
        ? ""
        : view
            .getComputedStyle(card)
            .getPropertyValue("--snui-transition-fast");
    const tokenMatch = /([\d.]+)\s*(ms|s)\b/.exec(token);
    const tokenDuration =
      tokenMatch === null
        ? TRANSITION_FAST_MS
        : Number(tokenMatch[1]) * (tokenMatch[2] === "s" ? 1000 : 1);
    const exitDurationMs = Number.isFinite(tokenDuration)
      ? tokenDuration
      : TRANSITION_FAST_MS;
    exitTimerRef.current = view.setTimeout(
      finishExit,
      exitDurationMs + TOAST_EXIT_FALLBACK_BUFFER_MS,
    );
    return clearExitTimer;
  }, [exiting, finishExit]);

  const startCountdown = useCallback((): void => {
    const view = viewRef.current;
    if (duration <= 0 || view === null) return;
    if (countdownTimerRef.current !== null || exitTimerRef.current !== null) {
      return;
    }
    startedAtRef.current = Date.now();
    countdownTimerRef.current = view.setTimeout(
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
  // reliably. A toast that announces nothing skips the blank commit.
  useEffect(() => {
    const view = viewRef.current;
    if (!announcing || view === null) return undefined;
    const id = view.setTimeout(() => {
      setContentReady(true);
    }, 0);
    return () => {
      view.clearTimeout(id);
    };
  }, [announcing]);

  useEffect(() => {
    startCountdown();
    return () => {
      if (focusPausedRef.current) {
        focusPausedRef.current = false;
        releaseFocusedToast(key);
      }
      stopCountdown();
    };
  }, [key, startCountdown, stopCountdown]);

  const effectiveDismissLabel = resolveBundledLabel(
    dismissLabel,
    usePanelLabels()?.toastRegion?.dismiss,
    DEFAULT_DISMISS_LABEL,
  );

  return (
    // Pointer and focus handlers only pause the auto-dismiss countdown; the
    // toast itself is not an interactive control.
    // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus pause auto-dismiss, they do not make the card interactive
    <div
      ref={setCardRef}
      className={classNames("snui-toast", `snui-toast--${tone}`)}
      data-snui-toast-key={key}
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
            <div className="snui-toast__title" id={titleId}>
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
        // Every card names its button "Dismiss", so the description is what
        // tells a screen reader user which notification this one closes.
        aria-describedby={titleId}
        onClick={() => {
          beginExit();
        }}
      >
        {/*
          A multiplication X rather than the danger tone glyph, which is the
          same character: a danger toast would otherwise paint the mark twice
          and the second one would read as part of the tone.
        */}
        <span aria-hidden="true">✕</span>
      </Button>
    </div>
  );
}

/**
 * Memoized so one arrival re-renders only the card it changed: `item`, `queue`,
 * and the two labels are stable for a surviving card, and the other four cards
 * in a full queue have no work to do. The cast restores the generic signature
 * that `memo` erases.
 */
const ToastCard = memo(ToastCardImpl) as typeof ToastCardImpl;

/** Landmark name for a region whose caller and panel bundle both leave it out. */
const DEFAULT_TOAST_REGION_LABEL = "Notifications";

export interface ToastRegionProps<T extends ToastContent = ToastContent>
  extends Omit<
      HTMLAttributes<HTMLElement>,
      "aria-label" | "children" | "dangerouslySetInnerHTML" | "role"
    >,
    RefAttributes<HTMLElement> {
  readonly queue: ToastQueue<T>;
  /** Accessible name for the landmark. Defaults to "Notifications". */
  readonly label?: string | undefined;
  /** Accessible name for each toast's dismiss button. Defaults to "Dismiss". */
  readonly dismissLabel?: string | undefined;
  /**
   * Auto-dismiss delay, in milliseconds, for this region's toasts that carry
   * no `duration` of their own and whose tone is not sticky. Defaults to 5000.
   * Raise it for a panel read at arm's length on a helm tablet, where a touch
   * pointer cannot hover to hold a notice open. Zero keeps those toasts until
   * they are dismissed; queue eviction still reads each toast's own duration,
   * so a toast held open this way does not become sticky-critical.
   */
  readonly defaultDuration?: number | undefined;
}

/**
 * Renders a queue's toasts, newest first, into the nearest PanelRoot portal
 * container so the scoped styles and theme reach them. The notifications
 * landmark exists only while the queue has toasts, so an empty region adds
 * nothing to the landmark list, and the ref resolves only then. Rendering
 * outside a PanelRoot throws because a body portal would lose scoped styles
 * and tokens.
 *
 * One queue feeds one region: a second region bound to the same queue renders,
 * announces, and times out every toast in it a second time.
 */
export function ToastRegion<T extends ToastContent = ToastContent>({
  className,
  defaultDuration,
  dismissLabel,
  label,
  onBlur,
  onFocus,
  queue,
  ref,
  ...props
}: ToastRegionProps<T>): React.JSX.Element | null {
  const bundledRegionLabels = usePanelLabels()?.toastRegion;
  // A label the caller wrote is refused when it is blank, because a landmark
  // named nothing is a mistake rather than a request for the default; the
  // bundle and the package default fill an absent one.
  const effectiveLabel =
    label === undefined
      ? resolveLabel(bundledRegionLabels?.label, DEFAULT_TOAST_REGION_LABEL)
      : label.trim();
  if (!effectiveLabel) {
    throw new Error("ToastRegion requires a non-empty label.");
  }

  useModuleStyles(TOAST_STYLES, "ToastRegion");
  const toasts = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    getServerToasts,
  );
  const panelRoot = usePanelPortalContainer("ToastRegion");
  const host = useToastHost(panelRoot);

  const regionRef = useRef<HTMLElement | null>(null);
  const setRegionRef = useNodeRef(regionRef, ref);

  // The key of the card that contains focus, or null, with its position among
  // the cards that are not leaving. A removed card fires no blur, so both
  // outlive the card and tell the effect below where focus was. The position
  // is counted over the same live list the effect reads, so the two agree
  // while another card is mid-exit.
  const focusedKeyRef = useRef<string | null>(null);
  const focusedIndexRef = useRef(-1);

  const showing = toasts.length > 0;
  // The host measures nothing while it holds no cards, so the first card of a
  // burst asks for the measurement that positions it.
  useLayoutEffect(() => {
    if (showing) host?.measure();
  }, [host, showing]);

  // When the focused card leaves the queue, focus moves to the card that now
  // occupies its slot (the next older one, else the newest remaining), and
  // when none remains it returns to where it was before entering the host.
  useLayoutEffect(() => {
    const focusedKey = focusedKeyRef.current;
    if (focusedKey === null || host === null) return;
    if (toasts.some((item) => item.key === focusedKey)) return;
    const focusedIndex = focusedIndexRef.current;
    focusedKeyRef.current = null;
    focusedIndexRef.current = -1;
    const survivors =
      regionRef.current?.querySelectorAll<HTMLElement>(
        LIVE_TOAST_CARD_SELECTOR,
      ) ?? [];
    // Past the end of the list there is no next older card, so the newest
    // remaining notification takes the focus rather than the bottom of the
    // stack.
    const slot =
      focusedIndex >= 0 && focusedIndex < survivors.length ? focusedIndex : 0;
    const dismiss =
      survivors[slot]?.querySelector<HTMLElement>(TOAST_DISMISS_SELECTOR) ??
      null;
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
      if (focusedKeyRef.current !== null) host?.restoreFocus();
    };
  }, [host]);

  if (host === null || !showing) return null;

  // Newest first, without copying the snapshot, and only once there is a host
  // to mount the cards into.
  const cards: React.JSX.Element[] = [];
  for (let index = toasts.length - 1; index >= 0; index -= 1) {
    const item = toasts[index];
    if (item === undefined) continue;
    cards.push(
      <ToastCard
        key={item.key}
        item={item}
        queue={queue}
        defaultDuration={defaultDuration}
        dismissLabel={dismissLabel}
      />,
    );
  }

  return createPortal(
    // A labeled section is the notifications landmark.
    <section
      {...props}
      ref={setRegionRef}
      className={classNames("snui-toast-region", className)}
      aria-label={effectiveLabel}
      onFocus={(event) => {
        const card = event.target.closest<HTMLElement>(TOAST_CARD_SELECTOR);
        const live = event.currentTarget.querySelectorAll(
          LIVE_TOAST_CARD_SELECTOR,
        );
        focusedKeyRef.current = card?.dataset.snuiToastKey ?? null;
        focusedIndexRef.current =
          card === null ? -1 : Array.prototype.indexOf.call(live, card);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedKeyRef.current = null;
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
