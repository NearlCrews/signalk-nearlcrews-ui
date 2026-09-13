/** A listener set with the two operations every store in the package needs. */
export interface Emitter<Args extends readonly unknown[] = []> {
  /** Calls every current listener with the same arguments. */
  readonly emit: (...args: Args) => void;
  /** How many listeners are subscribed, for a store that stops when empty. */
  readonly size: () => number;
  /** Registers a listener and returns its unsubscribe. */
  readonly subscribe: (listener: (...args: Args) => void) => () => void;
}

/**
 * Creates a listener set.
 *
 * The theme store, the toast queue, and the shared clock all keep listeners
 * and notify them, and each one used to hand-write the add, the delete, and
 * the iteration. Set iteration tolerates a listener unsubscribing mid-emit,
 * which is what a subscriber that unmounts on its own notification does.
 */
export function createEmitter<
  Args extends readonly unknown[] = [],
>(): Emitter<Args> {
  const listeners = new Set<(...args: Args) => void>();
  return {
    emit: (...args) => {
      for (const listener of listeners) listener(...args);
    },
    size: () => listeners.size,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
