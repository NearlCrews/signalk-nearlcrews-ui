import { createElement, type ReactNode, useLayoutEffect } from "react";
import {
  UNSAFE_PortalProvider,
  useUNSAFE_PortalContext,
} from "react-aria/PortalProvider";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";
import { createRequiredContext } from "./context.js";
import { packageError } from "./errors.js";
import { useLatch } from "./latch.js";

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
  useOptionalValue: useOptionalPanelRootResolver,
  useValue: usePortalOwner,
} = createRequiredContext<PortalContainerResolver>("PanelRoot");

// An in-flow component that only installs a style module reads the owning
// root's resolver, or null outside PanelRoot, where there is no root sheet to
// install beside and the component renders unstyled as it always has.
export { useOptionalPanelRootResolver };

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
  // Has to flip in a layout effect, before paint.
  const [ready, resolve] = useLatch(false);
  useLayoutEffect(() => {
    resolve();
  }, [resolve]);
  return ready;
}

/**
 * The one wording for a portal that did not resolve to its owning root, with
 * a second sentence naming which of the two ways it failed. The first sentence
 * is what a consumer acts on, so it stays the same for both.
 */
function portalContainerError(componentName: string, reason: string): Error {
  return packageError(
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
