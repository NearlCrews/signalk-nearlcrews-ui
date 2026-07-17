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
const VOLATILE_THEME_KEY = Symbol.for(THEME_CHANGE_EVENT);

type StoredTheme = ThemeChoice | null | undefined;
type VolatileTheme = ThemeChoice | readonly [ThemeChoice] | null;

interface ThemeContextValue {
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

function readVolatileTheme(): VolatileTheme {
  if (typeof window === "undefined") return null;

  const value = (window as unknown as Record<symbol, unknown>)[
    VOLATILE_THEME_KEY
  ];
  const theme: unknown = Array.isArray(value)
    ? (value as readonly unknown[])[0]
    : value;
  return isThemeChoice(theme) ? (value as Exclude<VolatileTheme, null>) : null;
}

function writeVolatileTheme(theme: ThemeChoice | null, fallback = false): void {
  (window as unknown as Record<symbol, unknown>)[VOLATILE_THEME_KEY] = fallback
    ? [theme]
    : theme;
}

function resolveTheme(legacyKeys: readonly string[]): StoredTheme {
  const sharedTheme = readStorage(THEME_STORAGE_KEY);
  const volatileTheme = readVolatileTheme();
  if (volatileTheme !== null && typeof volatileTheme !== "string") {
    return volatileTheme[0];
  }

  if (sharedTheme) {
    return sharedTheme;
  }

  if (sharedTheme === undefined && isThemeChoice(volatileTheme)) {
    return volatileTheme;
  }

  for (const key of legacyKeys) {
    const legacyTheme = readStorage(key);
    if (legacyTheme) {
      return legacyTheme;
    }
  }

  return sharedTheme;
}

function writeSharedTheme(theme: ThemeChoice): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
    return false;
  }
}

function broadcastTheme(theme: ThemeChoice): void {
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
  const [theme, setThemeState] = useState<ThemeChoice>(
    () => resolveTheme(stableLegacyKeys) ?? "light",
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

      if (sharedTheme === null) {
        writeVolatileTheme(null);
        setThemeState("light");
        return;
      }

      writeVolatileTheme(sharedTheme);
      setThemeState(sharedTheme);
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
    const nextTheme = resolveTheme(stableLegacyKeys);

    if (!nextTheme) {
      writeVolatileTheme(null);
      return;
    }

    const sharedTheme = readStorage(THEME_STORAGE_KEY);
    if (sharedTheme === nextTheme) {
      writeVolatileTheme(nextTheme);
    } else if (sharedTheme === null) {
      writeVolatileTheme(nextTheme, !writeSharedTheme(nextTheme));
    }
    broadcastTheme(nextTheme);
  }, [stableLegacyKeys]);

  const setTheme = useCallback((nextTheme: ThemeChoice): void => {
    writeVolatileTheme(nextTheme, !writeSharedTheme(nextTheme));
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
