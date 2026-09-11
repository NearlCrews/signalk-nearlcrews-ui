import { useLayoutEffect } from "react";
import {
  useOptionalPanelRoot,
  usePanelPortalContainer,
} from "../utils/portal.js";
import { PACKAGE_VERSION } from "../version.js";
import {
  installedRootStyleNonces,
  installStyleModule,
  type StyleModule,
} from "./install.js";

/**
 * Installs a style module beside the owning `PanelRoot`'s sheet: same
 * document, same package version, same CSP nonce. The install is
 * reference-counted and idempotent per document, version, nonce, and module id,
 * so any number of dialogs in any number of panels share one element, removed
 * when the last of them unmounts.
 *
 * The owning root resolves one commit after the first render, which is also
 * the commit after `PanelRoot` installed the root sheet, so the module's nonce
 * is always known by the time the layout effect runs. Layout timing keeps a
 * later-mounted overlay styled before its first paint.
 *
 * `componentName` appears in the error thrown outside `PanelRoot`.
 */
export function useModuleStyles(
  module: StyleModule,
  componentName = "useModuleStyles",
): void {
  const panelRoot = usePanelPortalContainer(componentName);

  useLayoutEffect(() => {
    if (panelRoot === null) return undefined;
    return installModuleStylesForRoot(panelRoot.ownerDocument, module);
  }, [module, panelRoot]);
}

/**
 * Installs a style module the same way {@link useModuleStyles} does, for a
 * component that renders in flow rather than portaling into the panel root.
 *
 * The difference is what happens outside `PanelRoot`. An overlay has nowhere
 * to portal to and throws; an in-flow control has always rendered there
 * unstyled, exactly as it did while its rules traveled in the root sheet, so
 * this hook installs nothing and stays silent.
 */
export function useOptionalModuleStyles(module: StyleModule): void {
  const panelRoot = useOptionalPanelRoot();

  useLayoutEffect(() => {
    if (panelRoot === null) return undefined;
    return installModuleStylesForRoot(panelRoot.ownerDocument, module);
  }, [module, panelRoot]);
}

function installModuleStylesForRoot(
  ownerDocument: Document,
  module: StyleModule,
): () => void {
  const nonces = installedRootStyleNonces(ownerDocument, PACKAGE_VERSION);
  // Unreachable through the public API, and deliberately kept. PanelRoot
  // installs the root sheet in its callback ref, which runs before every
  // layout effect, and releases it only when that ref detaches at unmount,
  // while this effect runs only once the owning root has resolved. The guard
  // survives for a consumer reaching past the package, and for the day one of
  // those orderings changes.
  if (nonces.length === 0) {
    throw new Error(
      `signalk-nearlcrews-ui ${PACKAGE_VERSION} panel styles are not installed in this document; render inside PanelRoot.`,
    );
  }

  const removers = nonces.map((nonce) =>
    installStyleModule(ownerDocument, PACKAGE_VERSION, module, nonce),
  );
  return () => {
    for (const remove of removers) remove();
  };
}
