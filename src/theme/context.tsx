import {
  createContext,
  type ReactNode,
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

interface ThemeContextValue {
  readonly theme: ThemeChoice;
  readonly setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStorage(key: string): ThemeChoice | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(key);
    return isThemeChoice(value) ? value : null;
  } catch {
    return null;
  }
}

function readInitialTheme(legacyKeys: readonly string[]): ThemeChoice {
  const sharedTheme = readStorage(THEME_STORAGE_KEY);
  if (sharedTheme !== null) return sharedTheme;

  for (const key of legacyKeys) {
    const legacyTheme = readStorage(key);
    if (legacyTheme !== null) return legacyTheme;
  }

  return "auto";
}

function writeSharedTheme(theme: ThemeChoice): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function broadcastTheme(theme: ThemeChoice): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ThemeChoice>(THEME_CHANGE_EVENT, { detail: theme }),
  );
}

function isLocalStorageEvent(event: StorageEvent): boolean {
  if (event.storageArea === null) return true;

  try {
    return event.storageArea === window.localStorage;
  } catch {
    return false;
  }
}

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly legacyStorageKeys?: readonly string[];
}

export function ThemeProvider({
  children,
  legacyStorageKeys = [],
}: ThemeProviderProps): React.JSX.Element {
  const legacyStorageKeySignature = JSON.stringify(legacyStorageKeys);
  const stableLegacyKeys = useMemo(
    () => JSON.parse(legacyStorageKeySignature) as readonly string[],
    [legacyStorageKeySignature],
  );
  const [theme, setThemeState] = useState<ThemeChoice>(() =>
    readInitialTheme(stableLegacyKeys),
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncTheme = (event: Event): void => {
      if (event instanceof CustomEvent && isThemeChoice(event.detail)) {
        setThemeState(event.detail);
        return;
      }
      setThemeState(readStorage(THEME_STORAGE_KEY) ?? "auto");
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

  useEffect(() => {
    const sharedTheme = readStorage(THEME_STORAGE_KEY);
    const migratedTheme = sharedTheme ?? readInitialTheme(stableLegacyKeys);

    if (sharedTheme === null) writeSharedTheme(migratedTheme);
    broadcastTheme(migratedTheme);
  }, [stableLegacyKeys]);

  const setTheme = useCallback((nextTheme: ThemeChoice): void => {
    writeSharedTheme(nextTheme);
    setThemeState(nextTheme);
    broadcastTheme(nextTheme);
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
