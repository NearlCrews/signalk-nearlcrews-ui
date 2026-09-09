/**
 * One interval per tick length, shared by everything reading that cadence.
 *
 * A panel showing twenty relative ages used to run twenty timers, each started
 * at its own mount and firing at its own offset, so the panel re-rendered
 * twenty times per tick window. They now share one timer per cadence and are
 * told the same instant, which React commits as a single update.
 */

type Tick = (nowMs: number) => void;

interface SharedClock {
  readonly listeners: Set<Tick>;
  readonly interval: ReturnType<typeof setInterval>;
}

const clocks = new Map<number, SharedClock>();

/**
 * Subscribes to the clock ticking every `tickMs`, starting it when nothing
 * else reads that cadence and stopping it when the last reader leaves. The
 * new listener is told the current instant at once. Returns the unsubscribe.
 */
export function subscribeToClock(tickMs: number, onTick: Tick): () => void {
  let clock = clocks.get(tickMs);
  if (clock === undefined) {
    const listeners = new Set<Tick>();
    clock = {
      listeners,
      interval: setInterval(() => {
        const nowMs = Date.now();
        // Set iteration tolerates a listener unsubscribing mid-tick, which is
        // what an age that unmounts on its own update does.
        for (const listener of listeners) listener(nowMs);
      }, tickMs),
    };
    clocks.set(tickMs, clock);
  }

  const { listeners, interval } = clock;
  listeners.add(onTick);
  // Reading the clock on subscribe keeps a resumed reader current: React tears
  // the effects of a hidden Activity down and replays them on the way back, so
  // an age inside a collapsed section would otherwise show the instant from
  // before the pause until the cadence next fired.
  onTick(Date.now());
  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0 && clocks.get(tickMs)?.interval === interval) {
      clearInterval(interval);
      clocks.delete(tickMs);
    }
  };
}
