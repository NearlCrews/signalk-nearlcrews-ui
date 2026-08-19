import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useReducer,
} from "react";
import {
  UNSAFE_PortalProvider,
  useUNSAFE_PortalContext,
} from "react-aria/PortalProvider";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";

// The UNSAFE portal API is upstream's explicit no-stability marker, so every
// internal consumer reaches it through this one module: an upstream rename or
// removal touches a single file.

type PortalContainerResolver = () => HTMLElement | null;

const PanelPortalOwnerContext = createContext<PortalContainerResolver | null>(
  null,
);

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
    PanelPortalOwnerContext.Provider,
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

/** Resolves and verifies the exact PanelRoot that owns a portal consumer. */
export function usePanelPortalContainer(
  componentName: string,
): HTMLElement | null {
  const ownerGetContainer = useContext(PanelPortalOwnerContext);
  const { getContainer } = useUNSAFE_PortalContext();
  const ready = usePortalContainerReady();

  if (ownerGetContainer === null) {
    throw new Error(`${componentName} must be rendered inside PanelRoot.`);
  }

  if (getContainer == null) {
    throw new Error(
      `${componentName} portal container must be its owning PanelRoot.`,
    );
  }

  if (!ready) return null;

  const owner = ownerGetContainer();
  if (owner === null) return null;

  const resolved = getContainer();
  const isVersionedPanelRoot =
    owner.classList.contains(ROOT_CLASS) &&
    owner.hasAttribute("data-snui-root") &&
    owner.getAttribute("data-snui-version") === PACKAGE_VERSION;
  if (resolved !== owner || !isVersionedPanelRoot) {
    throw new Error(
      `${componentName} portal container must be its owning PanelRoot.`,
    );
  }

  return owner;
}
