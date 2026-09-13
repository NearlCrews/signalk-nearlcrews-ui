import {
  type RefCallback,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

/** What one field spreads to join a panel's validity bookkeeping. */
export interface FieldValidityHandlers {
  /** Give this to the field's `onValidityChange`. */
  readonly onValidityChange: (valid: boolean) => void;
  /**
   * Give this to the field's `ref`. React runs its cleanup when the field
   * leaves the tree, which is what releases the entry.
   */
  readonly ref: RefCallback<unknown>;
}

/** A panel's live view of which of its fields hold an unusable draft. */
export interface FieldValidity {
  /** Names of the fields whose current draft is invalid. */
  readonly invalidFields: ReadonlySet<string>;
  /** The handlers one field spreads. Stable across renders per name. */
  readonly register: (field: string) => FieldValidityHandlers;
  /** Whether every field still on screen holds a committable draft. */
  readonly valid: boolean;
}

const NO_INVALID_FIELDS: ReadonlySet<string> = new Set<string>();

/**
 * Tracks which fields of a panel are currently invalid, so a Save action can
 * be gated on all of them at once.
 *
 * A field reports validity on transitions only and never from an unmount, so
 * a conditionally rendered field that disappears while invalid would otherwise
 * keep a save blocked by a message no one can see. The entry is released by
 * the ref cleanup rather than by a per-field effect in every panel.
 *
 * ```tsx
 * const validity = useFieldValidity();
 * <NumberField {...validity.register("quota")} label="Daily calls" ... />
 * <SaveActionBar disabled={!validity.valid} ... />
 * ```
 */
export function useFieldValidity(): FieldValidity {
  const [invalidFields, setInvalidFields] =
    useState<ReadonlySet<string>>(NO_INVALID_FIELDS);
  const registered = useRef(new Map<string, FieldValidityHandlers>());

  const setInvalid = useCallback((field: string, invalid: boolean): void => {
    setInvalidFields((current) => {
      if (current.has(field) === invalid) return current;
      const next = new Set(current);
      if (invalid) next.add(field);
      else next.delete(field);
      return next;
    });
  }, []);

  const register = useCallback(
    (field: string): FieldValidityHandlers => {
      // One handler pair per name for the life of the panel, so a field is
      // not detached and reattached on every render of its owner.
      const existing = registered.current.get(field);
      if (existing !== undefined) return existing;

      const handlers: FieldValidityHandlers = {
        onValidityChange: (fieldValid) => {
          setInvalid(field, !fieldValid);
        },
        ref: () => () => {
          registered.current.delete(field);
          setInvalid(field, false);
        },
      };
      registered.current.set(field, handlers);
      return handlers;
    },
    [setInvalid],
  );

  return useMemo(
    () => ({ invalidFields, register, valid: invalidFields.size === 0 }),
    [invalidFields, register],
  );
}
