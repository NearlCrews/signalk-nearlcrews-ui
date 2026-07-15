interface InstalledStyle {
  readonly element: HTMLStyleElement;
  readonly styles: string;
  readonly version: string;
  references: number;
}

type StyleRegistry = Map<string, InstalledStyle>;

export class UnsupportedBrowserError extends Error {
  readonly feature = "CSS @scope";

  constructor() {
    super(
      "signalk-nearlcrews-ui requires a browser with native CSS @scope support.",
    );
    this.name = "UnsupportedBrowserError";
  }
}

const STYLE_REGISTRY_KEY = Symbol.for(
  "signalk-nearlcrews-ui.style-registry.v1",
);

function getStyleRegistry(ownerDocument: Document): StyleRegistry {
  const existing = Reflect.get(ownerDocument, STYLE_REGISTRY_KEY) as
    | StyleRegistry
    | undefined;
  if (existing !== undefined) return existing;

  const registry: StyleRegistry = new Map();
  Reflect.defineProperty(ownerDocument, STYLE_REGISTRY_KEY, {
    configurable: true,
    value: registry,
  });
  return registry;
}

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

export function installPanelStyles(
  ownerDocument: Document,
  version: string,
  styles: string,
  nonce: string | undefined,
): () => void {
  assertNativeScopeSupport(ownerDocument);
  const documentStyles = getStyleRegistry(ownerDocument);

  for (const candidate of documentStyles.values()) {
    if (candidate.version === version && candidate.styles !== styles) {
      throw new Error(
        `Conflicting signalk-nearlcrews-ui styles were loaded for version ${version}.`,
      );
    }
  }

  const key = `${version}\u0000${nonce ?? ""}`;
  let installed = documentStyles.get(key);

  if (installed === undefined) {
    const element = ownerDocument.createElement("style");
    element.dataset.snuiStyles = version;
    if (nonce !== undefined) element.nonce = nonce;
    element.textContent = styles;
    ownerDocument.head.append(element);

    installed = { element, references: 0, styles, version };
    documentStyles.set(key, installed);
  } else if (installed.styles !== styles) {
    throw new Error(
      `Conflicting signalk-nearlcrews-ui styles were loaded for version ${version}.`,
    );
  } else if (!installed.element.isConnected) {
    ownerDocument.head.append(installed.element);
  }

  installed.references += 1;

  return () => {
    const current = documentStyles.get(key);
    if (current === undefined) return;

    current.references -= 1;
    if (current.references > 0) return;

    current.element.remove();
    documentStyles.delete(key);
    if (documentStyles.size === 0) {
      Reflect.deleteProperty(ownerDocument, STYLE_REGISTRY_KEY);
    }
  };
}
