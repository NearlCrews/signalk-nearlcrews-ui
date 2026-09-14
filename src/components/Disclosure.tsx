import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import {
  useFocusReturnOnClose,
  useOpenIntentLatch,
} from "../hooks/use-focus-return.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { hasAccessibleName, requireIdToken } from "../utils/aria.js";
import { focusIsOnBody } from "../utils/focus.js";
import type { MountStrategy } from "../utils/mount-strategy.js";
import { warnOnce } from "../utils/warn-once.js";
import { Button, type ButtonAsButtonProps } from "./Button.js";

export interface UseDisclosureOptions {
  readonly defaultOpen?: boolean | undefined;
  /**
   * Names the trigger, so code outside the pair can focus or query it
   * directly instead of hunting for it in the DOM. The panel keeps a
   * generated id unless `idPrefix` names one.
   */
  readonly id?: string | undefined;
  /**
   * Names both ends of the pair: the trigger becomes `<idPrefix>-trigger` and
   * the panel `<idPrefix>-panel`. Reach for it when a harness or a deep link
   * has to know either id before the panel renders.
   */
  readonly idPrefix?: string | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
}

export interface UseDisclosureResult {
  readonly open: boolean;
  /** Spread onto the disclosed container; it stays mounted so `aria-controls` resolves. */
  readonly panelProps: {
    readonly "aria-labelledby": string;
    readonly hidden: boolean;
    readonly id: string;
    readonly ref: (node: HTMLElement | null) => void;
    readonly role: "region";
    readonly tabIndex: -1;
  };
  readonly setOpen: (open: boolean) => void;
  readonly toggle: () => void;
  /** Spread onto the button that opens and closes the panel. */
  readonly triggerProps: {
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly id: string;
    readonly onClick: () => void;
    readonly ref: (node: HTMLButtonElement | null) => void;
  };
}

/**
 * Headless open state, ids, ARIA wiring, and focus handoff for a button that
 * reveals content which is not a heading section. Opening through `toggle` or
 * `setOpen` moves focus into the panel, and closing moves it back to the
 * trigger, so a keyboard user never lands on the body.
 *
 * A change the consumer makes by setting `open` directly moves no focus into
 * the panel, because nothing was pressed. Closing is different: the trigger
 * takes focus back whenever the panel held it at that moment, whoever caused
 * the change, because closing a panel that holds focus drops the reader on
 * the body. A Close button inside the panel wired to the consumer's own
 * setter is the ordinary way to hit that, and it is safe by construction. A
 * close while focus sits outside the panel still moves nothing.
 *
 * The trigger is the only destination for that handoff, so keep it mounted
 * for the lifetime of the disclosure. A pair that unmounts both at once has
 * nowhere to put focus, which development builds report.
 *
 * Both ids are generated unless `id` names the trigger or `idPrefix` names the
 * pair. `aria-labelledby` and `aria-controls` are written from whatever those
 * two ids resolve to, so naming one end cannot leave the wiring dangling.
 */
export function useDisclosure({
  defaultOpen = false,
  id,
  idPrefix,
  onOpenChange,
  open,
}: UseDisclosureOptions = {}): UseDisclosureResult {
  const generatedId = useId();
  const baseId =
    idPrefix === undefined
      ? generatedId
      : requireIdToken(idPrefix, "useDisclosure idPrefix");
  const triggerId =
    id === undefined
      ? `${baseId}-trigger`
      : requireIdToken(id, "useDisclosure id");
  const panelId = `${baseId}-panel`;
  const [effectiveOpen, commitOpen] = useControllableState(
    open,
    defaultOpen,
    onOpenChange,
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const openIntent = useOpenIntentLatch();

  const setOpen = useCallback(
    (next: boolean): void => {
      if (next === effectiveOpen) return;
      openIntent.arm(next);
      commitOpen(next);
    },
    [commitOpen, effectiveOpen, openIntent],
  );

  const toggle = useCallback((): void => {
    setOpen(!effectiveOpen);
  }, [effectiveOpen, setOpen]);

  // The trigger takes focus back whenever the panel held it as it closed.
  useFocusReturnOnClose(panelRef, effectiveOpen, {
    returnFocusRef: triggerRef,
  });

  /*
   * The panel takes focus for a press, in the commit phase, so the latch is
   * consumed before the microtask that drops it. Declared after the handoff
   * above so that one has already had its turn on a close.
   */
  useLayoutEffect(() => {
    const pressed = openIntent.consume(effectiveOpen);
    if (!effectiveOpen) {
      if (triggerRef.current === null) warnLostTrigger(panelRef.current);
      return;
    }
    if (pressed) panelRef.current?.focus();
  }, [effectiveOpen, openIntent]);

  const setTriggerNode = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);
  const setPanelNode = useCallback((node: HTMLElement | null) => {
    panelRef.current = node;
  }, []);

  return useMemo(
    () => ({
      open: effectiveOpen,
      panelProps: {
        "aria-labelledby": triggerId,
        hidden: !effectiveOpen,
        id: panelId,
        ref: setPanelNode,
        role: "region",
        tabIndex: -1,
      },
      setOpen,
      toggle,
      triggerProps: {
        "aria-controls": panelId,
        "aria-expanded": effectiveOpen,
        id: triggerId,
        onClick: toggle,
        ref: setTriggerNode,
      },
    }),
    [
      effectiveOpen,
      panelId,
      setOpen,
      setPanelNode,
      setTriggerNode,
      toggle,
      triggerId,
    ],
  );
}

/**
 * Reports a close that had nowhere to hand focus back to. The trigger is the
 * documented destination, so a pair that unmounts it along with the panel
 * drops the reader on the body with no keyboard route back. Reported only
 * when focus actually landed there, because a trigger that has simply not
 * mounted yet takes nothing away from anyone.
 */
function warnLostTrigger(panelNode: HTMLElement | null): void {
  if (panelNode === null || !focusIsOnBody(panelNode.ownerDocument)) return;
  warnOnce(
    "disclosure-lost-trigger",
    "useDisclosure closed a panel whose trigger is no longer mounted, so focus stayed on the document body. Keep the trigger mounted for the lifetime of the disclosure.",
  );
}

export type DisclosureContextValue = UseDisclosureResult;

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

/**
 * The disclosure a composed part belongs to: the one its `disclosure` prop
 * names, or the surrounding `Disclosure`. The prop exists because context
 * carries one value, so two disclosures sharing a row would have to nest and
 * the inner provider would answer for both triggers.
 */
function useResolvedDisclosure(
  component: string,
  supplied: UseDisclosureResult | undefined,
): DisclosureContextValue {
  const value = useContext(DisclosureContext);
  const resolved = supplied ?? value;
  if (resolved === null) {
    throw new Error(
      `${component} must be rendered inside Disclosure. Pass the useDisclosure result as the disclosure prop to place it outside one.`,
    );
  }
  return resolved;
}

/** Names the disclosure a part drives when context cannot carry it. */
interface DisclosurePartProps {
  /**
   * The `useDisclosure` result this part belongs to. Give it where two
   * disclosures share a row, so neither has to be the enclosing context.
   * Without it the part reads the surrounding `Disclosure`.
   */
  readonly disclosure?: UseDisclosureResult | undefined;
}

export interface DisclosureProps extends UseDisclosureOptions {
  readonly children: ReactNode;
}

/**
 * Pairs a `DisclosureTrigger` with a `DisclosurePanel` anywhere in its
 * subtree, so the two can sit in different rows of a layout. Wrap the hook
 * result yourself when the trigger is not a library Button.
 */
export function Disclosure({
  children,
  ...options
}: DisclosureProps): React.JSX.Element {
  const disclosure = useDisclosure(options);
  return <DisclosureContext value={disclosure}>{children}</DisclosureContext>;
}

export type DisclosureTriggerProps = Omit<
  ButtonAsButtonProps,
  "aria-controls" | "aria-expanded" | "as" | "href" | "id" | "onClick" | "ref"
> &
  DisclosurePartProps;

/** The library Button wired as the disclosure's toggle. */
export function DisclosureTrigger({
  disclosure,
  ...props
}: DisclosureTriggerProps): React.JSX.Element {
  const { triggerProps } = useResolvedDisclosure(
    "DisclosureTrigger",
    disclosure,
  );
  return <Button {...props} {...triggerProps} />;
}

export interface DisclosurePanelProps
  extends Omit<
      HTMLAttributes<HTMLElement>,
      "hidden" | "id" | "role" | "tabIndex"
    >,
    RefAttributes<HTMLElement>,
    DisclosurePartProps {
  /**
   * Under `"unmount"` the children leave the tree while closed; the container
   * stays so `aria-controls` still resolves. `"retain"`, the default, keeps
   * them mounted and hidden, and their effects keep running, unlike a
   * retaining `CollapsibleSection`, which pauses them.
   */
  readonly mountStrategy?: MountStrategy | undefined;
}

/**
 * The disclosed region. It is named by the trigger unless `aria-label` or
 * `aria-labelledby` is given, and it takes focus when opened through the
 * trigger so the reader arrives at the revealed content.
 */
export function DisclosurePanel({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  disclosure,
  mountStrategy = "retain",
  ref,
  ...props
}: DisclosurePanelProps): React.JSX.Element {
  const { open, panelProps } = useResolvedDisclosure(
    "DisclosurePanel",
    disclosure,
  );
  const { ref: setPanelNode, role, ...regionProps } = panelProps;
  const named = hasAccessibleName(ariaLabel, ariaLabelledBy);
  const panelRef = useRef<HTMLElement | null>(null);
  const publishPanelNode = useCallback(
    (node: HTMLElement) => {
      setPanelNode(node);
      return () => {
        setPanelNode(null);
      };
    },
    [setPanelNode],
  );
  // One callback for the whole mount: an inline arrow would be a new identity
  // every commit, which detaches and reattaches the consumer's ref, and its
  // returned cleanup would keep React from ever handing the hook a null.
  const attachPanel = useNodeRef(panelRef, ref, publishPanelNode);

  // A named section is a region; the explicit role keeps it one even when a
  // consumer's aria-label replaces the trigger-derived name.
  return (
    <section
      {...props}
      {...regionProps}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={named ? ariaLabelledBy : regionProps["aria-labelledby"]}
      className={className}
      ref={attachPanel}
    >
      {mountStrategy === "unmount" && !open ? null : children}
    </section>
  );
}
