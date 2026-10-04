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
import {
  type FoundationTokenName,
  TRANSITION_FAST_MS,
} from "../styles/tokens.js";
import { useModuleStyles } from "../styles/use-module-styles.js";
import {
  type AnnouncementMode,
  messageLogAttributes,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import {
  createDocumentRegistry,
  type DocumentRegistryRecord,
  once,
} from "../utils/document-registry.js";
import { createEmitter } from "../utils/emitter.js";
import { packageError } from "../utils/errors.js";
import { focusPanelRoot, isElementNode } from "../utils/focus.js";
import {
  DEFAULT_DISMISS_LABEL,
  resolveBundledLabel,
  resolveLabel,
} from "../utils/labels.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { TOAST_REGION_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { usePanelPortalContainer } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { LIVE_REGION_BLANK_MS } from "../utils/repeat-announcement.js";
import { isTimerDelay } from "../utils/shared-clock.js";
import { joinSentences } from "../utils/text.js";
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
/** The token the card's exit transition runs on. */
const TOAST_EXIT_TRANSITION_TOKEN: FoundationTokenName =
  "--snui-transition-fast";
/** The first CSS time in a token, such as "140ms" or "0.2s". */
const CSS_TIME_PATTERN = /([\d.]+)\s*(ms|s)\b/;
const TOAST_TITLE_MESSAGE = "Toast requires a non-empty title.";

const TOAST_CARD_SELECTOR = ".snui-toast";
/** A card that is not already leaving; exiting cards are never focus targets. */
const LIVE_TOAST_CARD_SELECTOR = `${TOAST_CARD_SELECTOR}:not([data-exiting])`;
const TOAST_DISMISS_SELECTOR = ".snui-toast__dismiss";
/** The dismiss button of a card that is not already leaving. */
const LIVE_TOAST_DISMISS_SELECTOR = `${LIVE_TOAST_CARD_SELECTOR} ${TOAST_DISMISS_SELECTOR}`;
/** A notifications landmark in the host, which only a showing region places. */
const TOAST_REGION_SELECTOR = ":scope > .snui-toast-region";
const TOAST_TITLE_SELECTOR = ".snui-toast__title";
const TOAST_DESCRIPTION_SELECTOR = ".snui-toast__description";
/** What assistive technology skips inside a card's text. */
const HIDDEN_FROM_READERS_SELECTOR = '[aria-hidden="true"], [hidden]';

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
 * region's default, or five seconds, in that order. A delay no timer can wait
 * would fire at once, so it reads as zero here, where the countdown and the
 * queue's eviction both take their answer, and the toast is sticky to both.
 */
function resolveToastDuration(
  content: ToastContent,
  defaultDuration: number = DEFAULT_TOAST_DURATION_MS,
): number {
  const duration =
    content.duration ??
    (STICKY_TONES.has(resolveToastTone(content)) ? 0 : defaultDuration);
  return isTimerDelay(duration) ? duration : 0;
}

/** Assertive only for danger; a warning in a configuration panel can wait. */
function resolveToastLive(content: ToastContent): AnnouncementMode {
  return (
    content.live ??
    (resolveToastTone(content) === "danger" ? "assertive" : "polite")
  );
}

/**
 * How long a card's exit transition runs, read from the token the card
 * resolves, so a consumer who changes the transition's duration moves the
 * fallback with it. A missing or unparseable token reads as the package
 * default.
 */
function exitTransitionMs(view: Window, card: HTMLElement | null): number {
  if (card === null) return TRANSITION_FAST_MS;
  const match = CSS_TIME_PATTERN.exec(
    view.getComputedStyle(card).getPropertyValue(TOAST_EXIT_TRANSITION_TOKEN),
  );
  if (match === null) return TRANSITION_FAST_MS;
  const duration = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  return Number.isFinite(duration) ? duration : TRANSITION_FAST_MS;
}

/** The modes a toast is spoken in; "off" speaks nothing. */
type ToastAnnouncementMode = Exclude<AnnouncementMode, "off">;

/**
 * Speaks a toast's words and returns the call that takes them away again.
 * Called once per toast while it is queued.
 */
type AnnounceToast = (mode: ToastAnnouncementMode, text: string) => () => void;

/**
 * The words an element shows assistive technology: its text, less anything
 * hidden from readers, such as the decorative tone glyph. Text nodes join as
 * they render, so inline markup inside a word does not split it.
 */
function spokenText(element: Element | null): string {
  if (element === null) return "";
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === node.TEXT_NODE) {
      text += node.textContent ?? "";
    } else if (
      isElementNode(node) &&
      !node.matches(HIDDEN_FROM_READERS_SELECTOR)
    ) {
      text += spokenText(node);
    }
  }
  return text;
}

/** The persistent regions a host speaks through, and their lifecycle. */
interface ToastAnnouncer {
  readonly announce: AnnounceToast;
  readonly dispose: () => void;
  readonly regions: readonly HTMLDivElement[];
  /** Starts the blank beat again, for regions that were just inserted. */
  readonly restart: () => void;
}

function createAnnouncementRegion(
  ownerDocument: Document,
  mode: ToastAnnouncementMode,
): HTMLDivElement {
  const region = ownerDocument.createElement("div");
  // A message log, like the panel announcer's: each toast adds a line of its
  // own, and only that line is read.
  const attributes = messageLogAttributes(mode);
  region.className = attributes.className;
  region.setAttribute("role", attributes.role);
  region.setAttribute("aria-atomic", attributes["aria-atomic"]);
  return region;
}

/**
 * One polite and one assertive region, mounted with the host and empty until
 * a toast arrives. A region created together with its words is not announced
 * reliably, and a card is created together with its toast, so the words are
 * spoken from here rather than from the card. A region that was inserted
 * less than a beat ago holds its lines back until the beat has passed.
 */
function createToastAnnouncer(
  ownerDocument: Document,
  ownerWindow: Window | null,
): ToastAnnouncer {
  const regions: Record<ToastAnnouncementMode, HTMLDivElement> = {
    polite: createAnnouncementRegion(ownerDocument, "polite"),
    assertive: createAnnouncementRegion(ownerDocument, "assertive"),
  };
  // Lines waiting for the beat, in arrival order, with the region each joins.
  const pending = new Map<HTMLElement, HTMLDivElement>();
  // A document with no window has no clock to wait on and no reader.
  let settled = ownerWindow === null;
  let beat: TimerId | null = null;

  const settle = (): void => {
    beat = null;
    settled = true;
    for (const [line, region] of pending) region.append(line);
    pending.clear();
  };

  return {
    announce: (mode, text) => {
      const line = ownerDocument.createElement("div");
      line.textContent = text;
      if (settled) regions[mode].append(line);
      else pending.set(line, regions[mode]);
      return () => {
        pending.delete(line);
        line.remove();
      };
    },
    dispose: () => {
      if (beat !== null) ownerWindow?.clearTimeout(beat);
      beat = null;
      pending.clear();
    },
    regions: [regions.polite, regions.assertive],
    restart: () => {
      if (ownerWindow === null) return;
      settled = false;
      if (beat !== null) ownerWindow.clearTimeout(beat);
      beat = ownerWindow.setTimeout(settle, LIVE_REGION_BLANK_MS);
    },
  };
}

interface ToastHostHandle {
  /** Speaks a toast through the host's persistent region for its mode. */
  readonly announce: AnnounceToast;
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

/** The custom property each measured host length is written to. */
const TOAST_HOST_LENGTH_PROPERTIES = [
  ["--snui-toast-host-top", "top"],
  ["--snui-toast-host-bottom", "bottom"],
  ["--snui-toast-host-left", "left"],
  ["--snui-toast-host-width", "width"],
] as const satisfies readonly (readonly [
  string,
  Exclude<keyof ToastHostPlacement, "visible">,
])[];

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
  // The announcing regions lead the host, so they exist before any toast and
  // sit outside every notifications landmark. Both are visually hidden and
  // out of flow, so the stack lays out as it did without them.
  const announcer = createToastAnnouncer(ownerDocument, ownerWindow);
  element.append(...announcer.regions);
  // The registry attaches the record itself whenever an acquire finds the
  // element disconnected, so the insertion keeps one owner. The host precedes
  // the panel content so the notifications landmark is one Tab from the panel
  // start; it is fixed-positioned, so the position changes only the focus
  // order. Every insertion is new to a screen reader, so the regions wait
  // out the blank beat again.
  const attach = (): void => {
    panelRoot.insertBefore(
      element,
      panelRoot.querySelector(":scope > .snui-root__content"),
    );
    announcer.restart();
  };

  if (ownerWindow === null) {
    return {
      attach,
      dispose: () => {
        element.remove();
      },
      element,
      value: {
        announce: announcer.announce,
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
    // A host with no notifications landmark paints nothing, so a panel whose
    // queue has never held a toast pays no panel rectangle and no style write
    // on a scroll frame.
    if (element.querySelector(TOAST_REGION_SELECTOR) === null) return;
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
    for (const [property, length] of TOAST_HOST_LENGTH_PROPERTIES) {
      element.style.setProperty(property, `${String(next[length])}px`);
    }
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
    const control = element.querySelector<HTMLElement>(
      LIVE_TOAST_DISMISS_SELECTOR,
    );
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
      announcer.dispose();
      stopObserving();
      element.removeEventListener("focusin", rememberFocusOrigin);
      ownerDocument.removeEventListener("keydown", handleLandmarkKey);
      element.remove();
    },
    element,
    value: { announce: announcer.announce, element, measure, restoreFocus },
  };
}

// Version 3 of the key: the host handle gained `announce`, so this copy never
// reads a host a 0.12.x copy in the same document created without one.
const TOAST_HOSTS = createDocumentRegistry<HTMLElement, ToastHostHandle>(
  "signalk-nearlcrews-ui.toast-host-registry.v3",
);

/** A server render has no document to host toasts in. */
function getServerToastHost(): null {
  return null;
}

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

  return useSyncExternalStore(subscribe, getSnapshot, getServerToastHost);
}

export interface ToastContent {
  readonly title: ReactNode;
  readonly description?: ReactNode | undefined;
  /** Defaults to "info". */
  readonly tone?: SemanticTone | undefined;
  /**
   * Auto-dismiss delay in milliseconds. Defaults to 5000 for the info and
   * success tones and to zero for warning and danger. Zero keeps the toast
   * until it is dismissed explicitly, and so does a delay no timer can wait:
   * a negative, NaN, Infinity, or more than 2,147,483,647.
   */
  readonly duration?: number | undefined;
  /**
   * Announcement mode: which of the host's two regions speaks the toast, or
   * "off" to show it without speaking. Defaults to assertive for the danger
   * tone, polite otherwise.
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
 * Index of the queued toast that makes room for the arrival, or -1 when the
 * queue keeps everything it holds and the arrival is refused. A focused toast
 * is never the one chosen.
 */
function chooseToastToEvict<T extends ToastContent>(
  queued: readonly QueuedToast<T>[],
  incomingPriority: number,
): number {
  let candidateIndex = -1;
  let candidatePriority = Number.POSITIVE_INFINITY;
  for (const [index, item] of queued.entries()) {
    if (FOCUSED_TOAST_COUNTS.has(item.key)) continue;
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
        // Chosen among the toasts already queued, which keep their indices
        // in `next`; the arrival is last.
        const index = chooseToastToEvict(
          snapshot,
          toastRetentionPriority(content),
        );
        if (index === -1) {
          options.onEvict?.({ reason: "rejected", toast: queued });
          return key;
        }
        [dropped] = next.splice(index, 1);
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
  /** Already resolved by the region, so every card reads the same one. */
  readonly dismissLabel: string;
}

function ToastCardImpl<T extends ToastContent>({
  defaultDuration,
  dismissLabel,
  item,
  queue,
}: ToastCardProps<T>): React.JSX.Element {
  const { content, key } = item;
  const tone = resolveToastTone(content);
  // Latched as the card mounts, so a region default that changes later times
  // the toasts raised after it and leaves this one's countdown, and whatever
  // is holding it paused, alone.
  const [duration] = useState(() =>
    resolveToastDuration(content, defaultDuration),
  );
  const titleId = useId();

  // The queue already rejected a blank title in enqueue; this guards content
  // that reached the region without passing through it.
  requireContent(content.title, TOAST_TITLE_MESSAGE);

  const [exiting, setExiting] = useState(false);
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

  // The transition end removes the card; this timer is the fallback for an
  // engine that never fires one, and the whole exit under reduced motion.
  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!exiting || view === null) return undefined;
    const delay = prefersReducedMotion(view)
      ? 0
      : exitTransitionMs(view, cardRef.current) + TOAST_EXIT_FALLBACK_BUFFER_MS;
    const timer = view.setTimeout(finishExit, delay);
    exitTimerRef.current = timer;
    return () => {
      view.clearTimeout(timer);
      exitTimerRef.current = null;
    };
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
      {/*
        Not a live region: the host speaks these words from a region that
        already existed, and a card that announced itself would be read again
        when focus enters it.
      */}
      <div className="snui-toast__text">
        <div className="snui-toast__title" id={titleId}>
          <ToneMark
            tone={tone}
            toneLabel={content.toneLabel}
            className="snui-toast__tone-glyph"
          />
          {content.title}
        </div>
        {hasReactContent(content.description) ? (
          <div className="snui-toast__description">{content.description}</div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="compact"
        iconOnly
        className="snui-toast__dismiss"
        aria-label={dismissLabel}
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
 * the default duration, and the resolved dismiss label are stable for a
 * surviving card, and the other four cards in a full queue have no work to do.
 * The cast restores the generic signature that `memo` erases.
 */
const ToastCard = memo(ToastCardImpl) as typeof ToastCardImpl;

/** The card that holds focus inside a region. */
interface FocusedToastCard {
  /**
   * Its position among the cards that are not leaving, or -1 when it is
   * leaving itself. Counted over the same live list the region reads when the
   * card goes, so the two agree while another card is mid-exit.
   */
  readonly index: number;
  readonly key: string;
}

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
   * pointer cannot hover to hold a notice open. Zero, or a delay no timer can
   * wait, keeps those toasts until they are dismissed; queue eviction still
   * reads each toast's own duration, so a toast held open this way does not
   * become sticky-critical. A change applies to the toasts raised after it:
   * one already showing keeps the delay it arrived with.
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
 * A toast is spoken once, as text, through one polite and one assertive
 * region that the panel's toast host mounts before any toast arrives; the
 * cards themselves are not live regions, so focus entering one reads it once.
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
      ? resolveLabel(
          bundledRegionLabels?.label,
          TOAST_REGION_LABEL_DEFAULTS.label,
        )
      : label.trim();
  if (!effectiveLabel) {
    throw packageError("ToastRegion requires a non-empty label.");
  }
  const effectiveDismissLabel = resolveBundledLabel(
    dismissLabel,
    bundledRegionLabels?.dismiss,
    DEFAULT_DISMISS_LABEL,
  );

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

  // The card that contains focus, or null. A removed card fires no blur, so
  // the record outlives the card and tells the effect below where focus was.
  const focusedCardRef = useRef<FocusedToastCard | null>(null);

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
    const focused = focusedCardRef.current;
    if (focused === null || host === null) return;
    if (toasts.some((item) => item.key === focused.key)) return;
    focusedCardRef.current = null;
    const survivors =
      regionRef.current?.querySelectorAll<HTMLElement>(
        LIVE_TOAST_CARD_SELECTOR,
      ) ?? [];
    // Past the end of the list there is no next older card, so the newest
    // remaining notification takes the focus rather than the bottom of the
    // stack.
    const { index } = focused;
    const slot = index >= 0 && index < survivors.length ? index : 0;
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
      if (focusedCardRef.current !== null) host?.restoreFocus();
    };
  }, [host]);

  // Each toast is spoken once, through the host's region for its mode, in
  // the order the queue received it: cards stack newest first, so a burst
  // spoken card by card would read backwards. The words are read from the
  // rendered card, which has resolved the tone name and any component in the
  // title, and only text is copied, never a control. A toast's line leaves
  // with the toast.
  const [spoken] = useState(() => new Map<string, () => void>());
  useEffect(() => {
    const queued = new Set<string>();
    for (const item of toasts) {
      queued.add(item.key);
      if (host === null || spoken.has(item.key)) continue;
      const live = resolveToastLive(item.content);
      const card =
        regionRef.current?.querySelector(
          `[data-snui-toast-key="${item.key}"]`,
        ) ?? null;
      if (live === "off" || card === null) {
        spoken.set(item.key, () => undefined);
        continue;
      }
      const text = joinSentences([
        spokenText(card.querySelector(TOAST_TITLE_SELECTOR)),
        spokenText(card.querySelector(TOAST_DESCRIPTION_SELECTOR)),
      ]);
      spoken.set(item.key, host.announce(live, text));
    }
    for (const [key, silence] of spoken) {
      if (queued.has(key)) continue;
      silence();
      spoken.delete(key);
    }
  }, [host, spoken, toasts]);

  // A region that unmounts, or moves to another host, takes its lines along.
  useEffect(
    () => () => {
      for (const silence of spoken.values()) silence();
      spoken.clear();
    },
    [host, spoken],
  );

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
        dismissLabel={effectiveDismissLabel}
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
        const key = card?.dataset.snuiToastKey;
        focusedCardRef.current =
          key === undefined
            ? null
            : {
                index: Array.prototype.indexOf.call(
                  event.currentTarget.querySelectorAll(
                    LIVE_TOAST_CARD_SELECTOR,
                  ),
                  card,
                ),
                key,
              };
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedCardRef.current = null;
        }
        onBlur?.(event);
      }}
    >
      {cards}
    </section>,
    host.element,
  );
}
