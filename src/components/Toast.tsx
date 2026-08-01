import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useUNSAFE_PortalContext } from "react-aria/PortalProvider";
import { createPortal } from "react-dom";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { prefersReducedMotion } from "../utils/motion.js";
import { usePortalContainerReady } from "../utils/portal.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import {
  resolveToneLabel,
  type SemanticTone,
  TONE_GLYPHS,
} from "../utils/tone.js";
import { Button } from "./Button.js";

/** Default auto-dismiss delay in milliseconds. */
const DEFAULT_TOAST_DURATION_MS = 5000;

/** Matches the toast exit transition in the overlay styles. */
const TOAST_EXIT_DURATION_MS = 150;

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
  /** Adds a toast and returns its key. */
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
      snapshot = [...snapshot, { key, content }];
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

  const countdownTimerRef = useRef<TimerId | null>(null);
  const exitTimerRef = useRef<TimerId | null>(null);
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const focusPausedRef = useRef(false);

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
    if (exitTimerRef.current !== null) return;
    stopCountdown();
    setExiting(true);
    // Reduced motion skips the exit transition, so removal follows in the
    // same tick.
    const reduceMotion = prefersReducedMotion(
      typeof window === "undefined" ? null : window,
    );
    exitTimerRef.current = window.setTimeout(
      () => {
        queue.dismiss(key);
      },
      reduceMotion ? 0 : TOAST_EXIT_DURATION_MS,
    );
  }, [queue, key, stopCountdown]);

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
  const effectiveDismissLabel = (dismissLabel?.trim() ?? "") || "Dismiss";

  return (
    // Pointer and focus handlers only pause the auto-dismiss countdown; the
    // toast itself is not an interactive control.
    // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus pause auto-dismiss, they do not make the card interactive
    <div
      className={classNames("snui-toast", `snui-toast--${tone}`)}
      role={region.role}
      aria-live={region["aria-live"]}
      data-exiting={exiting || undefined}
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
      <div className="snui-toast__text">
        {contentReady ? (
          <>
            <span className="snui-visually-hidden">{effectiveToneLabel}. </span>
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
 * container so the scoped styles and theme reach them. Outside a PanelRoot
 * the region falls back to the document body.
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
  const { getContainer } = useUNSAFE_PortalContext();

  // The portal container reads the panel root lazily, so it only resolves
  // once the commit has attached that ref. Outside a PanelRoot the region
  // falls back to the document body.
  const portalReady = usePortalContainerReady();
  const container = portalReady ? (getContainer?.() ?? document.body) : null;

  if (container === null) return null;

  return createPortal(
    // A labelled section is the notifications landmark.
    <section
      {...props}
      ref={ref}
      className={classNames("snui-toast-region", className)}
      aria-label={effectiveLabel}
    >
      {[...toasts].reverse().map((item) => (
        <ToastCard
          key={item.key}
          item={item}
          queue={queue}
          dismissLabel={dismissLabel}
        />
      ))}
    </section>,
    container,
  );
}
