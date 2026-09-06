import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { hasAccessibleName } from "../utils/aria.js";
import { Button, type ButtonAsButtonProps } from "./Button.js";

export interface UseDisclosureOptions {
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly open?: boolean | undefined;
}

export interface UseDisclosureResult {
  readonly open: boolean;
  readonly panelId: string;
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
  readonly triggerId: string;
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
 * `setOpen` moves focus into the panel, closing moves it back to the trigger,
 * so a keyboard user never lands on the body. A change made by the consumer
 * setting `open` directly moves no focus, because nothing was pressed.
 */
export function useDisclosure({
  defaultOpen = false,
  onOpenChange,
  open,
}: UseDisclosureOptions = {}): UseDisclosureResult {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const effectiveOpen = open ?? internalOpen;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef<boolean | null>(null);

  const setOpen = useCallback(
    (next: boolean): void => {
      if (next === effectiveOpen) return;
      pendingFocus.current = next;
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [effectiveOpen, onOpenChange, open],
  );

  const toggle = useCallback((): void => {
    setOpen(!effectiveOpen);
  }, [effectiveOpen, setOpen]);

  useEffect(() => {
    if (pendingFocus.current !== effectiveOpen) return;
    pendingFocus.current = null;
    if (effectiveOpen) panelRef.current?.focus();
    else triggerRef.current?.focus();
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
      panelId,
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
      triggerId,
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

function useDisclosureContext(component: string): DisclosureContextValue {
  const value = useContext(DisclosureContext);
  if (value === null) {
    throw new Error(`${component} must be rendered inside Disclosure.`);
  }
  return value;
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
>;

/** The library Button wired as the disclosure's toggle. */
export function DisclosureTrigger(
  props: DisclosureTriggerProps,
): React.JSX.Element {
  const { triggerProps } = useDisclosureContext("DisclosureTrigger");
  return <Button {...props} {...triggerProps} />;
}

export interface DisclosurePanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "hidden" | "id" | "role">,
    RefAttributes<HTMLElement> {
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
  mountStrategy = "retain",
  ref,
  ...props
}: DisclosurePanelProps): React.JSX.Element {
  const { open, panelProps } = useDisclosureContext("DisclosurePanel");
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
        if (typeof ref === "function") return ref(node);
        if (ref !== null && ref !== undefined) ref.current = node;
        return undefined;
      }}
    >
      {mountStrategy === "unmount" && !open ? null : children}
    </section>
  );
}
