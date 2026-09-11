import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { hasAccessibleName, requireIdToken } from "../utils/aria.js";
import { composeRef } from "../utils/ref.js";
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
  const pendingFocus = useRef<boolean | null>(null);
  const panelHoldsFocus = useRef(false);

  const setOpen = useCallback(
    (next: boolean): void => {
      if (next === effectiveOpen) return;
      pendingFocus.current = next;
      commitOpen(next);
      // A controlling owner may decline the change, which commits nothing and
      // would leave the latch armed to steal focus at the owner's next open.
      // The commit this call causes lands before the microtask runs, so an
      // accepted change has already moved focus by the time the latch drops.
      queueMicrotask(() => {
        pendingFocus.current = null;
      });
    },
    [commitOpen, effectiveOpen],
  );

  const toggle = useCallback((): void => {
    setOpen(!effectiveOpen);
  }, [effectiveOpen, setOpen]);

  /*
   * Whether the panel holds focus, sampled as focus moves rather than read
   * when the panel closes. Hiding or unmounting the panel blurs what it held
   * first, so by the time any effect could look, the answer is already gone.
   */
  useEffect(() => {
    if (!effectiveOpen) return undefined;

    const panelNode = panelRef.current;
    const ownerDocument = panelNode?.ownerDocument;
    if (panelNode === null || ownerDocument === undefined) return undefined;

    panelHoldsFocus.current = panelNode.contains(ownerDocument.activeElement);
    const trackFocus = (event: FocusEvent): void => {
      panelHoldsFocus.current = event.composedPath().includes(panelNode);
    };
    ownerDocument.addEventListener("focusin", trackFocus);
    return () => {
      ownerDocument.removeEventListener("focusin", trackFocus);
    };
  }, [effectiveOpen]);

  // Focus moves in the commit phase so the latch is consumed before the
  // microtask above drops it. This layout effect also runs ahead of the
  // tracker's cleanup, so the sample above is still readable here.
  useLayoutEffect(() => {
    const pressed = pendingFocus.current === effectiveOpen;
    if (pressed) pendingFocus.current = null;
    if (effectiveOpen) {
      if (pressed) panelRef.current?.focus();
      return;
    }
    // The trigger takes focus back for a press, and for any other close that
    // would otherwise leave the reader on the body.
    const held = panelHoldsFocus.current;
    panelHoldsFocus.current = false;
    if (pressed || held) triggerRef.current?.focus();
  }, [effectiveOpen]);

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
  extends Omit<HTMLAttributes<HTMLElement>, "hidden" | "id" | "role">,
    RefAttributes<HTMLElement>,
    DisclosurePartProps {
  /**
   * Under `"unmount"` the children leave the tree while closed; the container
   * stays so `aria-controls` still resolves. `"retain"`, the default, keeps
   * them mounted and hidden, and their effects keep running.
   */
  readonly mountStrategy?: "retain" | "unmount" | undefined;
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
      ref={(node) => {
        setPanelNode(node);
        return composeRef(ref, node);
      }}
    >
      {mountStrategy === "unmount" && !open ? null : children}
    </section>
  );
}
