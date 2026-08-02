import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { PANEL_STYLES } from "../styles/index.js";
import { installPanelStyles } from "../styles/install.js";
import { ThemeProvider, usePanelTheme } from "../theme/context.js";
import { classNames } from "../utils/class-names.js";
import { UNSAFE_PortalProvider } from "../utils/portal.js";
import { composeRef } from "../utils/ref.js";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";

export interface PanelRootProps
  extends HTMLAttributes<HTMLDivElement>,
    RefAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly styleNonce?: string | undefined;
  readonly width?: PanelWidth | undefined;
}

export type PanelWidth = "standard" | "wide" | "full";

function PanelSurface({
  children,
  className,
  ref,
  styleNonce,
  width = "full",
  ...props
}: PanelRootProps): React.JSX.Element {
  const { theme } = usePanelTheme();
  const rootElement = useRef<HTMLDivElement | null>(null);

  // One callback ref owns the node so the panel styles are installed and
  // removed exactly once per mount.
  const setRootRef = useCallback(
    (node: HTMLDivElement | null): (() => void) | undefined => {
      if (node === null) return undefined;

      rootElement.current = node;
      const removeStyles = installPanelStyles(
        node.ownerDocument,
        PACKAGE_VERSION,
        PANEL_STYLES,
        styleNonce,
      );

      return () => {
        removeStyles();
        rootElement.current = null;
      };
    },
    [styleNonce],
  );

  // The caller ref composes through composeRef in a layout effect, keeping the
  // commit-phase timing the imperative handle provided, so swapping the ref
  // does not reinstall the style element.
  useLayoutEffect(() => {
    const node = rootElement.current;
    if (node === null) return undefined;

    return composeRef(ref, node);
  }, [ref]);

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
      <UNSAFE_PortalProvider getContainer={getPortalContainer}>
        <div className="snui-root__content">{children}</div>
      </UNSAFE_PortalProvider>
    </div>
  );
}

export function PanelRoot(props: PanelRootProps): React.JSX.Element {
  return (
    <ThemeProvider>
      <PanelSurface {...props} />
    </ThemeProvider>
  );
}
