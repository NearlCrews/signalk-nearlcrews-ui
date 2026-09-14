import { createContext, type ReactNode, useContext } from "react";

/**
 * A context reduced to the two things every reader of one needs.
 *
 * The provider's props are written inline rather than as a named type, so the
 * emitted declaration for a provider a module re-exports carries the shape
 * itself instead of a name the consumer cannot reach.
 */
export interface ValueContext<T> {
  readonly Provider: (props: {
    // Optional so a caller building the provider with `createElement` can pass
    // its children as arguments, which is the canonical form.
    readonly children?: ReactNode | undefined;
    readonly value: T;
  }) => React.JSX.Element;
  readonly useValue: () => T;
}

/**
 * Creates a context that always has a value, with its provider and its
 * reader. Destructure it at module scope so the reader is named for what it
 * reads, for example `useHeadingLevel`.
 */
export function createValueContext<T>(defaultValue: T): ValueContext<T> {
  const Context = createContext(defaultValue);
  return {
    Provider: ({ children, value }) => (
      <Context value={value}>{children}</Context>
    ),
    useValue: () => useContext(Context),
  };
}

/** A context whose reader refuses to answer outside its provider. */
export interface RequiredContext<T> {
  readonly Provider: ValueContext<T>["Provider"];
  /** Reads the value, naming the component that asked in the failure. */
  readonly useValue: (component: string) => T;
  /**
   * Reads the value, or null outside the provider, for the one part that
   * renders either way and must not refuse.
   */
  readonly useOptionalValue: () => T | null;
}

/**
 * Creates a context a part cannot be rendered without.
 *
 * A composed part outside its owner is a caller error rather than a state to
 * render, and the message has to name both ends to be actionable, so the one
 * wording is written here instead of in each part.
 */
export function createRequiredContext<T>(
  displayName: string,
): RequiredContext<T> {
  const Context = createContext<T | null>(null);
  return {
    Provider: ({ children, value }) => (
      <Context value={value}>{children}</Context>
    ),
    useOptionalValue: () => useContext(Context),
    useValue: (component: string): T => {
      const value = useContext(Context);
      if (value === null) {
        throw new Error(`${component} must be rendered inside ${displayName}.`);
      }
      return value;
    },
  };
}
