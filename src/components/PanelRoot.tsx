import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useRef,
} from "react";
import { useComposedRef, useNodeRef } from "../hooks/use-node-ref.js";
import { installPanelStyles } from "../styles/install.js";
import { PANEL_STYLES } from "../styles/root-sheet.js";
import { ThemeProvider, usePanelTheme } from "../theme/context.js";
import type { ThemeChoice } from "../theme/contract.js";
import { classNames } from "../utils/class-names.js";
import { type PanelLocale, PanelLocaleProvider } from "../utils/locale.js";
import {
  type PanelLabels,
  PanelLabelsProvider,
} from "../utils/panel-labels.js";
import { PanelPortalProvider } from "../utils/portal.js";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";

export interface PanelRootProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  /** Panel content. Overlays inside it portal back into this root. */
  readonly children: ReactNode;
  /**
   * The theme to start at when the document has no stored preference. A
   * stored preference, and any panel already showing a theme, both win over
   * it. Default `"auto"`.
   */
  readonly defaultTheme?: ThemeChoice | undefined;
  /**
   * Replacements for the package's own English defaults, published to every
   * component in the panel. A component prop still wins over the bundle, and
   * anything the bundle leaves out keeps the package default.
   */
  readonly labels?: PanelLabels | undefined;
  /**
   * BCP 47 locale the panel formats its values in, read by the package's own
   * formatters and by a consumer through `usePanelLocale`. It names no
   * language for assistive technology: that is the host page's `lang`.
   * Default: the runtime's own locale.
   */
  readonly locale?: PanelLocale | undefined;
  /** `nonce` for the injected style element, for a host with a strict CSP. */
  readonly styleNonce?: string | undefined;
  /** Width the panel occupies inside its host card. Default `"full"`. */
  readonly width?: PanelWidth | undefined;
}

export type PanelWidth = "standard" | "wide" | "full";

function PanelSurface({
  children,
  className,
  labels,
  locale,
  ref,
  styleNonce,
  width = "full",
  ...props
}: Omit<PanelRootProps, "defaultTheme">): React.JSX.Element {
  const { theme } = usePanelTheme();
  const rootElement = useRef<HTMLDivElement | null>(null);

  // Installed from the callback ref that owns the node, so the panel styles
  // are installed and removed exactly once per mount.
  const installStyles = useCallback(
    (node: HTMLDivElement) =>
      installPanelStyles(
        node.ownerDocument,
        PACKAGE_VERSION,
        PANEL_STYLES,
        styleNonce,
      ),
    [styleNonce],
  );
  const setRootRef = useNodeRef(rootElement, undefined, installStyles);

  // The caller ref is composed separately, in a layout effect, keeping the
  // commit-phase timing the imperative handle provided, so swapping the ref
  // does not reinstall the style element.
  useComposedRef(rootElement, ref);

  // Overlay components (Dialog, Menu, Toast) portal into the panel root so
  // scoped styles and the selected theme reach them. The container reads the
  // root element lazily because overlays open after the commit that sets it.
  const getPortalContainer = useCallback(() => rootElement.current, []);

  return (
    <div
      {...props}
      ref={setRootRef}
      className={classNames(ROOT_CLASS, `snui-root--${width}`, className)}
      data-snui-root=""
      data-snui-version={PACKAGE_VERSION}
      data-snui-theme={theme === "auto" ? undefined : theme}
    >
      <PanelLocaleProvider value={locale}>
        <PanelLabelsProvider value={labels}>
          <PanelPortalProvider getContainer={getPortalContainer}>
            <div className="snui-root__content">{children}</div>
          </PanelPortalProvider>
        </PanelLabelsProvider>
      </PanelLocaleProvider>
    </div>
  );
}

export function PanelRoot({
  defaultTheme,
  ...props
}: PanelRootProps): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <PanelSurface {...props} />
    </ThemeProvider>
  );
}
