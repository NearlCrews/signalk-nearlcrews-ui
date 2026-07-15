import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { PANEL_STYLES } from "../styles/index.js";
import { installPanelStyles } from "../styles/install.js";
import { ThemeProvider, usePanelTheme } from "../theme/context.js";
import { classNames } from "../utils/class-names.js";
import { PACKAGE_VERSION, ROOT_CLASS } from "../version.js";

export interface PanelRootProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly legacyThemeStorageKeys?: readonly string[];
  readonly styleNonce?: string;
}

const EMPTY_LEGACY_STORAGE_KEYS: readonly string[] = [];

type PanelSurfaceProps = Omit<PanelRootProps, "legacyThemeStorageKeys">;

const PanelSurface = forwardRef<HTMLDivElement, PanelSurfaceProps>(
  function PanelSurface({ children, className, styleNonce, ...props }, ref) {
    const { theme } = usePanelTheme();
    const rootElement = useRef<HTMLDivElement | null>(null);

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

    useImperativeHandle(ref, () => {
      if (rootElement.current === null) {
        throw new Error("PanelRoot could not resolve its root element.");
      }
      return rootElement.current;
    }, []);

    return (
      <div
        {...props}
        ref={setRootRef}
        className={classNames(ROOT_CLASS, className)}
        data-snui-root=""
        data-snui-version={PACKAGE_VERSION}
        data-snui-theme={theme === "auto" ? undefined : theme}
      >
        {children}
      </div>
    );
  },
);

export const PanelRoot = forwardRef<HTMLDivElement, PanelRootProps>(
  function PanelRoot(
    { legacyThemeStorageKeys = EMPTY_LEGACY_STORAGE_KEYS, ...surfaceProps },
    ref,
  ) {
    return (
      <ThemeProvider legacyStorageKeys={legacyThemeStorageKeys}>
        <PanelSurface {...surfaceProps} ref={ref} />
      </ThemeProvider>
    );
  },
);
