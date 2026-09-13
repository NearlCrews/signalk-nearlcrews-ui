/**
 * One interval per tick length, shared by everything reading that cadence.
 *
 * A panel showing twenty relative ages used to run twenty timers, each started
 * at its own mount and firing at its own offset, so the panel re-rendered
 * twenty times per tick window. They now share one timer per cadence and are
 * told the same instant, which React commits as a single update.
 */

import { createEmitter, type Emitter } from "./emitter.js";

type Tick = (nowMs: number) => void;

interface SharedClock {
  interval: ReturnType<typeof setInterval> | undefined;
  readonly tickMs: number;
  readonly ticks: Emitter<[number]>;
}

const clocks = new Map<number, SharedClock>();

/** The document whose visibility the clocks follow, absent outside a browser. */
function clockDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

function documentHidden(): boolean {
  return clockDocument()?.hidden ?? false;
}

function startTicking(clock: SharedClock): void {
  if (clock.interval !== undefined) return;
  clock.interval = setInterval(() => {
    clock.ticks.emit(Date.now());
  }, clock.tickMs);
}

function stopTicking(clock: SharedClock): void {
  if (clock.interval === undefined) return;
  clearInterval(clock.interval);
  clock.interval = undefined;
}

/*
 * A hidden document has nobody reading its ages, so the clocks stop rather
 * than waking the main thread to re-render text nobody can see. Coming back
 * delivers one instant at once, the same catch-up a new subscriber gets, so a
 * panel revealed after an hour is never a tick behind.
 */
function followVisibility(): void {
  const hidden = documentHidden();
  for (const clock of clocks.values()) {
    if (hidden) {
      stopTicking(clock);
      continue;
    }
    startTicking(clock);
    clock.ticks.emit(Date.now());
  }
}

let watchingVisibility = false;

function watchVisibility(): void {
  const ownerDocument = clockDocument();
  if (watchingVisibility || ownerDocument === undefined) return;
  ownerDocument.addEventListener("visibilitychange", followVisibility);
  watchingVisibility = true;
}

function unwatchVisibility(): void {
  const ownerDocument = clockDocument();
  if (!watchingVisibility || ownerDocument === undefined) return;
  ownerDocument.removeEventListener("visibilitychange", followVisibility);
  watchingVisibility = false;
}

/**
 * Subscribes to the clock ticking every `tickMs`, starting it when nothing
 * else reads that cadence and stopping it when the last reader leaves. The
 * new listener is told the current instant at once. Returns the unsubscribe.
 *
 * A cadence that is not a positive finite number ticks not at all rather than
 * as fast as the engine allows: `setInterval` treats NaN as zero and clamps it
 * to about four milliseconds, so a `Number(setting) * 1000` that failed to
 * parse would re-render every age on the panel hundreds of times a second.
 */
export function subscribeToClock(tickMs: number, onTick: Tick): () => void {
  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    onTick(Date.now());
    return () => undefined;
  }

  let clock = clocks.get(tickMs);
  if (clock === undefined) {
    clock = { interval: undefined, tickMs, ticks: createEmitter<[number]>() };
    clocks.set(tickMs, clock);
    watchVisibility();
    if (!documentHidden()) startTicking(clock);
  }

  const started = clock;
  const unsubscribe = started.ticks.subscribe(onTick);
  // Reading the clock on subscribe keeps a resumed reader current: React tears
  // the effects of a hidden Activity down and replays them on the way back, so
  // an age inside a collapsed section would otherwise show the instant from
  // before the pause until the cadence next fired.
  onTick(Date.now());
  return () => {
    unsubscribe();
    if (started.ticks.size() > 0 || clocks.get(tickMs) !== started) return;

    stopTicking(started);
    clocks.delete(tickMs);
    if (clocks.size === 0) unwatchVisibility();
  };
}
