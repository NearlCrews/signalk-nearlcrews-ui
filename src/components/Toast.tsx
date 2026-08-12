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
import {
  usePortalContainerReady,
  useUNSAFE_PortalContext,
} from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import {
  resolveToneLabel,
  type SemanticTone,
  TONE_GLYPHS,
} from "../utils/tone.js";
import { Button } from "./Button.js";
import { ToneAnnouncement } from "./ToneAnnouncement.js";

/** Default auto-dismiss delay in milliseconds. */
const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * Maximum queued toasts. Sticky toasts (duration zero) never time out, so
 * without a cap a chatty caller grows the queue, the mounted DOM, and the
 * subscriber notification cost without bound. Beyond the cap the oldest
 * toast drops to make room.
 */
const MAX_QUEUED_TOASTS = 5;

const TOAST_EXIT_FALLBACK_BUFFER_MS = 10;

/** Browser timer handle returned by window.setTimeout. */
type TimerId = number;

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
   * when it is full the oldest toast drops to make room.
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
      snapshot = [
        ...snapshot.slice(-(MAX_QUEUED_TOASTS - 1)),
        { key, content },
      ];
      emit();
      return key;
    },
    dismiss: (key) => {
      if (!snapshot.some((queued) => queued.key === key)) return;
      snapshot = snapshot.filter((queued) => queued.key !== key);
      emit();
    },
    clear: () => {
      if (snapshot.length === 0) return;
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
      stopCountdown();
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [startCountdown, stopCountdown]);

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
        setPaused("focus", true);
      }}
      onBlur={() => {
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
  const { getContainer } = useUNSAFE_PortalContext();
  const portalReady = usePortalContainerReady();
  if (getContainer === undefined || getContainer === null) {
    throw new Error("ToastRegion must be rendered inside PanelRoot.");
  }
  const resolveContainer = getContainer;

  // The portal container reads the panel root lazily, so it only resolves
  // once the commit has attached that ref.
  const container = portalReady ? resolveContainer() : null;

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
