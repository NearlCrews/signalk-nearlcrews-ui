import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
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

/**
 * Runs one storage operation and reports failure as `undefined`. Private
 * browsing, a locked-down WebView, and a sandboxed frame can all throw on any
 * access to localStorage, and none of them should break the panel: the theme
 * simply stops being shared.
 */
function withStorage<T>(operation: (storage: Storage) => T): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return operation(window.localStorage);
  } catch {
    return undefined;
  }
}

function readStorage(key: string): StoredTheme {
  const value = withStorage((storage) => storage.getItem(key));
  // An absent key is a genuine clear, so the panel returns to "auto". A
  // present but unrecognized value comes from a different library version
  // sharing the key and is ignored: resetting to "auto" here would fight the
  // theme the other panel just wrote. Unreadable storage is also ignored.
  if (value === null) return null;
  return isThemeChoice(value) ? value : undefined;
}

function writeSharedTheme(theme: ThemeChoice): void {
  withStorage((storage) => {
    storage.setItem(THEME_STORAGE_KEY, theme);
  });
}

function isLocalStorageEvent(event: StorageEvent): boolean {
  if (event.storageArea === null) return true;
  return withStorage((storage) => storage === event.storageArea) === true;
}

/**
 * One store per loaded copy of the library. The theme is a document-wide
 * preference behind one storage key, so every provider in this copy reads the
 * same snapshot, and other copies stay in step through the storage event and
 * the same-document change event below.
 */
const listeners = new Set<() => void>();
let currentTheme: ThemeChoice = "auto";

function emit(): void {
  for (const listener of listeners) listener();
}

function updateTheme(next: ThemeChoice): void {
  if (next === currentTheme) return;
  currentTheme = next;
  emit();
}

/** Adopts the shared value when it is readable and recognized. */
function adoptSharedTheme(): void {
  const shared = readStorage(THEME_STORAGE_KEY);
  if (shared === undefined) return;
  updateTheme(shared ?? "auto");
}

function handleThemeChange(event: Event): void {
  if (event instanceof CustomEvent && isThemeChoice(event.detail)) {
    updateTheme(event.detail);
    return;
  }
  adoptSharedTheme();
}

function handleStorage(event: StorageEvent): void {
  if (
    (event.key === THEME_STORAGE_KEY || event.key === null) &&
    isLocalStorageEvent(event)
  ) {
    handleThemeChange(event);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }
  // A panel that subscribes after a hidden period, inside a retained
  // CollapsibleSection for example, missed every event in between. React
  // compares snapshots right after subscribing, so adopting the shared value
  // here re-renders it with the theme another panel wrote meanwhile.
  adoptSharedTheme();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    }
  };
}

function getSnapshot(): ThemeChoice {
  // With no subscriber the store hears no events, so a first render reads the
  // shared value directly instead of trusting a snapshot from an earlier mount.
  // Unreadable or unrecognized storage starts at "auto" here, exactly as a
  // fresh panel always has; only a live panel keeps its theme through those.
  if (listeners.size === 0) {
    currentTheme = readStorage(THEME_STORAGE_KEY) ?? "auto";
  }
  return currentTheme;
}

function getServerSnapshot(): ThemeChoice {
  return "auto";
}

function setTheme(nextTheme: ThemeChoice): void {
  writeSharedTheme(nextTheme);
  updateTheme(nextTheme);
  // Other copies of the library in the same document cannot see this copy's
  // store, and the storage event never fires in the document that wrote the
  // value, so they learn the choice from this event. This copy's own listener
  // receives it too and finds nothing to change.
  window.dispatchEvent(
    new CustomEvent<ThemeChoice>(THEME_CHANGE_EVENT, { detail: nextTheme }),
  );
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
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function usePanelTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error(
      "usePanelTheme must be called inside PanelRoot, which provides the theme context.",
    );
  }
  return value;
}
