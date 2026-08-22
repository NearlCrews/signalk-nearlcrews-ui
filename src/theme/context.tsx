import {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
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
    // An absent key is a genuine clear, so the panel returns to "auto". A
    // present but unrecognized value comes from a different library version
    // sharing the key and is ignored: resetting to "auto" here would fight
    // the theme the other panel just wrote.
    if (value === null) return null;
    return isThemeChoice(value) ? value : undefined;
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
  // An unresolved preference stays "auto" so the panel follows an explicit
  // host theme and otherwise uses the library's light fallback. Operating-system
  // preferences are reserved for the explicit "system" choice.
  const [theme, setThemeState] = useState<ThemeChoice>(
    () => readStorage(THEME_STORAGE_KEY) ?? "auto",
  );

  // The state initializer above runs once per mount, while the effect below
  // also runs again when React reveals a retained subtree. Adopting the stored
  // theme as the subscription opens picks up a choice another panel wrote while
  // this one was hidden, which the initializer alone misses because the hidden
  // panel kept its state and had no listener for the whole hidden period.
  const adoptSharedTheme = useEffectEvent((): void => {
    const sharedTheme = readStorage(THEME_STORAGE_KEY);
    if (sharedTheme === undefined) return;

    setThemeState(sharedTheme ?? "auto");
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncTheme = (event: Event): void => {
      if (event instanceof CustomEvent && isThemeChoice(event.detail)) {
        setThemeState(event.detail);
        return;
      }

      adoptSharedTheme();
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
    // Reading the shared value as the subscription opens is what this effect is
    // for, not state derived from a render: no event reports a theme written
    // while the panel was hidden, and an unchanged value bails out before it
    // reaches a render at all.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    adoptSharedTheme();

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
