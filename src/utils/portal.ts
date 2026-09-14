import {
  createElement,
  type ReactNode,
  useLayoutEffect,
  useReducer,
} from "react";
import {
  UNSAFE_PortalProvider,
  useUNSAFE_PortalContext,
} from "react-aria/PortalProvider";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";
import { createRequiredContext } from "./context.js";

// The UNSAFE portal API is upstream's explicit no-stability marker, so every
// internal consumer reaches it through this one module: an upstream rename or
// removal touches a single file.
//
// One more react-aria internal lives outside this module: the toast host sets
// the `data-react-aria-top-layer` attribute (Toast.tsx). react-aria's
// ariaHideOutside and FocusScope treat nodes carrying it as part of the top
// layer, so toasts stay visible, announced, and focusable while a modal is
// open. An upstream rename of that marker would surface in the toast tests
// that open a Dialog.

type PortalContainerResolver = () => HTMLElement | null;

const {
  Provider: PanelPortalOwnerProvider,
  useOptionalValue: useOptionalPortalOwner,
  useValue: usePortalOwner,
} = createRequiredContext<PortalContainerResolver>("PanelRoot");

interface PanelPortalProviderProps {
  readonly children: ReactNode;
  readonly getContainer: PortalContainerResolver;
}

/** Installs both React Aria's portal target and its private owning-root proof. */
export function PanelPortalProvider({
  children,
  getContainer,
}: PanelPortalProviderProps): React.JSX.Element {
  return createElement(
    PanelPortalOwnerProvider,
    { value: getContainer },
    createElement(UNSAFE_PortalProvider, { children, getContainer }),
  );
}

/**
 * Defers an overlay by one commit so it mounts against a resolved portal
 * container.
 *
 * PanelRoot's portal container reads its root element lazily, so it is null on
 * the very first render, before refs attach. An overlay that mounted in that
 * commit would mount react-aria's inner overlay before the container resolves,
 * permanently breaking its role and focus effects.
 */
function usePortalContainerReady(): boolean {
  // A reducer rather than useState: the lint rule against a synchronous
  // setState inside an effect does not fire on a dispatch, and this is a
  // one-way latch that has to flip in a layout effect, before paint.
  const [ready, resolve] = useReducer(() => true, false);
  useLayoutEffect(() => {
    resolve();
  }, []);
  return ready;
}

/**
 * Requires the in-panel portal host and defers mounting until its ref resolves.
 *
 * Overlays outside PanelRoot would otherwise fall back to document.body, where
 * the owning panel's scoped styles and theme tokens do not apply.
 */
export function usePanelPortalContainerReady(componentName: string): boolean {
  return usePanelPortalContainer(componentName) !== null;
}

/**
 * The owning PanelRoot when there is one, and null when there is not.
 *
 * The strict resolver below is for consumers that have to portal, so it treats
 * a missing panel root as a caller error. An in-flow component that only wants
 * to install its style module has no such requirement: outside PanelRoot there
 * is no root sheet to install beside, and the component renders unstyled just
 * as it always has. It resolves one commit late for the same reason the strict
 * resolver does, which is the commit PanelRoot's callback ref installed the
 * root sheet in.
 */
export function useOptionalPanelRoot(): HTMLElement | null {
  const ownerGetContainer = useOptionalPortalOwner();
  const ready = usePortalContainerReady();

  if (!ready || ownerGetContainer === null) return null;
  return ownerGetContainer();
}

/**
 * The one wording for a portal that did not resolve to its owning root, with
 * a second sentence naming which of the two ways it failed. The first sentence
 * is what a consumer acts on, so it stays the same for both.
 */
function portalContainerError(componentName: string, reason: string): Error {
  return new Error(
    `${componentName} portal container must be its owning PanelRoot. ${reason}.`,
  );
}

/**
 * Roots already proven to be this package's own versioned `PanelRoot`.
 *
 * The three attribute reads cannot change their answer for a given element,
 * and every component that portals or installs a style module asks on every
 * render, so a virtualized grid re-rendering on scroll would otherwise pay
 * them per frame.
 */
const VERSIONED_PANEL_ROOTS = new WeakSet<HTMLElement>();

function isVersionedPanelRoot(element: HTMLElement): boolean {
  if (VERSIONED_PANEL_ROOTS.has(element)) return true;
  const versioned =
    element.classList.contains(ROOT_CLASS) &&
    element.hasAttribute("data-snui-root") &&
    element.getAttribute("data-snui-version") === PACKAGE_VERSION;
  if (versioned) VERSIONED_PANEL_ROOTS.add(element);
  return versioned;
}

/** Resolves and verifies the exact PanelRoot that owns a portal consumer. */
export function usePanelPortalContainer(
  componentName: string,
): HTMLElement | null {
  const ownerGetContainer = usePortalOwner(componentName);
  const { getContainer } = useUNSAFE_PortalContext();
  const ready = usePortalContainerReady();

  if (getContainer == null) {
    throw portalContainerError(
      componentName,
      "No portal container is installed",
    );
  }

  if (!ready) return null;

  const owner = ownerGetContainer();
  if (owner === null) return null;

  const resolved = getContainer();
  if (resolved !== owner || !isVersionedPanelRoot(owner)) {
    throw portalContainerError(
      componentName,
      "The resolved container is another element",
    );
  }

  return owner;
}
