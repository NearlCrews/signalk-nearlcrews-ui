import {
  type RefCallback,
  useCallback,
  useLayoutEffect,
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
   * leaves the tree, which is what releases the entry, and the node it
   * receives is where `firstInvalid` looks for the control to focus.
   */
  readonly ref: RefCallback<unknown>;
}

/** A panel's live view of which of its fields hold an unusable draft. */
export interface FieldValidity {
  /**
   * The control of the first invalid field on screen, in document order, or
   * null when no invalid field on screen has a control to focus, which
   * includes a field that joined through `onValidityChange` alone. A panel
   * refusing a save returns it from `SaveActionBar.onSave`, where null leaves
   * focus to the bar's status, or hands it to `revealAndFocus`, so focus lands
   * on the problem rather than on the Save button.
   */
  readonly firstInvalid: () => HTMLElement | null;
  /** Names of the fields whose current draft is invalid. */
  readonly invalidFields: ReadonlySet<string>;
  /**
   * The handlers one field spreads, stable across renders for as long as a
   * field with that name stays on the page; a name whose field has left
   * registers afresh.
   */
  readonly register: (field: string) => FieldValidityHandlers;
  /** Whether every field still on screen holds a committable draft. */
  readonly valid: boolean;
}

/** What the hook remembers about one registered field. */
interface FieldRecord {
  /** Whether the field's ref is attached, which is whether it is on screen. */
  attached: boolean;
  /** The node the field's ref last received. */
  node: unknown;
  /** The field's last reported validity. */
  valid: boolean;
}

const NO_INVALID_FIELDS: ReadonlySet<string> = new Set<string>();

/**
 * The control a field root holds: the one already marked invalid, then the
 * first form control, so a composite field root resolves to what it wraps.
 */
const INVALID_CONTROL = '[aria-invalid="true"]';
const FORM_CONTROL = "input, select, textarea, button, [tabindex]";

/** Whether a ref's node is still in its document. */
function isConnectedNode(node: unknown): boolean {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { readonly isConnected?: unknown }).isConnected === true
  );
}

/**
 * Whether a record belongs to a field that has left the page: detached and no
 * longer in the document. A field hidden by a retaining section is detached
 * but still connected, so it is kept.
 */
function isStaleRecord(record: FieldRecord | undefined): boolean {
  return (
    record !== undefined && !record.attached && !isConnectedNode(record.node)
  );
}

function focusTarget(node: unknown): HTMLElement | null {
  // The element type comes from the node's own window, so a panel rendered
  // into a second window still finds its controls.
  const view =
    typeof node === "object" && node !== null
      ? (node as Partial<Node>).ownerDocument?.defaultView
      : undefined;
  if (view === null || view === undefined) return null;
  if (!(node instanceof view.HTMLElement)) return null;
  if (node.matches(FORM_CONTROL)) return node;
  return (
    node.querySelector<HTMLElement>(INVALID_CONTROL) ??
    node.querySelector<HTMLElement>(FORM_CONTROL)
  );
}

/** Orders two nodes by where they sit in the document. */
function documentOrder(first: Node, second: Node): number {
  return first.compareDocumentPosition(second) &
    Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
}

/**
 * Tracks which fields of a panel are currently invalid, so a Save action can
 * be gated on all of them at once.
 *
 * A field reports validity on transitions only and never from an unmount, so
 * a conditionally rendered field that disappears while invalid would otherwise
 * keep a save blocked by a message no one can see. The entry is released by
 * the ref cleanup rather than by a per-field effect in every panel.
 *
 * A field hidden inside a retaining `CollapsibleSection` is released the same
 * way, because hiding detaches its ref, and it blocks again when the section
 * reopens: the reattached ref brings back the same node, which is how the
 * hook tells a revealed field from a new one that starts valid.
 *
 * ```tsx
 * const validity = useFieldValidity();
 * <NumberField {...validity.register("quota")} label="Daily calls" ... />
 * // Hold Save while any field is invalid:
 * <SaveActionBar
 *   invalidMessage={
 *     validity.valid ? null : "Enter a valid daily call limit to save."
 *   }
 *   ...
 * />
 * // Or validate on submit, and send focus to the first problem:
 * <SaveActionBar
 *   onSave={() => {
 *     if (!validity.valid) return validity.firstInvalid();
 *     save(configuration);
 *   }}
 *   ...
 * />
 * ```
 */
export function useFieldValidity(): FieldValidity {
  const [invalidFields, setInvalidFields] =
    useState<ReadonlySet<string>>(NO_INVALID_FIELDS);
  const registered = useRef(new Map<string, FieldValidityHandlers>());
  const records = useRef(new Map<string, FieldRecord>());

  const setInvalid = useCallback((field: string, invalid: boolean): void => {
    setInvalidFields((current) => {
      if (current.has(field) === invalid) return current;
      const next = new Set(current);
      if (invalid) next.add(field);
      else next.delete(field);
      return next;
    });
  }, []);

  /*
   * Forgets one name, or every name, whose field has left the page. Four
   * routes call it, one per way a field can leave: the ref cleanup, for a
   * field leaving while on screen; the sweep after each commit of the owner,
   * for a field removed while a retaining section hid it, where React runs
   * no second cleanup; a registration of the same name, for a hidden field
   * that left without its owner committing; and a registration of a new
   * name, for a field registered outside the owner's render, such as by a
   * child handed the validity, whose removal commits no owner render.
   */
  const forgetStale = useCallback((field?: string): void => {
    const names = field === undefined ? [...records.current.keys()] : [field];
    for (const name of names) {
      if (!isStaleRecord(records.current.get(name))) continue;
      records.current.delete(name);
      registered.current.delete(name);
    }
  }, []);

  const register = useCallback(
    (field: string): FieldValidityHandlers => {
      // One handler pair per name for as long as a field holds it, so a field
      // is not detached and reattached on every render of its owner.
      forgetStale(field);
      const existing = registered.current.get(field);
      if (existing !== undefined) return existing;
      forgetStale();

      const handlers: FieldValidityHandlers = {
        onValidityChange: (fieldValid) => {
          const record = records.current.get(field);
          if (record !== undefined) record.valid = fieldValid;
          // A hidden field is only remembered: it blocks again once shown.
          if (record === undefined || record.attached) {
            setInvalid(field, !fieldValid);
          }
        },
        ref: (node) => {
          const known = records.current.get(field);
          // The same node coming back is a hidden field shown again, whose
          // draft survived; any other node is a field that starts valid.
          const record: FieldRecord =
            known !== undefined && known.node === node
              ? known
              : { attached: true, node, valid: true };
          record.attached = true;
          records.current.set(field, record);
          if (!record.valid) setInvalid(field, true);
          return () => {
            record.attached = false;
            setInvalid(field, false);
            // The same cleanup runs when a retaining section hides the field,
            // whose node stays in the document, and when the field leaves the
            // tree for good, whose node does not. Once the commit has landed
            // the two can be told apart.
            queueMicrotask(() => {
              forgetStale(field);
            });
          };
        },
      };
      registered.current.set(field, handlers);
      return handlers;
    },
    [forgetStale, setInvalid],
  );

  // After every commit of the owner a node removed in it has left the
  // document, while a hidden one has not, so the sweep keeps hidden fields.
  useLayoutEffect(() => {
    forgetStale();
  });

  const firstInvalid = useCallback((): HTMLElement | null => {
    const nodes: HTMLElement[] = [];
    for (const record of records.current.values()) {
      if (record.attached && !record.valid) {
        const target = focusTarget(record.node);
        if (target !== null) nodes.push(target);
      }
    }
    nodes.sort(documentOrder);
    return nodes[0] ?? null;
  }, []);

  return useMemo(
    () => ({
      firstInvalid,
      invalidFields,
      register,
      valid: invalidFields.size === 0,
    }),
    [firstInvalid, invalidFields, register],
  );
}
