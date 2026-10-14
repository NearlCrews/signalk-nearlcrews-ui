import { ERROR_PREFIX } from "./errors.js";

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
 * and notify them, so the add, the delete, and the iteration are written once
 * here. An emit notifies the listeners subscribed when it began, once each:
 * one that unsubscribes mid-emit, as a subscriber that unmounts on its own
 * notification does, is skipped if it has not been reached, and one that
 * unsubscribes and subscribes again is not visited twice. A listener that
 * throws does not stop the rest; the error is rethrown once every listener
 * has run, and several are rethrown together.
 */
export function createEmitter<
  Args extends readonly unknown[] = [],
>(): Emitter<Args> {
  const listeners = new Set<(...args: Args) => void>();
  return {
    emit: (...args) => {
      let errors: unknown[] | undefined;
      for (const listener of [...listeners]) {
        if (!listeners.has(listener)) continue;
        try {
          listener(...args);
        } catch (error) {
          errors ??= [];
          errors.push(error);
        }
      }
      if (errors === undefined) return;
      if (errors.length === 1) throw errors[0];
      throw new AggregateError(
        errors,
        `${ERROR_PREFIX}${String(errors.length)} listeners threw while one change was announced.`,
      );
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
