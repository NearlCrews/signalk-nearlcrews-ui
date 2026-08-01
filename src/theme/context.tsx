import {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isThemeChoice,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./contract.js";

const THEME_CHANGE_EVENT = "signalk-nearlcrews-ui-theme-change";

type StoredTheme = ThemeChoice | null | undefined;

export interface ThemeContextValue {
  readonly theme: ThemeChoice;
  readonly setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStorage(key: string): StoredTheme {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(key);
    return isThemeChoice(value) ? value : null;
  } catch {
    return undefined;
  }
}

function writeSharedTheme(theme: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function isLocalStorageEvent(event: StorageEvent): boolean {
  if (event.storageArea === null) return true;

  try {
    return event.storageArea === window.localStorage;
  } catch {
    return false;
  }
}

export interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider({
  children,
}: ThemeProviderProps): React.JSX.Element {
  // An unresolved preference stays "auto" so the panel follows the host and the
  // operating system. Writing "light" would pin data-snui-theme and disable
  // every host-following rule, which are all written as :not([data-snui-theme]).
  const [theme, setThemeState] = useState<ThemeChoice>(
    () => readStorage(THEME_STORAGE_KEY) ?? "auto",
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncTheme = (event: Event): void => {
      if (event instanceof CustomEvent && isThemeChoice(event.detail)) {
        setThemeState(event.detail);
        return;
      }

      const sharedTheme = readStorage(THEME_STORAGE_KEY);
      if (sharedTheme === undefined) return;

      setThemeState(sharedTheme ?? "auto");
    };
    const handleStorage = (event: StorageEvent): void => {
      if (
        (event.key === THEME_STORAGE_KEY || event.key === null) &&
        isLocalStorageEvent(event)
      ) {
        syncTheme(event);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);

  const setTheme = useCallback((nextTheme: ThemeChoice): void => {
    writeSharedTheme(nextTheme);
    startTransition(() => {
      setThemeState(nextTheme);
    });
    window.dispatchEvent(
      new CustomEvent<ThemeChoice>(THEME_CHANGE_EVENT, { detail: nextTheme }),
    );
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function usePanelTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("ThemeToggle must be rendered inside PanelRoot.");
  }
  return value;
}
