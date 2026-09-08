import { createDocumentRegistry } from "../utils/document-registry.js";

/**
 * One installable stylesheet. The root module ships with `PanelRoot`; overlay
 * and table modules are installed by the components that need them, so a panel
 * that renders no dialog carries no dialog CSS.
 */
export interface StyleModule {
  /** Stable identifier: one style element per document, version, nonce, and id. */
  readonly id: string;
  readonly styles: string;
}

interface InstalledStyle {
  readonly moduleId: string;
  readonly nonce: string | undefined;
  readonly styles: string;
  readonly version: string;
}

export class UnsupportedBrowserError extends Error {
  readonly feature = "CSS @scope";

  constructor() {
    super(
      "signalk-nearlcrews-ui requires a browser with native CSS @scope support.",
    );
    this.name = "UnsupportedBrowserError";
  }
}

/** The module `PanelRoot` installs. Every other module inherits its nonce. */
export const ROOT_STYLE_MODULE_ID = "root";

// The record shape changed with module ids, so the key moved to v2: a 0.8.x
// copy in the same document keeps its own v1 map and neither reads the other.
const styleRegistry = createDocumentRegistry<string, InstalledStyle>(
  "signalk-nearlcrews-ui.style-registry.v2",
);

export function supportsNativeCssScope(
  ownerWindow: Window | null | undefined = typeof window === "undefined"
    ? undefined
    : window,
): boolean {
  return (
    ownerWindow !== null &&
    ownerWindow !== undefined &&
    typeof Reflect.get(ownerWindow, "CSSScopeRule") === "function"
  );
}

function assertNativeScopeSupport(ownerDocument: Document): void {
  const ownerWindow = ownerDocument.defaultView;
  if (ownerWindow === null) return;

  if (!supportsNativeCssScope(ownerWindow)) throw new UnsupportedBrowserError();
}

/**
 * Where a sheet goes in the head. Module sheets follow the root sheet of their
 * version, and a root sheet the host removed comes back ahead of any module
 * sheet already present, so the cascade order (root, then modules) survives.
 */
function attachStyleElement(
  ownerDocument: Document,
  element: HTMLStyleElement,
  version: string,
  moduleId: string,
): void {
  const firstModuleSheet =
    moduleId === ROOT_STYLE_MODULE_ID
      ? ownerDocument.head.querySelector(
          `style[data-snui-module-styles="${version}"]`,
        )
      : null;
  if (firstModuleSheet === null) {
    ownerDocument.head.append(element);
  } else {
    firstModuleSheet.before(element);
  }
}

/**
 * Installs one style module for one package version and CSP nonce in the
 * document, reference-counted and idempotent. Two copies of the same module
 * that disagree about its CSS while claiming the same version are rejected, so
 * a stale bundle cannot silently restyle a newer one.
 */
export function installStyleModule(
  ownerDocument: Document,
  version: string,
  module: StyleModule,
  nonce: string | undefined,
): () => void {
  assertNativeScopeSupport(ownerDocument);

  for (const candidate of styleRegistry.values(ownerDocument)) {
    if (
      candidate.moduleId === module.id &&
      candidate.version === version &&
      candidate.styles !== module.styles
    ) {
      throw new Error(
        `Conflicting signalk-nearlcrews-ui styles were loaded for version ${version}, module "${module.id}".`,
      );
    }
  }

  const key = [module.id, version, nonce ?? ""].join("\u0000");
  styleRegistry.acquire(ownerDocument, key, () => {
    const element = ownerDocument.createElement("style");
    if (module.id === ROOT_STYLE_MODULE_ID) {
      element.dataset.snuiStyles = version;
    } else {
      element.dataset.snuiModuleStyles = version;
      element.dataset.snuiStyleModule = module.id;
    }
    if (nonce !== undefined) element.nonce = nonce;
    element.textContent = module.styles;

    return {
      attach: () =>
        attachStyleElement(ownerDocument, element, version, module.id),
      dispose: () => element.remove(),
      element,
      value: {
        moduleId: module.id,
        nonce,
        styles: module.styles,
        version,
      },
    };
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    styleRegistry.release(ownerDocument, key);
  };
}

/** Installs the root sheet; the entry point `PanelRoot` uses. */
export function installPanelStyles(
  ownerDocument: Document,
  version: string,
  styles: string,
  nonce: string | undefined,
): () => void {
  return installStyleModule(
    ownerDocument,
    version,
    { id: ROOT_STYLE_MODULE_ID, styles },
    nonce,
  );
}

/**
 * The nonces under which the root sheet for `version` is installed in the
 * document. Module sheets install under the same nonces so a nonce-restricted
 * host authorizes them exactly as it authorized the root sheet.
 */
export function installedRootStyleNonces(
  ownerDocument: Document,
  version: string,
): readonly (string | undefined)[] {
  const nonces = new Set<string | undefined>();
  for (const installed of styleRegistry.values(ownerDocument)) {
    if (
      installed.moduleId === ROOT_STYLE_MODULE_ID &&
      installed.version === version
    ) {
      nonces.add(installed.nonce);
    }
  }
  return [...nonces];
}
